"use client";

import type { ChangeEvent, ClipboardEvent } from "react";
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

export default function WikiClient() {
  const router = useRouter();
  const pathname = usePathname() || "/wiki";
  const searchParams = useSearchParams();

  const requestedProjectId = searchParams?.get("projectId") || "";
  const requestedPageId = searchParams?.get("pageId") || "";

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePage = useMemo(
    () => pages.find((page) => page._id === requestedPageId) || null,
    [pages, requestedPageId]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project._id === requestedProjectId) || null,
    [projects, requestedProjectId]
  );
  const isDirty = !!activePage && (draftTitle.trim() !== activePage.title || draftContent !== activePage.content);

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
      setDraftContent("");
      return;
    }
    setDraftTitle(activePage.title);
    setDraftContent(activePage.content || "");
  }, [activePage]);

  const savePage = async () => {
    if (!activePage) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/wiki/${activePage._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draftTitle, content: draftContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save page");

      setPages((prev) => prev.map((page) => (page._id === data.page._id ? data.page : page)));
      setNotice("Wiki page saved.");
      window.dispatchEvent(new Event("wiki-data-refresh"));
    } catch (error: any) {
      console.error(error);
      setNotice(error.message || "Failed to save page");
    } finally {
      setSaving(false);
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
    const next = build(draftContent.slice(start, end));
    setDraftContent(`${draftContent.slice(0, start)}${next}${draftContent.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + next.length, start + next.length);
    });
  };

  const uploadImage = async (file: File) => {
    if (!requestedProjectId) return;
    setUploading(true);
    try {
      const response = await fetch("/api/wiki/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: requestedProjectId,
          filename: file.name || `wiki-image-${Date.now()}.png`,
          contentType: file.type || "image/png",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to prepare image upload");

      const uploadResponse = await fetch(data.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/png" },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Failed to upload image");

      applySelection(() => `\n![${file.name || "Wiki image"}](${data.publicUrl})\n`);
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

  const onPaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();
    if (!file) return;
    event.preventDefault();
    await uploadImage(file);
  };

  return (
    <div className="min-h-full bg-base px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      <div className="mx-auto w-full max-w-[1200px]">
        <section className="panel-surface overflow-hidden p-0">
          <div className="min-w-0 bg-white">
            <div className="border-b border-border-subtle px-5 py-5 sm:px-6 xl:px-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 xl:max-w-[760px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
                      {selectedProject ? `${selectedProject.name} / Wiki` : "Wiki"}
                    </p>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      disabled={!activePage}
                      placeholder={activePage ? "Page title" : "Select or create a page from the sidebar"}
                      className="mt-3 h-12 w-full rounded-[18px] border border-border-subtle bg-white px-4 text-lg font-semibold tracking-tight text-text-base outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:px-5 sm:text-[28px]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start xl:justify-end">
                    <div className="inline-flex flex-wrap items-center gap-2 rounded-[18px] border border-border-subtle bg-white p-1.5">
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
                      onClick={deletePage}
                      disabled={!activePage || deleting}
                      className="btn-secondary h-11 rounded-[16px] px-4"
                    >
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Delete
                    </button>

                    <button
                      type="button"
                      onClick={savePage}
                      disabled={!activePage || !isDirty || saving}
                      className="btn-primary h-11 rounded-[16px] px-5"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save
                    </button>
                  </div>
                </div>

                <p className="text-sm text-muted">
                  Markdown supported. Paste images with Ctrl + V or use the image button to upload to R2.
                </p>

                {notice ? (
                  <div className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3 text-sm font-medium text-primary">
                    {notice}
                  </div>
                ) : null}
              </div>
            </div>

            {!activePage ? (
              <div className="grid min-h-[640px] place-items-center px-6 py-12 text-center">
                <div className="max-w-xl rounded-[32px] border border-dashed border-border-subtle bg-base/60 px-8 py-12">
                  <p className="text-2xl font-semibold tracking-tight text-text-base">Select a wiki page</p>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    Pick a page from the wiki sidebar or create a new root page to start writing Markdown.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-border-subtle bg-[#fcfaf6] px-5 py-3 sm:px-6 xl:px-8">
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
                        className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                    >
                      {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                      Image
                    </button>
                  </div>
                </div>

                <div className={`grid min-h-[680px] ${viewMode === "split" ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-1"}`}>
                  {viewMode !== "preview" ? (
                    <div className="border-b border-border-subtle lg:border-b-0 lg:border-r">
                      <div className="h-full bg-[#fffdf9] p-5">
                        <textarea
                          ref={textareaRef}
                          value={draftContent}
                          onChange={(event) => setDraftContent(event.target.value)}
                          onPaste={onPaste}
                          className="h-[560px] w-full resize-none rounded-[24px] border border-border-subtle bg-white px-5 py-5 font-mono text-[15px] leading-7 text-text-base outline-none transition focus:border-primary"
                          placeholder={`# Welcome to the wiki\n\nStart documenting the project here.`}
                        />
                      </div>
                    </div>
                  ) : null}
                  {viewMode !== "edit" ? <MarkdownPreview content={draftContent} /> : null}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
