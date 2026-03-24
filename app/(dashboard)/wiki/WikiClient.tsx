"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code2,
  Columns2,
  Eye,
  FilePlus2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import MarkdownPreview from "@/components/wiki/MarkdownPreview";
import {
  getSelectedBlockId,
  renderMarkdownToHtml,
  serializeWikiDocumentToMarkdown,
  WikiBlockIdExtension,
} from "@/lib/wiki/editor";
import { stripLeadingTitleHeading, type WikiDocument, type WikiPageDto } from "@/lib/wiki/shared";

type ProjectOption = { _id: string; name: string; role: "MASTER" | "MEMBER" };
type ViewMode = "split" | "edit" | "preview";

type DraftRef = {
  title: string;
  content: string;
  document: WikiDocument;
};

type SavedRef = {
  pageId: string | null;
  title: string;
  content: string;
  document: WikiDocument;
};

type LinkSelection = {
  from: number;
  to: number;
};

function isWikiDocument(value: unknown): value is JSONContent {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function buildFlatPageOptions(pages: WikiPageDto[]) {
  const childrenByParent = new Map<string | null, WikiPageDto[]>();

  pages.forEach((page) => {
    childrenByParent.set(page.parentId, [...(childrenByParent.get(page.parentId) || []), page]);
  });

  const options: Array<{ id: string; label: string }> = [];

  function visit(parentId: string | null, depth: number) {
    const children = childrenByParent.get(parentId) || [];

    children.forEach((page) => {
      const prefix = depth === 0 ? "" : `${"  ".repeat(depth)}- `;
      options.push({ id: page._id, label: `${prefix}${page.title}` });
      visit(page._id, depth + 1);
    });
  }

  visit(null, 0);
  return options;
}

function collectDescendantIds(pages: WikiPageDto[], rootPageId: string) {
  const ids = new Set<string>([rootPageId]);
  const queue = [rootPageId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    pages.forEach((page) => {
      if (page.parentId !== currentId || ids.has(page._id)) return;
      ids.add(page._id);
      queue.push(page._id);
    });
  }

  return ids;
}

function readImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || 1280,
        height: image.naturalHeight || 720,
      });
    };

    image.onerror = () => {
      resolve({ width: 1280, height: 720 });
    };

    image.src = src;
  });
}

function escapeAttributeSelector(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeLinkValue(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (
    trimmedValue.startsWith("/") ||
    trimmedValue.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmedValue)
  ) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

export default function WikiClient() {
  const router = useRouter();
  const pathname = usePathname() || "/wiki";
  const searchParams = useSearchParams();

  const requestedProjectId = searchParams?.get("projectId") || "";
  const requestedPageId = searchParams?.get("pageId") || "";

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pages, setPages] = useState<WikiPageDto[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const [previewDocument, setPreviewDocument] = useState<WikiDocument>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerParentId, setComposerParentId] = useState<string | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");

  const activePage = pages.find((page) => page._id === requestedPageId) || null;
  const selectedProject = projects.find((project) => project._id === requestedProjectId) || null;
  const pageOptions = buildFlatPageOptions(pages);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const previewRefreshTimeoutRef = useRef<number | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const scrollSyncReleaseRef = useRef<number | null>(null);
  const scrollSyncSourceRef = useRef<"editor" | "preview" | null>(null);
  const selectedBlockIdRef = useRef<string | null>(null);
  const hydratingEditorRef = useRef(false);
  const draftTitleRef = useRef("");
  const requestedProjectIdRef = useRef("");
  const viewModeRef = useRef<ViewMode>("split");
  const linkSelectionRef = useRef<LinkSelection | null>(null);
  const latestDraftRef = useRef<DraftRef>({ title: "", content: "", document: null });
  const lastSavedRef = useRef<SavedRef>({ pageId: null, title: "", content: "", document: null });
  const saveRequestIdRef = useRef(0);

  function syncUrl(projectId: string | null, pageId: string | null, replace = false) {
    const params = new URLSearchParams(searchParams?.toString() || "");

    if (projectId) params.set("projectId", projectId);
    else params.delete("projectId");

    if (pageId) params.set("pageId", pageId);
    else params.delete("pageId");

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    if (replace) {
      router.replace(nextUrl, { scroll: false });
      return;
    }

    router.push(nextUrl, { scroll: false });
  }

  function setNoticeMessage(message: string) {
    setNotice(message);

    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }

    noticeTimeoutRef.current = window.setTimeout(() => {
      setNotice("");
    }, 2600);
  }

  function releaseScrollSync() {
    if (scrollSyncReleaseRef.current) {
      window.clearTimeout(scrollSyncReleaseRef.current);
    }

    scrollSyncReleaseRef.current = window.setTimeout(() => {
      scrollSyncSourceRef.current = null;
    }, 48);
  }

  function syncScrollPosition(source: HTMLDivElement | null, target: HTMLDivElement | null, sourceKey: "editor" | "preview") {
    if (!source || !target) return;

    if (scrollSyncSourceRef.current && scrollSyncSourceRef.current !== sourceKey) {
      return;
    }

    const sourceScrollable = source.scrollHeight - source.clientHeight;
    const targetScrollable = target.scrollHeight - target.clientHeight;
    const ratio = sourceScrollable > 0 ? source.scrollTop / sourceScrollable : 0;

    scrollSyncSourceRef.current = sourceKey;
    target.scrollTop = targetScrollable > 0 ? ratio * targetScrollable : 0;
    releaseScrollSync();
  }

  function scrollPreviewToBlock(blockId: string | null, behavior: ScrollBehavior = "auto") {
    if (!blockId || !previewScrollRef.current) return;

    const selector = `[data-block-id="${escapeAttributeSelector(blockId)}"]`;
    const previewBlock = previewScrollRef.current.querySelector(selector) as HTMLElement | null;

    if (!previewBlock) return;

    const container = previewScrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const blockRect = previewBlock.getBoundingClientRect();
    const nextTop = container.scrollTop + (blockRect.top - containerRect.top) - container.clientHeight * 0.22;

    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior,
    });
  }

  function captureEditorSnapshot() {
    if (!editor) return null;

    const document = editor.getJSON() as JSONContent;
    const markdown = serializeWikiDocumentToMarkdown(document);
    const blockId = getSelectedBlockId(editor);

    latestDraftRef.current = {
      title: draftTitleRef.current.trim(),
      content: markdown,
      document,
    };

    return { document, markdown, blockId };
  }

  function commitEditorSnapshot(snapshot: { document: JSONContent; markdown: string; blockId: string | null } | null) {
    if (!snapshot) return null;

    setDraftMarkdown(snapshot.markdown);
    setPreviewDocument(snapshot.document);

    if (selectedBlockIdRef.current !== snapshot.blockId) {
      selectedBlockIdRef.current = snapshot.blockId;
      setSelectedBlockId(snapshot.blockId);
    }

    return snapshot;
  }

  function flushPreviewSnapshot() {
    if (previewRefreshTimeoutRef.current) {
      window.clearTimeout(previewRefreshTimeoutRef.current);
      previewRefreshTimeoutRef.current = null;
    }

    return commitEditorSnapshot(captureEditorSnapshot());
  }

  function schedulePreviewRefresh() {
    if (hydratingEditorRef.current) return;

    if (previewRefreshTimeoutRef.current) {
      window.clearTimeout(previewRefreshTimeoutRef.current);
    }

    previewRefreshTimeoutRef.current = window.setTimeout(() => {
      const snapshot = flushPreviewSnapshot();

      if (snapshot?.blockId && viewModeRef.current !== "edit") {
        scrollPreviewToBlock(snapshot.blockId);
      }
    }, 160);
  }

  async function uploadAndInsertImage(file: File, insertAt?: { left: number; top: number }) {
    const currentProjectId = requestedProjectIdRef.current;
    if (!editor || !currentProjectId) return;

    setUploadingCount((count) => count + 1);

    try {
      const formData = new FormData();
      formData.append("projectId", currentProjectId);
      formData.append("file", file, file.name || `wiki-image-${Date.now()}.png`);

      const response = await fetch("/api/wiki/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload image");
      }

      const dimensions = await readImageDimensions(data.publicUrl);
      const safeWidth = Math.min(dimensions.width || 960, 960);
      const safeHeight = Math.round(safeWidth / Math.max(0.1, dimensions.width / Math.max(dimensions.height, 1)));
      const alt = file.name.replace(/\.[^.]+$/, "") || "Image";

      if (insertAt) {
        const targetPosition = editor.view.posAtCoords(insertAt)?.pos;

        if (typeof targetPosition === "number") {
          editor.chain().focus().setTextSelection(targetPosition).setImage({
            src: data.publicUrl,
            alt,
            width: safeWidth,
            height: safeHeight,
          }).run();
        } else {
          editor.chain().focus().setImage({
            src: data.publicUrl,
            alt,
            width: safeWidth,
            height: safeHeight,
          }).run();
        }
      } else {
        editor.chain().focus().setImage({
          src: data.publicUrl,
          alt,
          width: safeWidth,
          height: safeHeight,
        }).run();
      }

      schedulePreviewRefresh();
      setNoticeMessage("Image inserted.");
    } catch (error: any) {
      console.error(error);
      setNoticeMessage(error.message || "Failed to upload image");
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1));
    }
  }

  async function insertImageFromUrl(imageUrl: string) {
    if (!editor) return;

    const dimensions = await readImageDimensions(imageUrl);
    const safeWidth = Math.min(dimensions.width || 960, 960);
    const safeHeight = Math.round(safeWidth / Math.max(0.1, dimensions.width / Math.max(dimensions.height, 1)));

    editor.chain().focus().setImage({
      src: imageUrl,
      alt: "Image",
      width: safeWidth,
      height: safeHeight,
    }).run();

    schedulePreviewRefresh();
  }

  function openLinkDialog() {
    if (!editor) return;

    const currentHref =
      typeof editor.getAttributes("link").href === "string"
        ? editor.getAttributes("link").href
        : "";
    const selection = editor.state.selection;

    if (selection.empty && !currentHref) {
      setNoticeMessage("Select some text first, or place the cursor inside an existing link.");
      return;
    }

    linkSelectionRef.current = {
      from: selection.from,
      to: selection.to,
    };
    setLinkUrl(currentHref || "https://");
    setLinkDialogOpen(true);
  }

  function closeLinkDialog() {
    setLinkDialogOpen(false);
  }

  function applyLink() {
    if (!editor || !linkSelectionRef.current) return;

    const normalizedHref = normalizeLinkValue(linkUrl);
    const { from, to } = linkSelectionRef.current;
    const chain = editor.chain().focus().setTextSelection({ from, to }).extendMarkRange("link");

    if (!normalizedHref) {
      chain.unsetLink().run();
      schedulePreviewRefresh();
      setNoticeMessage("Link removed.");
      closeLinkDialog();
      return;
    }

    chain.setLink({ href: normalizedHref }).run();
    schedulePreviewRefresh();
    setNoticeMessage("Link updated.");
    closeLinkDialog();
  }

  async function loadWiki() {
    setLoading(true);

    try {
      const query = requestedProjectId ? `?projectId=${requestedProjectId}` : "";
      const response = await fetch(`/api/wiki${query}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load wiki");
      }

      const nextProjects = (data.projects || []) as ProjectOption[];
      const nextPages = (data.pages || []) as WikiPageDto[];
      const resolvedProjectId = data.selectedProjectId || "";
      const resolvedPageId =
        requestedPageId && nextPages.some((page) => page._id === requestedPageId)
          ? requestedPageId
          : nextPages[0]?._id || "";

      setProjects(nextProjects);
      setPages(nextPages);

      if (resolvedProjectId !== requestedProjectId || resolvedPageId !== requestedPageId) {
        syncUrl(resolvedProjectId || null, resolvedPageId || null, true);
      }
    } catch (error: any) {
      console.error(error);
      setNoticeMessage(error.message || "Failed to load wiki");
    } finally {
      setLoading(false);
    }
  }

  async function savePage({ silent = false }: { silent?: boolean } = {}) {
    if (!activePage || deleting) return;

    const snapshot = flushPreviewSnapshot();
    if (!snapshot) return;

    const nextTitle = draftTitleRef.current.trim();
    const nextContent = snapshot.markdown;
    const nextDocument = snapshot.document;
    const unchanged =
      lastSavedRef.current.pageId === activePage._id &&
      lastSavedRef.current.title === nextTitle &&
      lastSavedRef.current.content === nextContent;

    if (unchanged) return;

    const requestId = ++saveRequestIdRef.current;
    setSaving(true);

    try {
      const response = await fetch(`/api/wiki/${activePage._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          content: nextContent,
          document: nextDocument,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save page");
      }

      const savedPage = data.page as WikiPageDto;

      lastSavedRef.current = {
        pageId: savedPage._id,
        title: savedPage.title,
        content: savedPage.content,
        document: savedPage.document,
      };

      latestDraftRef.current = {
        title: savedPage.title,
        content: savedPage.content,
        document: savedPage.document,
      };

      setPages((currentPages) =>
        currentPages.map((page) => (page._id === savedPage._id ? savedPage : page))
      );

      if (!silent) {
        setNoticeMessage("Wiki page saved.");
      }

      window.dispatchEvent(new Event("wiki-data-refresh"));
    } catch (error: any) {
      console.error(error);
      setNoticeMessage(error.message || "Failed to save page");
    } finally {
      if (saveRequestIdRef.current === requestId) {
        setSaving(false);
      }
    }
  }

  async function createPage() {
    if (!requestedProjectId || !composerTitle.trim()) return;

    setCreating(true);

    try {
      const response = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: requestedProjectId,
          parentId: composerParentId,
          title: composerTitle,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create page");
      }

      const page = data.page as WikiPageDto;

      setPages((currentPages) => [...currentPages, page]);
      setComposerOpen(false);
      setComposerParentId(null);
      setComposerTitle("");
      syncUrl(requestedProjectId, page._id);
      setNoticeMessage(composerParentId ? "Subpage created." : "Page created.");
      window.dispatchEvent(new Event("wiki-data-refresh"));
    } catch (error: any) {
      console.error(error);
      setNoticeMessage(error.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  }

  async function deletePage() {
    if (!activePage) return;

    const shouldDelete = window.confirm(`Delete "${activePage.title}" and all nested pages?`);
    if (!shouldDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/wiki/${activePage._id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete page");
      }

      const idsToDelete = collectDescendantIds(pages, activePage._id);
      const remainingPages = pages.filter((page) => !idsToDelete.has(page._id));
      const fallbackPageId = remainingPages[0]?._id || null;

      setPages(remainingPages);
      syncUrl(requestedProjectId || activePage.projectId, fallbackPageId, true);
      setNoticeMessage("Wiki page deleted.");
      window.dispatchEvent(new Event("wiki-data-refresh"));
    } catch (error: any) {
      console.error(error);
      setNoticeMessage(error.message || "Failed to delete page");
    } finally {
      setDeleting(false);
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Write here. Markdown shortcuts like #, ##, -, 1., >, and ``` work as you type.",
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4",
        },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "wiki-editor-image",
        },
        resize: {
          enabled: true,
          minWidth: 160,
          minHeight: 120,
          alwaysPreserveAspectRatio: true,
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
        },
      }),
      WikiBlockIdExtension,
    ],
    content: {
      type: "doc",
      content: [],
    },
    onUpdate() {
      schedulePreviewRefresh();
    },
    onSelectionUpdate({ editor: currentEditor }) {
      const blockId = getSelectedBlockId(currentEditor);

      if (selectedBlockIdRef.current !== blockId) {
        selectedBlockIdRef.current = blockId;
        setSelectedBlockId(blockId);
      }

      if (viewModeRef.current !== "edit") {
        requestAnimationFrame(() => scrollPreviewToBlock(blockId, "smooth"));
      }
    },
    editorProps: {
      attributes: {
        class:
          "wiki-editor prose-none min-h-full max-w-none px-5 py-5 text-[15px] leading-7 text-text-base outline-none",
      },
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false;

        const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (!files.length) {
          return false;
        }

        event.preventDefault();
        void uploadAndInsertImage(files[0], { left: event.clientX, top: event.clientY });
        return true;
      },
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files || []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (files.length > 0) {
          event.preventDefault();
          void uploadAndInsertImage(files[0]);
          return true;
        }

        const clipboardText = event.clipboardData?.getData("text/plain")?.trim() || "";
        if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i.test(clipboardText)) {
          event.preventDefault();
          void insertImageFromUrl(clipboardText);
          return true;
        }

        return false;
      },
    },
  });

  const isDirty =
    !!activePage &&
    (draftTitle.trim() !== lastSavedRef.current.title || draftMarkdown !== lastSavedRef.current.content);

  useEffect(() => {
    draftTitleRef.current = draftTitle;
    latestDraftRef.current = {
      ...latestDraftRef.current,
      title: draftTitle.trim(),
    };
  }, [draftTitle]);

  useEffect(() => {
    requestedProjectIdRef.current = requestedProjectId;
  }, [requestedProjectId]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    void loadWiki();
  }, [requestedProjectId, requestedPageId]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadWiki();
    };

    window.addEventListener("wiki-data-refresh", handleRefresh);

    return () => {
      window.removeEventListener("wiki-data-refresh", handleRefresh);
    };
  }, [requestedProjectId, requestedPageId]);

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(Boolean(activePage));

    hydratingEditorRef.current = true;

    if (previewRefreshTimeoutRef.current) {
      window.clearTimeout(previewRefreshTimeoutRef.current);
      previewRefreshTimeoutRef.current = null;
    }

    if (!activePage) {
      setDraftTitle("");
      setDraftMarkdown("");
      setPreviewDocument(null);
      setSelectedBlockId(null);
      selectedBlockIdRef.current = null;
      latestDraftRef.current = { title: "", content: "", document: null };
      lastSavedRef.current = { pageId: null, title: "", content: "", document: null };
      editor.commands.setContent({ type: "doc", content: [] }, { emitUpdate: false });
      hydratingEditorRef.current = false;
      return;
    }

    const fallbackMarkdown = stripLeadingTitleHeading(activePage.content || "", activePage.title);
    const contentSource = isWikiDocument(activePage.document)
      ? activePage.document
      : renderMarkdownToHtml(fallbackMarkdown);

    setDraftTitle(activePage.title);
    editor.commands.setContent(contentSource, { emitUpdate: false });

    requestAnimationFrame(() => {
      hydratingEditorRef.current = false;
      const snapshot = flushPreviewSnapshot();
      const normalizedMarkdown = snapshot?.markdown || "";
      const normalizedDocument = snapshot?.document || null;

      latestDraftRef.current = {
        title: activePage.title,
        content: normalizedMarkdown,
        document: normalizedDocument,
      };

      lastSavedRef.current = {
        pageId: activePage._id,
        title: activePage.title,
        content: normalizedMarkdown,
        document: normalizedDocument,
      };

      if (snapshot?.blockId && viewModeRef.current !== "edit") {
        scrollPreviewToBlock(snapshot.blockId);
      }
    });
  }, [editor, activePage?._id]);

  useEffect(() => {
    if (!activePage || !isDirty || deleting) return;

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      void savePage({ silent: true });
    }, 900);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [activePage?._id, draftTitle, draftMarkdown, isDirty, deleting]);

  useEffect(() => {
    return () => {
      if (previewRefreshTimeoutRef.current) {
        window.clearTimeout(previewRefreshTimeoutRef.current);
      }

      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }

      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }

      if (scrollSyncReleaseRef.current) {
        window.clearTimeout(scrollSyncReleaseRef.current);
      }
    };
  }, []);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAndInsertImage(file);
    }

    event.target.value = "";
  };

  const openComposer = (parentId: string | null) => {
    setComposerParentId(parentId);
    setComposerTitle("");
    setComposerOpen(true);
  };

  return (
    <div className="min-h-full bg-base">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <section className="flex min-h-full flex-col bg-surface">
        <div className="border-b border-border-subtle px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
                  <span>Wiki Workspace</span>
                  {selectedProject ? <span>{selectedProject.name}</span> : null}
                  {activePage?.versionCount ? <span>{activePage.versionCount} revisions</span> : null}
                </div>

                <input
                  type="text"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  disabled={!activePage}
                  placeholder={activePage ? "Page title" : "Select or create a page"}
                  className="mt-3 h-12 w-full bg-transparent text-3xl font-semibold tracking-tight text-text-base outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-[2.2rem]"
                />

                <p className="mt-2 text-sm text-muted">
                  {saving
                    ? "Saving changes..."
                    : isDirty
                      ? "Unsaved changes"
                      : activePage
                        ? "All changes saved"
                        : "Choose a wiki page to begin"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start xl:justify-end">
                <div className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-border-subtle bg-base/60 p-1">
                  {([
                    { key: "edit", label: "Edit", icon: Pencil },
                    { key: "split", label: "Split", icon: Columns2 },
                    { key: "preview", label: "Preview", icon: Eye },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setViewMode(key)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        viewMode === key ? "bg-[#D97757] text-white" : "text-text-base hover:bg-base"
                      }`}
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openComposer(null)}
                  disabled={!requestedProjectId}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-base/70 px-4 text-sm font-medium text-text-base transition hover:bg-base disabled:opacity-50"
                >
                  <FilePlus2 size={16} />
                  New page
                </button>

                <button
                  type="button"
                  onClick={() => openComposer(activePage?._id || null)}
                  disabled={!activePage}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-base/70 px-4 text-sm font-medium text-text-base transition hover:bg-base disabled:opacity-50"
                >
                  <Plus size={16} />
                  Subpage
                </button>

                <button
                  type="button"
                  onClick={deletePage}
                  disabled={!activePage || deleting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-base/70 px-4 text-sm font-medium text-text-base transition hover:bg-base disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void savePage();
                  }}
                  disabled={!activePage || !isDirty || saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#D97757] px-5 text-sm font-medium text-white transition hover:bg-[#c96b49] disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:hidden">
              <select
                value={requestedProjectId}
                onChange={(event) => syncUrl(event.target.value || null, null)}
                className="field-surface h-11 pr-10"
              >
                {projects.length === 0 ? <option value="">No projects</option> : null}
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name} ({project.role})
                  </option>
                ))}
              </select>

              <select
                value={requestedPageId}
                onChange={(event) => syncUrl(requestedProjectId || null, event.target.value || null)}
                className="field-surface h-11 pr-10"
              >
                {pageOptions.length === 0 ? <option value="">No pages</option> : null}
                {pageOptions.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.label}
                  </option>
                ))}
              </select>
            </div>

            {notice ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3 text-sm font-medium text-primary">
                {notice}
              </div>
            ) : null}
          </div>
        </div>

        {!activePage ? (
          <div className="grid min-h-[calc(100svh-13rem)] place-items-center px-6 py-12 text-center">
            <div className="max-w-xl rounded-[28px] border border-dashed border-border-subtle bg-base/60 px-8 py-12">
              <p className="text-2xl font-semibold tracking-tight text-text-base">
                {loading ? "Loading wiki..." : "Select a wiki page"}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted">
                {loading
                  ? "Fetching pages and projects for your workspace."
                  : "Pick a page from the sidebar or create a new one to start documenting with live preview."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border-subtle bg-base/60 px-4 py-3 sm:px-5 lg:px-6">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    label: "H1",
                    icon: Heading1,
                    active: editor?.isActive("heading", { level: 1 }),
                    action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
                  },
                  {
                    label: "H2",
                    icon: Heading2,
                    active: editor?.isActive("heading", { level: 2 }),
                    action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
                  },
                  {
                    label: "H3",
                    icon: Heading3,
                    active: editor?.isActive("heading", { level: 3 }),
                    action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
                  },
                  {
                    label: "Bold",
                    icon: Bold,
                    active: editor?.isActive("bold"),
                    action: () => editor?.chain().focus().toggleBold().run(),
                  },
                  {
                    label: "Italic",
                    icon: Italic,
                    active: editor?.isActive("italic"),
                    action: () => editor?.chain().focus().toggleItalic().run(),
                  },
                  {
                    label: "Bullets",
                    icon: List,
                    active: editor?.isActive("bulletList"),
                    action: () => editor?.chain().focus().toggleBulletList().run(),
                  },
                  {
                    label: "Numbers",
                    icon: ListOrdered,
                    active: editor?.isActive("orderedList"),
                    action: () => editor?.chain().focus().toggleOrderedList().run(),
                  },
                  {
                    label: "Quote",
                    icon: Quote,
                    active: editor?.isActive("blockquote"),
                    action: () => editor?.chain().focus().toggleBlockquote().run(),
                  },
                  {
                    label: "Code",
                    icon: Code2,
                    active: editor?.isActive("codeBlock"),
                    action: () => editor?.chain().focus().toggleCodeBlock().run(),
                  },
                  {
                    label: "Link",
                    icon: Link2,
                    active: editor?.isActive("link"),
                    action: openLinkDialog,
                  },
                ].map(({ label, icon: Icon, action, active }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    disabled={!editor}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "border-[#D97757]/30 bg-[#D97757]/12 text-[#D97757]"
                        : "border-border-subtle bg-surface text-muted hover:bg-base hover:text-primary"
                    } disabled:opacity-50`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm font-medium text-muted transition hover:bg-base hover:text-primary"
                >
                  {uploadingCount > 0 ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                  Image
                </button>
              </div>
            </div>

            <div
              className={`grid min-h-[calc(100svh-17rem)] ${
                viewMode === "split" ? "xl:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {viewMode !== "preview" ? (
                <section className="flex min-h-[calc(100svh-17rem)] min-w-0 flex-col border-b border-border-subtle xl:border-b-0 xl:border-r">
                  <div className="border-b border-border-subtle bg-base/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
                    Editor
                  </div>
                  <div
                    ref={editorScrollRef}
                    onScroll={() => syncScrollPosition(editorScrollRef.current, previewScrollRef.current, "editor")}
                    className="wiki-editor-surface min-h-0 flex-1 overflow-y-auto bg-surface"
                  >
                    <div className="mx-auto min-h-full max-w-4xl">
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </section>
              ) : null}

              {viewMode !== "edit" ? (
                <section className="flex min-h-[calc(100svh-17rem)] min-w-0 flex-col">
                  <div className="border-b border-border-subtle bg-base/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
                    Preview
                  </div>
                  <MarkdownPreview
                    ref={previewScrollRef}
                    title={draftTitle}
                    document={previewDocument}
                    selectedBlockId={selectedBlockId}
                    onScroll={() => syncScrollPosition(previewScrollRef.current, editorScrollRef.current, "preview")}
                  />
                </section>
              ) : null}
            </div>
          </>
        )}
      </section>

      {composerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div className="modal-surface w-full rounded-t-[28px] p-6 sm:max-w-md sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">
                  {composerParentId ? "New Subpage" : "New Page"}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-text-base">
                  {composerParentId
                    ? `Create a child page under ${pages.find((page) => page._id === composerParentId)?.title || "this page"}`
                    : "Create a new root page"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border-subtle bg-base text-muted transition hover:border-primary hover:text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              value={composerTitle}
              onChange={(event) => setComposerTitle(event.target.value)}
              placeholder="Enter page title"
              className="field-surface mt-5"
              autoFocus
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={createPage}
                disabled={creating || !composerTitle.trim()}
                className="btn-primary flex-1"
              >
                <Plus size={16} />
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {linkDialogOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div className="modal-surface w-full rounded-t-[28px] p-6 sm:max-w-lg sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle">Insert Link</p>
                <h3 className="mt-2 text-xl font-semibold text-text-base">Attach a URL to the selected text</h3>
                <p className="mt-2 text-sm text-muted">Leave the field empty if you want to remove the current link.</p>
              </div>
              <button
                type="button"
                onClick={closeLinkDialog}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border-subtle bg-base text-muted transition hover:border-primary hover:text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                applyLink();
              }}
            >
              <div>
                <label htmlFor="wiki-link-input" className="mb-2 block text-sm font-medium text-text-base">
                  URL
                </label>
                <input
                  id="wiki-link-input"
                  type="text"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://example.com"
                  className="field-surface"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">
                  Save link
                </button>
                <button type="button" onClick={closeLinkDialog} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
