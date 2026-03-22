"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  FolderDot,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Project = {
  _id: string;
  name: string;
  memberCount: number;
  taskCount: number;
  description?: string;
  createdAt?: string;
  cardColor?: string;
  languages?: string[];
};

type FilterKey = "all" | "active" | "completed" | "archived";
type ViewMode = "grid" | "list";
type SortMode = "recent" | "name" | "tasks";

type ProjectsResponse = {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

const PAGE_SIZE = 9;

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All Projects" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

const sorts: Array<{ key: SortMode; label: string }> = [
  { key: "recent", label: "Newest First" },
  { key: "name", label: "Alphabetical" },
  { key: "tasks", label: "Most Tasks" },
];

const defaultProjectColor = "#D97757";
const PROJECT_NAME_MAX = 80;
const PROJECT_DESCRIPTION_MAX = 1000;

function formatDate(dateString?: string) {
  if (!dateString) return "No date";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseCommaList(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getProjectColor(project: Project) {
  return project.cardColor || defaultProjectColor;
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const accent = getProjectColor(project);
  const progress = project.taskCount === 0 ? 0 : Math.min(100, (project.taskCount * 14) % 101);
  const languages = project.languages?.slice(0, 2) ?? [];

  return (
    <div
      onClick={() => router.push(`/project/${project._id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-[32px] border border-border-subtle bg-surface p-6 pb-7 transition-all duration-300 hover:border-brand/40 hover:bg-surface-elevated hover:shadow-2xl hover:shadow-brand/5 hover:-translate-y-1.5"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: accent }} />

      <div className="flex items-start justify-between gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110"
          style={{ backgroundColor: accent, boxShadow: `${accent}33 0px 8px 16px` }}
        >
          <FolderDot size={22} strokeWidth={2.4} />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-muted transition hover:bg-base hover:text-text-base border border-transparent hover:border-border-subtle"
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div
                className="absolute right-0 top-12 z-20 w-52 rounded-2xl border p-2 shadow-2xl animate-fade-in"
                style={{
                  backgroundColor: "rgb(var(--bg-elevated-rgb))",
                  borderColor: "rgb(var(--border-strong-rgb))",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onEdit(project);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted transition hover:bg-base hover:text-text-base"
                >
                  <Pencil size={18} />
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(project._id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-500/10"
                >
                  <Trash2 size={18} />
                  Delete Project
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-2xl font-bold tracking-tight text-text-base group-hover:text-brand transition-colors">{project.name}</h3>
        <p className="line-clamp-2 min-h-[48px] text-[15px] leading-relaxed text-muted/90">
          {project.description?.trim() || "Ready for action and mission tracking."}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-base px-3 py-1.5 text-muted">
          <CheckCircle2 size={14} className="text-brand" />
          <span>{project.taskCount} Tasks</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-base px-3 py-1.5 text-muted">
          <Users size={14} className="text-brand" />
          <span>{project.memberCount} Members</span>
        </div>
        {languages.map((language) => (
          <div
            key={language}
            className="rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm"
            style={{ backgroundColor: accent }}
          >
            {language}
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
          <span>Project Health</span>
          <span className="text-text-base">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-base">
          <div
            className="h-full rounded-full transition-all duration-700 ease-spring"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center border-t border-border-subtle/50 pt-6 group-hover:border-brand/20 transition-colors">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted/60">
          <Clock size={14} />
          {formatDate(project.createdAt)}
        </div>
      </div>
    </div>
  );
}

function ProjectListItem({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const accent = getProjectColor(project);

  return (
    <div
      onClick={() => router.push(`/project/${project._id}`)}
      className="group flex cursor-pointer flex-col gap-5 rounded-[28px] border border-border-subtle bg-surface p-5 transition-all duration-300 hover:border-brand/40 hover:bg-surface-elevated sm:flex-row sm:items-center sm:justify-between hover:translate-x-1"
    >
      <div className="flex min-w-0 items-center gap-5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-hover:scale-105"
          style={{ backgroundColor: accent, boxShadow: `${accent}33 0px 4px 12px` }}
        >
          <FolderDot size={24} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold tracking-tight text-text-base group-hover:text-brand transition-colors">{project.name}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-muted/80">
            {project.description?.trim() || "Track progress and team activity."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-muted/60">
            <span className="flex items-center gap-1.5"><Clock size={12} /> {formatDate(project.createdAt)}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-brand" /> {project.taskCount} Tasks</span>
            <span className="flex items-center gap-1.5"><Users size={12} className="text-brand" /> {project.memberCount} Members</span>
          </div>
        </div>
      </div>

      <div className="relative self-end sm:self-auto flex items-center gap-4">
        {!!project.languages?.length && (
          <div className="hidden lg:flex gap-2">
            {project.languages.slice(0, 2).map(lang => (
              <span key={lang} className="px-2.5 py-1 rounded-lg bg-base border border-border-subtle text-[10px] font-bold uppercase text-muted">
                {lang}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-muted transition hover:bg-base hover:text-text-base border border-transparent hover:border-border-subtle"
        >
          <MoreVertical size={20} />
        </button>

        {showMenu && (
          <div
            className="absolute right-0 top-12 z-20 w-48 rounded-2xl border p-2 shadow-2xl animate-fade-in"
            style={{
              backgroundColor: "rgb(var(--bg-elevated-rgb))",
              borderColor: "rgb(var(--border-strong-rgb))",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onEdit(project);
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-base"
            >
              <Pencil size={16} />
              Edit Details
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(project._id);
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10"
            >
              <Trash2 size={16} />
              Delete Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(initialProjects.length);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(defaultProjectColor);
  const [newProjectLanguages, setNewProjectLanguages] = useState("");
  const [newProjectMembers, setNewProjectMembers] = useState("");

  const isMounted = useRef(false);

  const [updatedName, setUpdatedName] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [updatedColor, setUpdatedColor] = useState(defaultProjectColor);
  const [updatedLanguages, setUpdatedLanguages] = useState("");

  const fetchProjects = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: String(PAGE_SIZE),
        sort: sortMode,
      });

      if (searchQuery.trim()) {
        params.set("query", searchQuery.trim());
      }

      const response = await fetch(`/api/projects?${params.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const data: ProjectsResponse = await response.json();
        setProjects(data.projects);
        setTotalItems(data.pagination.totalItems);
        setTotalPages(data.pagination.totalPages);
        if (data.pagination.page !== currentPage) {
          setCurrentPage(data.pagination.page);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail || "");
    };

    window.addEventListener("projects-search", handleSearch as EventListener);
    return () => {
      window.removeEventListener("projects-search", handleSearch as EventListener);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortMode]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    fetchProjects(currentPage);
  }, [currentPage, searchQuery, sortMode]);

  const resetCreateForm = () => {
    setNewProjectName("");
    setNewProjectDescription("");
    setNewProjectColor(defaultProjectColor);
    setNewProjectLanguages("");
    setNewProjectMembers("");
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          cardColor: newProjectColor,
          languages: parseCommaList(newProjectLanguages),
          memberIdentifiers: parseCommaList(newProjectMembers),
        }),
      });

      if (response.ok) {
        resetCreateForm();
        setShowModal(false);
        fetchProjects(currentPage);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProject || !updatedName.trim()) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/projects/${editingProject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updatedName,
          description: updatedDescription,
          cardColor: updatedColor,
          languages: parseCommaList(updatedLanguages),
        }),
      });

      if (response.ok) {
        setEditingProject(null);
        setUpdatedName("");
        setUpdatedDescription("");
        setUpdatedColor(defaultProjectColor);
        setUpdatedLanguages("");
        fetchProjects(currentPage);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    setDeletingProject(true);
    try {
      const response = await fetch(`/api/projects/${deletingProjectId}`, { method: "DELETE" });
      if (response.ok) {
        setDeletingProjectId(null);
        fetchProjects(currentPage);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingProject(false);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setUpdatedName(project.name);
    setUpdatedDescription(project.description || "");
    setUpdatedColor(project.cardColor || defaultProjectColor);
    setUpdatedLanguages(project.languages?.join(", ") || "");
  };

  const visibleProjects = useMemo(() => {
    let filtered = [...projects];

    if (filter === "completed") {
      filtered = filtered.filter((project) => (project.taskCount * 14) % 101 === 100 && project.taskCount > 0);
    }

    if (filter === "active") {
      filtered = filtered.filter((project) => (project.taskCount * 14) % 101 < 100 || project.taskCount === 0);
    }

    if (sortMode === "name") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortMode === "tasks") {
      return [...filtered].sort((a, b) => b.taskCount - a.taskCount);
    }

    return [...filtered].sort(
      (a, b) =>
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
        (a.createdAt ? new Date(a.createdAt).getTime() : 0),
    );
  }, [projects, filter, sortMode]);

  return (
    <div className="min-h-full bg-base px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-base sm:text-4xl">Project Portfolio</h1>
            <p className="mt-3 text-lg font-medium text-muted">
              Overview of all your active workspaces and team missions.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary px-4 py-2.5">
              <Plus size={18} />
              Add New Project
            </button>
            <div className="flex h-11 items-center rounded-full border border-border-subtle bg-surface p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-9 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  viewMode === "grid" ? "bg-[#111827] text-white" : "text-muted hover:text-text-base"
                }`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex h-9 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  viewMode === "list" ? "bg-[#111827] text-white" : "text-muted hover:text-text-base"
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </section>

        <section className="mb-10 border-y border-border-subtle/50 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex h-14 items-center rounded-2xl border border-border-subtle bg-surface p-1.5">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`relative h-full rounded-xl px-6 text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
                    filter === item.key
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted hover:text-text-base hover:bg-base"
                  }`}
                >
                  {item.label}
                  {filter === item.key && (
                    <span 
                      className="absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-white opacity-50"
                      style={{ animation: 'float 2s infinite ease-in-out' }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-muted/60">Sort by:</span>
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="h-14 appearance-none rounded-2xl border border-border-subtle bg-surface pl-6 pr-12 text-sm font-bold uppercase tracking-widest text-text-base outline-none hover:border-brand/40 transition-colors"
                >
                  {sorts.map((sort) => (
                    <option key={sort.key} value={sort.key}>
                      {sort.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                  <List size={16} strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div 
                key={item} 
                className="h-[310px] rounded-[32px] bg-border-subtle/50 border-none animate-pulse"
                style={{ animationDelay: `${item * 75}ms` }}
              />
            ))}
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[40px] border border-border-subtle bg-surface py-32 text-center animate-fade-in">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-base text-muted/40">
              <FolderDot size={48} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-text-base">No results found</h2>
            <p className="mt-3 text-muted max-w-xs mx-auto text-[15px]">
              Try adjusting your search criteria or create a fresh workspace to start your mission.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in" key={`grid-${filter}-${sortMode}-${searchQuery}`}>
            {visibleProjects.map((project, idx) => (
              <ProjectCard 
                key={project._id} 
                project={project} 
                onEdit={openEditModal} 
                onDelete={setDeletingProjectId} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5 animate-fade-in" key={`list-${filter}-${sortMode}-${searchQuery}`}>
            {visibleProjects.map((project) => (
              <ProjectListItem
                key={project._id}
                project={project}
                onEdit={openEditModal}
                onDelete={setDeletingProjectId}
              />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} projects
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-border-subtle px-3 py-1.5 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-border-subtle px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="modal-surface w-full max-w-2xl p-8">
            <h3 className="text-2xl font-bold text-text-base">Create Workspace</h3>
            <p className="mt-2 text-muted">Add the identity, stack, and initial team members for the project.</p>

            <form onSubmit={handleCreateProject} className="mt-8 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value.slice(0, PROJECT_NAME_MAX))}
                    disabled={creating}
                    maxLength={PROJECT_NAME_MAX}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                    placeholder="e.g. Apollo Mission"
                  />
                  <p className="mt-2 text-xs text-muted">{newProjectName.length}/{PROJECT_NAME_MAX}</p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newProjectDescription}
                    onChange={(event) => setNewProjectDescription(event.target.value.slice(0, PROJECT_DESCRIPTION_MAX))}
                    disabled={creating}
                    maxLength={PROJECT_DESCRIPTION_MAX}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                    placeholder="Short summary of the workspace."
                  />
                  <p className="mt-2 text-xs text-muted">
                    {newProjectDescription.length}/{PROJECT_DESCRIPTION_MAX}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Card Color
                  </label>
                  <input
                    type="color"
                    value={newProjectColor}
                    onChange={(event) => setNewProjectColor(event.target.value)}
                    disabled={creating}
                    className="h-14 w-full rounded-2xl border border-border-subtle bg-base p-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Languages
                  </label>
                  <input
                    type="text"
                    value={newProjectLanguages}
                    onChange={(event) => setNewProjectLanguages(event.target.value)}
                    disabled={creating}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                    placeholder="TypeScript, Node.js, Python"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Members
                  </label>
                  <input
                    type="text"
                    value={newProjectMembers}
                    onChange={(event) => setNewProjectMembers(event.target.value)}
                    disabled={creating}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                    placeholder="Enter email or username, separated by commas"
                  />
                  <p className="mt-2 text-xs text-muted">
                    Existing users can be added by email or displayed name.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-danger flex-1 px-6 py-4 font-bold"
                  disabled={creating}
                >
                  Discard
                </button>
                <button type="submit" disabled={creating} className="btn-success flex-1 px-6 py-4 font-bold">
                  {creating ? "Launching..." : "Launch Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="modal-surface w-full max-w-2xl p-8">
            <h3 className="text-2xl font-bold text-text-base">Update Workspace</h3>

            <form onSubmit={handleUpdateProject} className="mt-8 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={updatedName}
                    onChange={(event) => setUpdatedName(event.target.value.slice(0, PROJECT_NAME_MAX))}
                    disabled={updating}
                    maxLength={PROJECT_NAME_MAX}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                  />
                  <p className="mt-2 text-xs text-muted">{updatedName.length}/{PROJECT_NAME_MAX}</p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={updatedDescription}
                    onChange={(event) => setUpdatedDescription(event.target.value.slice(0, PROJECT_DESCRIPTION_MAX))}
                    disabled={updating}
                    maxLength={PROJECT_DESCRIPTION_MAX}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                  />
                  <p className="mt-2 text-xs text-muted">
                    {updatedDescription.length}/{PROJECT_DESCRIPTION_MAX}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Card Color
                  </label>
                  <input
                    type="color"
                    value={updatedColor}
                    onChange={(event) => setUpdatedColor(event.target.value)}
                    disabled={updating}
                    className="h-14 w-full rounded-2xl border border-border-subtle bg-base p-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Languages
                  </label>
                  <input
                    type="text"
                    value={updatedLanguages}
                    onChange={(event) => setUpdatedLanguages(event.target.value)}
                    disabled={updating}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                    placeholder="TypeScript, Node.js, Python"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="btn-danger flex-1 px-6 py-4 font-bold"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button type="submit" disabled={updating} className="btn-warning flex-1 px-6 py-4 font-bold">
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingProjectId}
        title="Delete Project"
        description="This project will be removed along with its related tasks and member assignments."
        confirmLabel="Delete Project"
        loading={deletingProject}
        onCancel={() => setDeletingProjectId(null)}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}
