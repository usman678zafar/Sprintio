"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, FilePlus2, FolderKanban, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

export default function WikiExplorerSidebar() {
  const router = useRouter();
  const pathname = usePathname() || "/wiki";
  const searchParams = useSearchParams();

  const requestedProjectId = searchParams?.get("projectId") || "";
  const requestedPageId = searchParams?.get("pageId") || "";

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [treeQuery, setTreeQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerParentId, setComposerParentId] = useState<string | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const pageMap = useMemo(() => new Map(pages.map((page) => [page._id, page])), [pages]);
  const childrenByParent = useMemo(() => {
    const grouped = new Map<string | null, WikiPage[]>();
    pages.forEach((page) => grouped.set(page.parentId, [...(grouped.get(page.parentId) || []), page]));
    return grouped;
  }, [pages]);
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
    const handleSearch = (event: Event) => setTreeQuery((event as CustomEvent<string>).detail || "");
    const handleRefresh = () => {
      void loadWiki();
    };

    window.addEventListener("wiki-search", handleSearch as EventListener);
    window.addEventListener("wiki-data-refresh", handleRefresh);

    return () => {
      window.removeEventListener("wiki-search", handleSearch as EventListener);
      window.removeEventListener("wiki-data-refresh", handleRefresh);
    };
  }, [requestedProjectId, requestedPageId]);

  useEffect(() => {
    if (!requestedPageId) return;
    let current = pageMap.get(requestedPageId);
    if (!current) return;

    setExpandedIds((prev) => {
      const next = { ...prev };
      while (current?.parentId) {
        const parentId = current.parentId;
        next[parentId] = true;
        current = pageMap.get(parentId);
      }
      return next;
    });
  }, [pageMap, requestedPageId]);

  useEffect(() => {
    void loadWiki();
  }, [requestedProjectId, requestedPageId]);

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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openComposer = (parentId: string | null) => {
    setComposerOpen(true);
    setComposerParentId(parentId);
    setComposerTitle("");
  };

  const createPage = async () => {
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
      if (!response.ok) throw new Error(data.message || "Failed to create page");

      const page = data.page as WikiPage;
      setPages((prev) => [...prev, page]);
      if (composerParentId) {
        setExpandedIds((prev) => ({ ...prev, [composerParentId]: true }));
      }
      setComposerOpen(false);
      setComposerParentId(null);
      setComposerTitle("");
      syncUrl(requestedProjectId, page._id);
      window.dispatchEvent(new Event("wiki-data-refresh"));
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const renderTree = (parentId: string | null = null, level = 0): React.ReactNode => {
    const nodes = (childrenByParent.get(parentId) || []).filter((page) => visibleIds.has(page._id));
    if (!nodes.length) return null;

    return (
      <div className={level === 0 ? "space-y-1.5" : "mt-1.5 space-y-1.5 border-l border-border-subtle pl-4"}>
        {nodes.map((page) => {
          const children = (childrenByParent.get(page._id) || []).filter((child) => visibleIds.has(child._id));
          const expanded = expandedIds[page._id] !== false;
          const active = page._id === requestedPageId;
          const iconTone = active
            ? "border-[#D97757] bg-[#D97757] text-white"
            : level % 3 === 0
              ? "border-[#D97757]/20 bg-[#D97757]/10 text-[#D97757]"
              : level % 3 === 1
                ? "border-[#3B82F6]/20 bg-[#3B82F6]/10 text-[#3B82F6]"
                : "border-[#10B981]/20 bg-[#10B981]/10 text-[#10B981]";

          return (
            <div key={page._id} className="group">
              <div className="flex items-center gap-2">
                {children.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIds((prev) => ({
                        ...prev,
                        [page._id]: prev[page._id] === false ? true : !prev[page._id],
                      }))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center border border-border-subtle bg-base text-muted transition hover:border-primary hover:text-primary"
                  >
                    <BookOpen size={15} />
                  </button>
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center text-muted">
                    <BookOpen size={15} />
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => syncUrl(requestedProjectId || page.projectId, page._id)}
                  title={page.title}
                  aria-label={page.title}
                  className={`flex min-w-0 flex-1 items-center gap-3 border px-2 py-2 text-left transition ${
                    active
                      ? "border-[#D97757]/20 bg-[#D97757]/12 text-text-base"
                      : "border-transparent text-muted hover:border-border-subtle hover:bg-base hover:text-text-base"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center border ${iconTone}`}>
                    <BookOpen size={16} />
                  </span>
                  <span className="truncate text-sm font-medium">{page.title}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openComposer(page._id)}
                  className="inline-flex h-9 w-9 items-center justify-center border border-border-subtle bg-surface text-muted opacity-100 transition hover:border-primary hover:text-primary lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <Plus size={16} />
                </button>
              </div>

              {children.length > 0 && expanded ? renderTree(page._id, level + 1) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="hidden w-[320px] shrink-0 border-r border-border-subtle bg-surface lg:flex lg:flex-col">
      <div className="space-y-4 border-b border-border-subtle px-5 py-5">
        <div className="relative">
          <FolderKanban size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <select
            value={requestedProjectId}
            onChange={(event) => syncUrl(event.target.value, null)}
            className="field-surface h-11 pl-11"
          >
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name} ({project.role})
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={treeQuery}
            onChange={(event) => setTreeQuery(event.target.value)}
            placeholder="Search wiki pages"
            className="field-surface h-11 pl-11 pr-4"
          />
        </div>

        <button type="button" onClick={() => openComposer(null)} className="btn-primary w-full">
          <FilePlus2 size={16} />
          New Page
        </button>

        {composerOpen ? (
          <div className="rounded-[24px] border border-dashed border-border-subtle bg-base/70 p-4">
            <p className="text-sm font-semibold text-text-base">
              {composerParentId ? `New nested page under ${pageMap.get(composerParentId)?.title || "page"}` : "New root page"}
            </p>
            <input
              type="text"
              value={composerTitle}
              onChange={(event) => setComposerTitle(event.target.value)}
              placeholder="Enter page title"
              className="field-surface mt-3"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={createPage}
                disabled={creating || !composerTitle.trim()}
                className="btn-primary flex-1"
              >
                <Plus size={16} />
                {creating ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setComposerOpen(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="rounded-[24px] border border-border-subtle bg-base/70 px-5 py-10 text-center text-sm text-muted">
            Loading wiki pages...
          </div>
        ) : pages.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border-subtle bg-base/70 px-5 py-10 text-center">
            <p className="text-lg font-semibold text-text-base">No wiki pages yet</p>
            <p className="mt-2 text-sm text-muted">Create a root page to start documenting this project.</p>
          </div>
        ) : visibleIds.size === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border-subtle bg-base/70 px-5 py-10 text-center text-sm text-muted">
            No pages match "{treeQuery}".
          </div>
        ) : (
          renderTree()
        )}
      </div>
    </aside>
  );
}
