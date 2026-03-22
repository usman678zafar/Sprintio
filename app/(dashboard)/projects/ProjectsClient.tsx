"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    CalendarDays,
    FolderDot,
    LayoutGrid,
    List,
    MoreVertical,
    Pencil,
    Plus,
    SlidersHorizontal,
    Trash2,
    Users,
    CheckCircle2,
    Clock,
    ArrowRight,
} from "lucide-react";

type Project = {
    _id: string;
    name: string;
    memberCount: number;
    taskCount: number;
    description?: string;
    createdAt?: string;
};

type FilterKey = "all" | "active" | "completed" | "archived";
type ViewMode = "grid" | "list";
type SortMode = "recent" | "name" | "tasks";

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

const themePalette = [
    { bg: "bg-brand/10 dark:bg-brand/5", text: "text-brand", accent: "bg-brand", border: "border-primary/15" },
    { bg: "bg-emerald-50", text: "text-emerald-600", accent: "bg-emerald-600", border: "border-emerald-100" },
    { bg: "bg-violet-50", text: "text-violet-600", accent: "bg-violet-600", border: "border-violet-100" },
    { bg: "bg-amber-50", text: "text-amber-600", accent: "bg-amber-600", border: "border-amber-100" },
    { bg: "bg-rose-50", text: "text-rose-600", accent: "bg-rose-600", border: "border-rose-100" },
];

function formatDate(dateString?: string) {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function ProjectCard({
    project,
    index,
    onEdit,
    onDelete
}: {
    project: Project;
    index: number;
    onEdit: (p: Project) => void;
    onDelete: (id: string) => void;
}) {
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const theme = themePalette[index % themePalette.length];

    // Simulated progress logic based on tasks (for visual richness)
    const progress = project.taskCount === 0 ? 0 : Math.min(100, (project.taskCount * 14) % 101);
    const isCompleted = progress === 100 && project.taskCount > 0;

    return (
        <div
            onClick={() => router.push(`/project/${project._id}`)}
            className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-border-subtle bg-[var(--color-light-surface)] p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 focus-within:ring-4 focus-within:ring-brand/20"
        >
            {/* Accent Bar */}
            <div className={`absolute left-0 top-0 h-1.5 w-full ${theme.accent}`} />

            <div className="flex items-start justify-between gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${theme.bg} ${theme.text}`}>
                    <FolderDot size={24} strokeWidth={2.5} />
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                }}
                            />
                            <div className="absolute right-0 top-11 z-20 w-48 rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] p-2 shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => {
                                        onEdit(project);
                                        setShowMenu(false);
                                    }}
                                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-[var(--color-light-bg)]"
                                >
                                    <Pencil size={18} className="text-muted" />
                                    Rename Project
                                </button>
                                <div className="my-1 h-px bg-surface" />
                                <button
                                    onClick={() => {
                                        onDelete(project._id);
                                        setShowMenu(false);
                                    }}
                                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                    <Trash2 size={18} className="text-red-400" />
                                    Delete Project
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-5">
                <h3 className="text-xl font-bold tracking-tight text-muted group-hover:text-primary transition-colors">
                    {project.name}
                </h3>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-border-subtle bg-[var(--color-light-bg)]">
                    <CheckCircle2 size={12} className="text-muted" />
                    <span>{project.taskCount} Tasks</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-border-subtle bg-[var(--color-light-bg)]">
                    <Users size={12} className="text-muted" />
                    <span>{project.memberCount} Members</span>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-muted">Progress</span>
                    <span className={isCompleted ? "text-emerald-600" : "text-neutral-800 dark:text-neutral-200"}>
                        {progress}%
                    </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? "bg-emerald-500" : theme.accent}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-5">
                <div className="flex items-center gap-2 text-xs font-bold text-muted">
                    <Clock size={14} />
                    {formatDate(project.createdAt)}
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-light-bg)] text-muted transition-all group-hover:bg-primary group-hover:text-white">
                    <ArrowRight size={18} />
                </div>
            </div>
        </div>
    );
}

function ProjectListItem({
    project,
    index,
    onEdit,
    onDelete
}: {
    project: Project;
    index: number;
    onEdit: (p: Project) => void;
    onDelete: (id: string) => void;
}) {
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const theme = themePalette[index % themePalette.length];

    return (
        <div
            onClick={() => router.push(`/project/${project._id}`)}
            className="group flex flex-col gap-4 rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] p-4 transition-all hover:border-primary/30 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.bg} ${theme.text}`}>
                    <FolderDot size={20} />
                </div>
                <div className="min-w-0">
                    <h3 className="truncate font-bold text-muted group-hover:text-primary transition-colors">
                        {project.name}
                    </h3>
                    <p className="text-xs text-muted">{formatDate(project.createdAt)}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 sm:justify-end">
                <div className="flex items-center gap-2 text-sm font-medium text-muted">
                    <CheckCircle2 size={16} className="text-muted" />
                    <span>{project.taskCount} Tasks</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted">
                    <Users size={16} className="text-muted" />
                    <span>{project.memberCount} Members</span>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-[var(--color-light-bg)]"
                    >
                        <MoreVertical size={18} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-11 z-20 w-48 rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => { onEdit(project); setShowMenu(false); }}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-muted hover:bg-[var(--color-light-bg)]"
                            >
                                <Pencil size={16} />
                                Rename
                            </button>
                            <button
                                onClick={() => { onDelete(project._id); setShowMenu(false); }}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [updatedName, setUpdatedName] = useState("");
    const [updating, setUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterKey>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sortMode, setSortMode] = useState<SortMode>("recent");

    const fetchProjects = async () => {
        try {
            const res = await fetch("/api/projects");
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects);
            }
        } catch (error) {
            console.error(error);
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

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newProjectName }),
            });
            if (res.ok) {
                setNewProjectName("");
                setShowModal(false);
                fetchProjects();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject || !updatedName.trim()) return;
        setUpdating(true);
        try {
            const res = await fetch(`/api/projects/${editingProject._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: updatedName }),
            });
            if (res.ok) {
                setEditingProject(null);
                setUpdatedName("");
                fetchProjects();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;
        try {
            const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
            if (res.ok) fetchProjects();
        } catch (error) {
            console.error(error);
        }
    };

    const visibleProjects = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        let filtered = projects.filter(p =>
            !query || p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
        );

        // Simulated filter logic (can be expanded with real status in DB)
        if (filter === "completed") filtered = filtered.filter(p => (p.taskCount * 14) % 101 === 100 && p.taskCount > 0);
        if (filter === "active") filtered = filtered.filter(p => (p.taskCount * 14) % 101 < 100 || p.taskCount === 0);

        if (sortMode === "name") return filtered.sort((a, b) => a.name.localeCompare(b.name));
        if (sortMode === "tasks") return filtered.sort((a, b) => b.taskCount - a.taskCount);
        return filtered.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    }, [projects, searchQuery, filter, sortMode]);

    return (
        <div className="min-h-full bg-base px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-7xl">
                {/* Header Section */}
                <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-muted sm:text-4xl">
                            Project Portfolio
                        </h1>
                        <p className="mt-3 text-lg font-medium text-muted">
                            Overview of all your active workspaces and team missions.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            className="btn-primary px-4 py-2.5"
                        >
                            <Plus size={18} />
                            Add New Project
                        </button>
                        <div className="flex h-11 items-center rounded-full border border-border-subtle bg-[var(--color-light-surface)] p-1 shadow-sm">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`flex h-9 w-12 items-center justify-center rounded-full transition-all duration-300 ${viewMode === "grid" ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-neutral-600 dark:text-neutral-400"}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`flex h-9 w-12 items-center justify-center rounded-full transition-all duration-300 ${viewMode === "list" ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-neutral-600 dark:text-neutral-400"}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Toolbar Section */}
                <section className="sticky top-0 z-30 mb-8 border-y border-border-subtle bg-base/80 py-4 backdrop-blur-md">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            {filters.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all shadow-sm ${filter === f.key
                                        ? "bg-primary text-white shadow-primary/20"
                                        : "bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)]/60 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800/50 hover:border-neutral-300 dark:border-neutral-700 hover:bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] backdrop-blur-sm"
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="hidden text-sm font-bold text-muted md:block">Sort by:</span>
                            <select
                                value={sortMode}
                                onChange={(e) => setSortMode(e.target.value as SortMode)}
                                className="rounded-xl border border-border-subtle bg-[var(--color-light-surface)] px-4 py-2.5 text-sm font-bold text-muted outline-none focus:border-primary"
                            >
                                {sorts.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Grid Section */}
                {loading ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 animate-pulse rounded-[32px] bg-surface" />
                        ))}
                    </div>
                ) : visibleProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-border-subtle bg-[var(--color-light-surface)] py-24 text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-light-bg)] text-muted">
                            <FolderDot size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-muted">No projects found</h2>
                        <p className="mt-2 text-muted">Try adjusting your search or filters.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary mt-8 px-8 py-3 text-sm font-bold"
                        >
                            Create First Project
                        </button>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleProjects.map((project, index) => (
                            <ProjectCard
                                key={project._id}
                                project={project}
                                index={index}
                                onEdit={(p: Project) => {
                                    setEditingProject(p);
                                    setUpdatedName(p.name);
                                }}
                                onDelete={handleDeleteProject}
                            />
                        ))}

                        <button
                            onClick={() => setShowModal(true)}
                            className="group flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border-subtle bg-[var(--color-light-surface)] p-8 text-center transition-all hover:border-primary hover:bg-brand/10"
                        >
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-light-bg)] text-muted group-hover:bg-primary group-hover:text-white transition-all">
                                <Plus size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-muted">New Project</h3>
                            <p className="mt-2 text-sm text-muted max-w-[180px]">Establish a new workspace and invite collaborators.</p>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {visibleProjects.map((project, index) => (
                            <ProjectListItem
                                key={project._id}
                                project={project}
                                index={index}
                                onEdit={(p: Project) => {
                                    setEditingProject(p);
                                    setUpdatedName(p.name);
                                }}
                                onDelete={handleDeleteProject}
                            />
                        ))}

                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-subtle bg-[var(--color-light-surface)] p-6 transition-all hover:border-primary hover:bg-brand/10"
                        >
                            <Plus size={20} className="text-muted" />
                            <span className="font-bold text-muted">Add New Project</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 animate-in fade-in">
                    <div className="modal-surface w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
                        <h3 className="text-2xl font-bold text-muted">Create Workspace</h3>
                        <p className="mt-2 text-muted">A new environment for your team to thrive.</p>
                        <form onSubmit={handleCreateProject} className="mt-8">
                            <div className="mb-8">
                                <label className="mb-2 block text-sm font-bold text-muted uppercase tracking-wider">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-bg)] px-5 py-4 text-muted outline-none transition focus:border-primary"
                                    placeholder="e.g. Apollo Mission 🚀"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    disabled={creating}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-danger flex-1 px-6 py-4 font-bold" disabled={creating}>Discard</button>
                                <button type="submit" disabled={creating} className="btn-success flex-1 px-6 py-4 font-bold">
                                    {creating ? "Launching..." : "Launch Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 animate-in fade-in">
                    <div className="modal-surface w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
                        <h3 className="text-2xl font-bold text-muted">Rename Workspace</h3>
                        <form onSubmit={handleUpdateProject} className="mt-8">
                            <div className="mb-8">
                                <label className="mb-2 block text-sm font-bold text-muted uppercase tracking-wider">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-bg)] px-5 py-4 text-muted outline-none transition focus:border-primary"
                                    value={updatedName}
                                    onChange={(e) => setUpdatedName(e.target.value)}
                                    disabled={updating}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setEditingProject(null)} className="btn-danger flex-1 px-6 py-4 font-bold" disabled={updating}>Cancel</button>
                                <button type="submit" disabled={updating} className="btn-warning flex-1 px-6 py-4 font-bold">
                                    {updating ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

