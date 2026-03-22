"use client";

import { useEffect, useMemo, useState } from "react";
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
      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-border-subtle bg-surface p-5 transition-all duration-200 hover:border-border-default"
    >
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent }} />

      <div className="flex items-start justify-between gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: accent }}
        >
          <FolderDot size={20} strokeWidth={2.4} />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-base"
          >
            <MoreVertical size={18} />
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
                className="absolute right-0 top-10 z-20 w-48 rounded-2xl border p-2"
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
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-base"
                >
                  <Pencil size={16} />
                  Edit Project
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(project._id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-base"
                >
                  <Trash2 size={16} />
                  Delete Project
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-xl font-bold tracking-tight text-text-base">{project.name}</h3>
        <p className="line-clamp-2 min-h-11 text-sm leading-6 text-muted">
          {project.description?.trim() || "No description added yet."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
        <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-base px-2 py-1">
          <CheckCircle2 size={12} />
          <span>{project.taskCount} Tasks</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-base px-2 py-1">
          <Users size={12} />
          <span>{project.memberCount} Members</span>
        </div>
        {languages.map((language) => (
          <div
            key={language}
            className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: accent }}
          >
            {language}
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2.5">
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="text-muted">Progress</span>
          <span className="text-text-base">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-base">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center border-t border-border-subtle pt-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted">
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
      className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-4 transition-all hover:border-border-default sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: accent }}
        >
          <FolderDot size={18} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-bold text-text-base">{project.name}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-muted">
            {project.description?.trim() || "No description added yet."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-muted">
            <span>{formatDate(project.createdAt)}</span>
            <span>{project.taskCount} Tasks</span>
            <span>{project.memberCount} Members</span>
            {!!project.languages?.length && <span>{project.languages.slice(0, 3).join(", ")}</span>}
          </div>
        </div>
      </div>

      <div className="relative self-end sm:self-auto">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-base"
        >
          <MoreVertical size={18} />
        </button>

        {showMenu && (
          <div
            className="absolute right-0 top-10 z-20 w-48 rounded-2xl border p-2"
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
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-muted hover:bg-base"
            >
              <Pencil size={16} />
              Edit Project
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(project._id);
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-red-600 hover:bg-base"
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
            <h1 className="text-3xl font-black tracking-tight text-text-base sm:text-4xl">Project Portfolio</h1>
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

        <section className="mb-8 border-y border-border-subtle py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                    filter === item.key
                      ? "bg-[#D97757] text-white"
                      : "border border-border-subtle bg-surface text-muted hover:bg-base"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-bold text-muted md:block">Sort by:</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-xl border border-border-subtle bg-surface px-4 py-2.5 text-sm font-bold text-text-base outline-none"
              >
                {sorts.map((sort) => (
                  <option key={sort.key} value={sort.key}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-64 animate-pulse rounded-[32px] bg-surface" />
            ))}
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[32px] border border-border-subtle bg-surface py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-base text-muted">
              <FolderDot size={40} />
            </div>
            <h2 className="text-2xl font-bold text-text-base">No projects found</h2>
            <p className="mt-2 text-muted">Create a project from the button above.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCard key={project._id} project={project} onEdit={openEditModal} onDelete={setDeletingProjectId} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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
                    onChange={(event) => setNewProjectName(event.target.value)}
                    disabled={creating}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                    placeholder="e.g. Apollo Mission"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newProjectDescription}
                    onChange={(event) => setNewProjectDescription(event.target.value)}
                    disabled={creating}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                    placeholder="Short summary of the workspace."
                  />
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
                    onChange={(event) => setUpdatedName(event.target.value)}
                    disabled={updating}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-muted">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={updatedDescription}
                    onChange={(event) => setUpdatedDescription(event.target.value)}
                    disabled={updating}
                    className="w-full rounded-2xl border border-border-subtle bg-base px-5 py-4 text-text-base outline-none"
                  />
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
