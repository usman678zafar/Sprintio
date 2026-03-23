"use client";

import type { ChangeEvent, ClipboardEvent as ReactClipboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Columns2,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  Pencil,
  Quote,
  Save,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import MarkdownPreview from "@/components/wiki/MarkdownPreview";

type ProjectOption = { _id: string; name: string; role: "MASTER" | "MEMBER" };
type WikiPage = {
  _id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  slug: string;
  content: string;
  order: number;
};
type ViewMode = "split" | "edit" | "preview";
type EmbeddedImage = {
  id: string;
  alt: string;
  src: string;
};

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripEmbeddedImageText(text: string, images: EmbeddedImage[]) {
  if (!text) return "";

  let nextText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "");

  for (const image of images) {
    const escapedSrc = escapeForRegExp(image.src);
    nextText = nextText.replace(new RegExp(escapedSrc, "g"), "");
  }

  return nextText
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getClipboardImageFile(
  clipboardItems: DataTransferItemList | undefined | null
) {
  if (!clipboardItems) return null;

  const imageItem = Array.from(clipboardItems).find(
    (item) => item.kind === "file" && item.type.startsWith("image/")
  );

  return imageItem?.getAsFile() || null;
}

function getClipboardImageUrl(clipboardData: DataTransfer | null | undefined) {
  const text = clipboardData?.getData("text/plain")?.trim() || "";
  if (!text) return null;

  if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i.test(text)) {
    return text;
  }

  if (/^https?:\/\/\S+\/wiki\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i.test(text)) {
    return text;
  }

  return null;
}

export default function WikiClient() {
  const router = useRouter();
  const pathname = usePathname() || "/wiki";
  const searchParams = useSearchParams();

  const requestedProjectId = searchParams?.get("projectId") || "";
  const requestedPageId = searchParams?.get("pageId") || "";

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [editorTextContent, setEditorTextContent] = useState("");
  const [embeddedImages, setEmbeddedImages] = useState<EmbeddedImage[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPasteHandledAtRef = useRef(0);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const latestDraftRef = useRef({ title: "", content: "" });
  const lastSavedRef = useRef<{ pageId: string | null; title: string; content: string }>({
    pageId: null,
    title: "",
    content: "",
  });
  const saveRequestIdRef = useRef(0);

  const activePage = useMemo(
    () => pages.find((page) => page._id === requestedPageId) || null,
    [pages, requestedPageId]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project._id === requestedProjectId) || null,
    [projects, requestedProjectId]
  );
  const composedContent = useMemo(() => {
    const text = stripEmbeddedImageText(editorTextContent, embeddedImages);
    const imageMarkdown = embeddedImages.map((image) => `![${image.alt}](${image.src})`).join("\n\n");

    if (text && imageMarkdown) return `${text}\n\n${imageMarkdown}`;
    if (imageMarkdown) return imageMarkdown;
    return text;
  }, [editorTextContent, embeddedImages]);
  const isDirty = !!activePage && (draftTitle.trim() !== activePage.title || composedContent !== activePage.content);

  useEffect(() => {
    latestDraftRef.current = {
      title: draftTitle.trim(),
      content: composedContent,
    };
  }, [draftTitle, composedContent]);

  const syncUrl = (projectId: string | null, pageId: string | null, replace = false) => {
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
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const loadWiki = async () => {
      setLoading(true);
      try {
        const query = requestedProjectId ? `?projectId=${requestedProjectId}` : "";
        const response = await fetch(`/api/wiki${query}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to load wiki");

        const nextProjects = (data.projects || []) as ProjectOption[];
        const nextPages = (data.pages || []) as WikiPage[];
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
        setNotice(error.message || "Failed to load wiki");
      } finally {
        setLoading(false);
      }
    };

    void loadWiki();
  }, [requestedProjectId, requestedPageId]);

  useEffect(() => {
    if (!activePage) {
      setDraftTitle("");
      setEditorTextContent("");
      setEmbeddedImages([]);
      lastSavedRef.current = { pageId: null, title: "", content: "" };
      return;
    }

    const imageMatches = Array.from(activePage.content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g));
    const nextImages = imageMatches.map((match, index) => ({
      id: `${match[2]}-${index}`,
      alt: match[1] || "Image",
      src: match[2],
    }));
    const nextText = activePage.content
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    setDraftTitle(activePage.title);
    setEditorTextContent(nextText);
    setEmbeddedImages(nextImages);
    lastSavedRef.current = {
      pageId: activePage._id,
      title: activePage.title,
      content: activePage.content,
    };
  }, [activePage]);

  useEffect(() => {
    if (embeddedImages.length === 0) return;

    setEditorTextContent((prev) => stripEmbeddedImageText(prev, embeddedImages));
  }, [embeddedImages]);

  useEffect(() => {
    if (!activePage || viewMode === "preview") return;

    const handleWindowPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === "input") {
        return;
      }

      const now = Date.now();
      if (now - lastPasteHandledAtRef.current < 150) {
        return;
      }

      const file = getClipboardImageFile(event.clipboardData?.items);
      const imageUrl = getClipboardImageUrl(event.clipboardData);
      if (!file && !imageUrl) return;

      event.preventDefault();
      event.stopPropagation();
      lastPasteHandledAtRef.current = now;
      if (file) {
        void uploadImage(file);
        return;
      }

      setEmbeddedImages((prev) => [
        ...prev,
        {
          id: `${imageUrl}-${prev.length}`,
          alt: "Image",
          src: imageUrl!,
        },
      ]);
    };

    window.addEventListener("paste", handleWindowPaste as unknown as EventListener, true);

    return () => {
      window.removeEventListener("paste", handleWindowPaste as unknown as EventListener, true);
    };
  }, [activePage, viewMode, requestedProjectId, editorTextContent]);

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
  }, [activePage?._id, draftTitle, composedContent, isDirty, deleting]);

  const savePage = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!activePage || deleting) return;

    const nextTitle = latestDraftRef.current.title;
    const nextContent = latestDraftRef.current.content;
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
        body: JSON.stringify({ title: nextTitle, content: nextContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save page");

      lastSavedRef.current = {
        pageId: data.page._id,
        title: data.page.title,
        content: data.page.content,
      };
      setPages((prev) => prev.map((page) => (page._id === data.page._id ? data.page : page)));
      if (!silent) {
        setNotice("Wiki page saved.");
      }
      window.dispatchEvent(new Event("wiki-data-refresh"));
    } catch (error: any) {
      console.error(error);
      setNotice(error.message || "Failed to save page");
    } finally {
      if (saveRequestIdRef.current === requestId) {
        setSaving(false);
      }
    }
  };

  const deletePage = async () => {
    if (!activePage || !window.confirm(`Delete "${activePage.title}" and all nested pages?`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/wiki/${activePage._id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete page");

      const remainingPages = pages.filter((page) => page._id !== activePage._id);
      const fallbackPageId = remainingPages[0]?._id || null;
      syncUrl(requestedProjectId || activePage.projectId, fallbackPageId, true);
      setNotice("Wiki page deleted.");
      window.dispatchEvent(new Event("wiki-data-refresh"));
    } catch (error: any) {
      console.error(error);
      setNotice(error.message || "Failed to delete page");
    } finally {
      setDeleting(false);
    }
  };

  const applySelection = (build: (selected: string) => string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = build(editorTextContent.slice(start, end));
    setEditorTextContent(`${editorTextContent.slice(0, start)}${next}${editorTextContent.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + next.length, start + next.length);
    });
  };

  const uploadImage = async (file: File) => {
    if (!requestedProjectId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("projectId", requestedProjectId);
      formData.append("file", file, file.name || `wiki-image-${Date.now()}.png`);

      const response = await fetch("/api/wiki/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to upload image");

      setEmbeddedImages((prev) => [
        ...prev,
        {
          id: `${data.publicUrl}-${prev.length}`,
          alt: "Image",
          src: data.publicUrl,
        },
      ]);
      setNotice("Image uploaded and inserted.");
    } catch (error: any) {
      console.error(error);
      setNotice(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await uploadImage(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-full bg-base px-0 py-0">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      <div className="w-full">
        <section className="overflow-hidden bg-white p-0">
          <div className="min-w-0 bg-white">
            <div className="border-b border-border-subtle px-4 py-3 sm:px-5 lg:px-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      disabled={!activePage}
                      placeholder={activePage ? "Page title" : "Select or create a page from the sidebar"}
                      className="h-11 w-full bg-transparent px-1 text-2xl font-semibold tracking-tight text-text-base outline-none transition disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:text-[30px]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start xl:justify-end">
                    <div className="inline-flex flex-wrap items-center gap-1 bg-base/40 p-1">
                      {([
                        { key: "edit", label: "Edit", icon: Pencil },
                        { key: "split", label: "Split", icon: Columns2 },
                        { key: "preview", label: "Preview", icon: Eye },
                      ] as const).map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setViewMode(key)}
                          className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition ${
                            viewMode === key ? "bg-[#D97757] text-white" : "text-text-base hover:bg-white"
                          }`}
                        >
                          <Icon size={15} />
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={deletePage}
                      disabled={!activePage || deleting}
                      className="inline-flex h-11 items-center justify-center gap-2 bg-base/70 px-4 text-sm font-medium text-text-base transition hover:bg-base disabled:opacity-50"
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
                      className="inline-flex h-11 items-center justify-center gap-2 bg-[#D97757] px-5 text-sm font-medium text-white transition hover:bg-[#c96b49] disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save
                    </button>
                  </div>
                </div>

                {notice ? (
                  <div className="border border-primary/15 bg-primary/8 px-4 py-3 text-sm font-medium text-primary">
                    {notice}
                  </div>
                ) : null}
              </div>
            </div>

            {!activePage ? (
              <div className="grid min-h-[calc(100svh-7rem)] place-items-center px-6 py-12 text-center">
                <div className="max-w-xl border border-dashed border-border-subtle bg-base/40 px-8 py-12">
                  <p className="text-2xl font-semibold tracking-tight text-text-base">Select a wiki page</p>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    Pick a page from the wiki sidebar or create a new root page to start writing Markdown.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-border-subtle bg-[#fcfaf6] px-4 py-2 sm:px-5 lg:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: "Heading", icon: Heading2, action: () => applySelection((selected) => `## ${selected || "Section title"}`) },
                      { label: "Bold", icon: Bold, action: () => applySelection((selected) => `**${selected || "bold text"}**`) },
                      { label: "Italic", icon: Italic, action: () => applySelection((selected) => `*${selected || "italic text"}*`) },
                      { label: "Link", icon: Link2, action: () => applySelection((selected) => `[${selected || "link text"}](https://example.com)`) },
                      { label: "List", icon: List, action: () => applySelection((selected) => selected ? selected.split("\n").map((line) => `- ${line}`).join("\n") : "- First item\n- Second item") },
                      { label: "Quote", icon: Quote, action: () => applySelection((selected) => `> ${selected || "Quoted note"}`) },
                      { label: "Code", icon: Code2, action: () => applySelection((selected) => `\`\`\`\n${selected || "code snippet"}\n\`\`\``) },
                    ].map(({ label, icon: Icon, action }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={action}
                        className="inline-flex items-center gap-2 bg-white px-3 py-2 text-sm font-medium text-muted transition hover:bg-base hover:text-primary"
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 bg-white px-3 py-2 text-sm font-medium text-muted transition hover:bg-base hover:text-primary"
                    >
                      {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                      Image
                    </button>
                  </div>
                </div>

                <div className={`grid min-h-[calc(100svh-10rem)] ${viewMode === "split" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                  {viewMode !== "preview" ? (
                    <div className="border-b border-border-subtle lg:border-b-0 lg:border-r">
                      <div className="flex h-full min-h-[calc(100svh-10rem)] flex-col bg-[#fffdf9]">
                        <textarea
                          ref={textareaRef}
                          value={editorTextContent}
                          onChange={(event) => setEditorTextContent(event.target.value)}
                          className={`w-full resize-none bg-transparent px-5 py-5 font-mono text-[15px] leading-7 text-text-base outline-none ${
                            embeddedImages.length > 0
                              ? "min-h-[12rem]"
                              : "min-h-[18rem] flex-1"
                          }`}
                          placeholder={`# Welcome to the wiki\n\nStart documenting the project here.`}
                        />
                        {embeddedImages.length > 0 ? (
                          <div className="px-5 pb-5">
                            <div className="flex flex-wrap gap-3">
                              {embeddedImages.map((image) => (
                                <div
                                  key={image.id}
                                  draggable
                                  onDragStart={() => setDraggingImageId(image.id)}
                                  onDragEnd={() => setDraggingImageId(null)}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                  }}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    if (!draggingImageId || draggingImageId === image.id) return;
                                    setEmbeddedImages((prev) => {
                                      const fromIndex = prev.findIndex((item) => item.id === draggingImageId);
                                      const toIndex = prev.findIndex((item) => item.id === image.id);
                                      if (fromIndex === -1 || toIndex === -1) return prev;
                                      const next = [...prev];
                                      const [moved] = next.splice(fromIndex, 1);
                                      next.splice(toIndex, 0, moved);
                                      return next;
                                    });
                                  }}
                                  className="cursor-move"
                                  title="Drag to reorder"
                                >
                                  <img
                                    src={image.src}
                                    alt={image.alt}
                                    className="h-32 w-auto max-w-full border border-border-subtle bg-white object-contain"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {viewMode !== "edit" ? <MarkdownPreview content={composedContent} /> : null}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
