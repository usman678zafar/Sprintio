"use client";

import type { ChangeEvent, ClipboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  Columns2,
  Eye,
  FilePlus2,
  FolderKanban,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Save,
  Search,
  Trash2,
} from "lucide-react";

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
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [treeQuery, setTreeQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerParentId, setComposerParentId] = useState<string | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePage = useMemo(
    () => pages.find((page) => page._id === activePageId) || null,
    [activePageId, pages]
  );
  const pageMap = useMemo(() => new Map(pages.map((page) => [page._id, page])), [pages]);
  const childrenByParent = useMemo(() => {
    const grouped = new Map<string | null, WikiPage[]>();
    pages.forEach((page) => grouped.set(page.parentId, [...(grouped.get(page.parentId) || []), page]));
    return grouped;
  }, [pages]);
  const selectedProject = projects.find((project) => project._id === selectedProjectId) || null;
  const isDirty = !!activePage && (draftTitle.trim() !== activePage.title || draftContent !== activePage.content);

  const normalizedQuery = treeQuery.trim().toLowerCase();
  const visibleIds = useMemo(() => {
    if (!normalizedQuery) return new Set(pages.map((page) => page._id));
    const ids = new Set<string>();
    pages.forEach((page) => {
      if (!`${page.title} ${page.content}`.toLowerCase().includes(normalizedQuery)) return;
      let current: WikiPage | undefined = page;
      while (current) {
        ids.add(current._id);
        current = current.parentId ? pageMap.get(current.parentId) : undefined;
      }
    });
    return ids;
  }, [normalizedQuery, pageMap, pages]);

  useEffect(() => {
    const handleSearch = (event: Event) => setTreeQuery((event as CustomEvent<string>).detail || "");
    window.addEventListener("wiki-search", handleSearch as EventListener);
    return () => window.removeEventListener("wiki-search", handleSearch as EventListener);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!activePage) {
      setDraftTitle("");
      setDraftContent("");
      return;
    }
    setDraftTitle(activePage.title);
    setDraftContent(activePage.content || "");
  }, [activePage]);

  useEffect(() => {
    if (!activePage) return;
    let current = activePage;
    setExpandedIds((prev) => {
      const next = { ...prev };
      while (current.parentId) {
        next[current.parentId] = true;
        current = pageMap.get(current.parentId) || current;
        if (!current.parentId) break;
      }
      return next;
    });
  }, [activePage, pageMap]);

  const confirmDiscard = () => !isDirty || window.confirm("You have unsaved wiki changes. Discard them?");

  const loadWiki = async (projectId?: string, preferredPageId?: string | null) => {
    setLoading(true);
    try {
      const query = projectId ? `?projectId=${projectId}` : "";
      const response = await fetch(`/api/wiki${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load wiki");

      const nextProjects = data.projects || [];
      const nextPages = data.pages || [];
      const nextProjectId = data.selectedProjectId || "";
      const nextActive =
        preferredPageId && nextPages.some((page: WikiPage) => page._id === preferredPageId)
          ? preferredPageId
          : activePageId && nextPages.some((page: WikiPage) => page._id === activePageId)
            ? activePageId
            : nextPages[0]?._id || null;

      setProjects(nextProjects);
      setPages(nextPages);
      setSelectedProjectId(nextProjectId);
      setActivePageId(nextActive);
      setComposerOpen(false);
      setComposerTitle("");
      setComposerParentId(null);
    } catch (error: any) {
      console.error(error);
      setNotice(error.message || "Failed to load wiki");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWiki();
  }, []);

  const openComposer = (parentId: string | null) => {
    setComposerOpen(true);
    setComposerParentId(parentId);
    setComposerTitle("");
    setMobileExplorerOpen(true);
  };

  const createPage = async () => {
    if (!selectedProjectId || !composerTitle.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, parentId: composerParentId, title: composerTitle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create page");

      const page = data.page as WikiPage;
      setPages((prev) => [...prev, page]);
      setActivePageId(page._id);
      if (composerParentId) setExpandedIds((prev) => ({ ...prev, [composerParentId]: true }));
      setComposerOpen(false);
      setComposerTitle("");
      setComposerParentId(null);
      setNotice("Wiki page created.");
    } catch (error: any) {
      console.error(error);
      setNotice(error.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  };

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
      await loadWiki(selectedProjectId, null);
      setNotice("Wiki page deleted.");
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
    if (!selectedProjectId) return;
    setUploading(true);
    try {
      const response = await fetch("/api/wiki/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
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

  const renderTree = (parentId: string | null = null, level = 0): React.ReactNode => {
    const nodes = (childrenByParent.get(parentId) || []).filter((page) => visibleIds.has(page._id));
    if (!nodes.length) return null;
    return (
      <div className={level === 0 ? "space-y-1.5" : "mt-1.5 space-y-1.5 border-l border-border-subtle pl-4"}>
        {nodes.map((page) => {
          const children = (childrenByParent.get(page._id) || []).filter((child) => visibleIds.has(child._id));
          const expanded = expandedIds[page._id] !== false;
          const active = page._id === activePageId;
          return (
            <div key={page._id} className="group">
              <div className="flex items-center gap-2">
                {children.length > 0 ? (
                  <button type="button" onClick={() => setExpandedIds((prev) => ({ ...prev, [page._id]: prev[page._id] === false ? true : !prev[page._id] }))} className="inline-flex h-8 w-8 items-center justify-center border border-border-subtle bg-base text-muted transition hover:border-primary hover:text-primary">
                    {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center text-muted"><BookOpen size={15} /></span>
                )}
                <button type="button" onClick={() => { if (confirmDiscard()) { setActivePageId(page._id); setMobileExplorerOpen(false); } }} className={`flex min-w-0 flex-1 items-center gap-3 border px-3 py-3 text-left transition ${active ? "border-[#D97757]/15 bg-[#D97757]/10 text-text-base" : "border-transparent text-muted hover:border-border-subtle hover:bg-base hover:text-text-base"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center border ${active ? "border-[#D97757]/15 bg-[#D97757] text-white" : "border-border-subtle bg-surface text-muted"}`}><BookOpen size={16} /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{page.title}</span><span className="block truncate text-xs text-muted">/{page.slug}</span></span>
                </button>
                <button type="button" onClick={() => openComposer(page._id)} className="inline-flex h-9 w-9 items-center justify-center border border-border-subtle bg-surface text-muted opacity-100 transition hover:border-primary hover:text-primary md:opacity-0 md:group-hover:opacity-100"><Plus size={16} /></button>
              </div>
              {children.length > 0 && expanded ? renderTree(page._id, level + 1) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-base px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <div className="mx-auto max-w-[1600px]">
        <section className="panel-surface overflow-hidden p-0">
          <div className="grid xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="border-b border-border-subtle bg-[#f7f3ec] xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-5">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">Project Wiki</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-base">{selectedProject?.name || "Wiki Explorer"}</h1></div>
                <button type="button" onClick={() => setMobileExplorerOpen((prev) => !prev)} className="inline-flex h-10 w-10 items-center justify-center border border-border-subtle bg-white text-muted transition hover:border-primary hover:text-primary xl:hidden">{mobileExplorerOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>
              </div>

              <div className="space-y-4 border-b border-border-subtle px-5 py-4">
                <div className="relative"><FolderKanban size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><select value={selectedProjectId} onChange={(event) => confirmDiscard() && handleProjectChange(event.target.value)} className="field-surface h-11 pl-11">{projects.map((project) => <option key={project._id} value={project._id}>{project.name} ({project.role})</option>)}</select></div>
                <div className="relative"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input type="search" value={treeQuery} onChange={(event) => setTreeQuery(event.target.value)} placeholder="Search wiki pages" className="field-surface h-11 pl-11 pr-4" /></div>
                <button type="button" onClick={() => openComposer(null)} className="btn-primary w-full"><FilePlus2 size={16} />New Page</button>
                {composerOpen ? <div className="border border-dashed border-border-subtle bg-white p-4"><p className="text-sm font-semibold text-text-base">{composerParentId ? `New nested page under ${pageMap.get(composerParentId)?.title || "page"}` : "New root page"}</p><input type="text" value={composerTitle} onChange={(event) => setComposerTitle(event.target.value)} placeholder="Enter page title" className="field-surface mt-3" autoFocus /><div className="mt-3 flex gap-2"><button type="button" onClick={createPage} disabled={creating || !composerTitle.trim()} className="btn-primary flex-1">{creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Create</button><button type="button" onClick={() => setComposerOpen(false)} className="btn-secondary flex-1">Cancel</button></div></div> : null}
              </div>

              <div className={`${mobileExplorerOpen ? "block" : "hidden"} px-4 py-5 xl:block`}>
                {loading ? <div className="border border-border-subtle bg-white px-5 py-10 text-center text-sm text-muted">Loading wiki pages...</div> : pages.length === 0 ? <div className="border border-dashed border-border-subtle bg-white px-5 py-10 text-center"><p className="text-lg font-semibold text-text-base">No wiki pages yet</p><p className="mt-2 text-sm text-muted">Create a root page to start documenting this project.</p></div> : visibleIds.size === 0 ? <div className="border border-dashed border-border-subtle bg-white px-5 py-10 text-center text-sm text-muted">No pages match "{treeQuery}".</div> : renderTree()}
              </div>
            </aside>

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
                        placeholder={activePage ? "Page title" : "Select or create a page"}
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
                              viewMode === key
                                ? "bg-[#D97757] text-white"
                                : "text-text-base hover:bg-base"
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

              {!activePage ? <div className="grid min-h-[640px] place-items-center px-6 py-12 text-center"><div className="max-w-xl rounded-[32px] border border-dashed border-border-subtle bg-base/60 px-8 py-12"><p className="text-2xl font-semibold tracking-tight text-text-base">Select a wiki page</p><p className="mt-3 text-sm leading-7 text-muted">Pick a page from the explorer or create a new root page to start writing Markdown for this project.</p></div></div> : <>
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
                    ].map(({ label, icon: Icon, action }) => <button key={label} type="button" onClick={action} className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"><Icon size={15} />{label}</button>)}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary">{uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}Image</button>
                  </div>
                </div>

                <div className={`grid min-h-[680px] ${viewMode === "split" ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-1"}`}>
                  {viewMode !== "preview" ? <div className="border-b border-border-subtle lg:border-b-0 lg:border-r"><div className="h-full bg-[#fffdf9] p-5"><textarea ref={textareaRef} value={draftContent} onChange={(event) => setDraftContent(event.target.value)} onPaste={onPaste} className="h-[560px] w-full resize-none rounded-[24px] border border-border-subtle bg-white px-5 py-5 font-mono text-[15px] leading-7 text-text-base outline-none transition focus:border-primary" placeholder={`# Welcome to the wiki\n\nStart documenting the project here.`} /></div></div> : null}
                  {viewMode !== "edit" ? <MarkdownPreview content={draftContent} /> : null}
                </div>
              </>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  async function handleProjectChange(nextProjectId: string) {
    if (nextProjectId === selectedProjectId || !confirmDiscard()) return;
    await loadWiki(nextProjectId, null);
  }
}
