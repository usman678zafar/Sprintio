"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Code2,
  FileText,
  LayoutGrid,
  LineChart,
  List,
  MoreVertical,
  Palette,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  UsersRound,
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
type StatusKey = "active" | "completed" | "archived";

type DecoratedProject = Project & {
  status: StatusKey;
  badge: string;
  badgeClass: string;
  progress: number;
  progressClass: string;
  dueDate: string;
  summary: string;
  heroClass: string;
  accentClass: string;
  heroIcon: typeof Code2;
};

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

const heroThemes = [
  {
    heroClass: "bg-[linear-gradient(135deg,#12202f_0%,#314558_100%)]",
    accentClass: "text-blue-600",
    heroIcon: Code2,
  },
  {
    heroClass: "bg-[linear-gradient(135deg,#eef5ff_0%,#d9e7ff_100%)]",
    accentClass: "text-emerald-600",
    heroIcon: LineChart,
  },
  {
    heroClass: "bg-[linear-gradient(135deg,#f4dcc2_0%,#f9ecd9_100%)]",
    accentClass: "text-amber-600",
    heroIcon: Palette,
  },
  {
    heroClass: "bg-[linear-gradient(135deg,#e9f0f7_0%,#f7f9fc_100%)]",
    accentClass: "text-blue-600",
    heroIcon: UsersRound,
  },
  {
    heroClass: "bg-[linear-gradient(135deg,#fde7d8_0%,#fff2ea_100%)]",
    accentClass: "text-emerald-600",
    heroIcon: FileText,
  },
];

const avatarPalette = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
];

function dueDateLabel(project: Project, index: number) {
  const date = project.createdAt ? new Date(project.createdAt) : new Date();
  date.setDate(date.getDate() + [16, 24, 31, 12, 28][index % 5]);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function summary(project: Project, index: number) {
  if (project.description?.trim()) return project.description;
  const summaries = [
    `Refreshing ${project.name} with sharper UX, cleaner workflows, and clearer team handoff.`,
    `Expanding ${project.name} into a launch-ready experience with tighter structure and delivery pacing.`,
    `Organizing ${project.name} for stronger execution across design, review, and internal approvals.`,
    `Improving ${project.name} with clearer ownership, more visible milestones, and better documentation.`,
    `Building out ${project.name} so the team can ship faster with fewer blockers and cleaner planning.`,
  ];
  return summaries[index % summaries.length];
}

function decorate(project: Project, index: number): DecoratedProject {
  const theme = heroThemes[index % heroThemes.length];
  const status: StatusKey =
    project.taskCount === 0 || index % 5 === 2
      ? "archived"
      : index % 2 === 1
        ? "completed"
        : "active";

  return {
    ...project,
    status,
    badge:
      status === "completed"
        ? "Completed"
        : status === "archived"
          ? "On Hold"
          : "In Progress",
    badgeClass:
      status === "completed"
        ? "bg-emerald-500 text-white"
        : status === "archived"
          ? "bg-amber-400 text-white"
          : "bg-primary text-white",
    progress:
      status === "completed"
        ? 100
        : status === "archived"
          ? Math.max(8, Math.min(36, 12 + project.taskCount * 4))
          : Math.max(42, Math.min(86, 48 + project.taskCount * 5)),
    progressClass:
      status === "completed"
        ? "bg-emerald-500"
        : status === "archived"
          ? "bg-amber-400"
          : "bg-primary",
    dueDate: dueDateLabel(project, index),
    summary: summary(project, index),
    heroClass: theme.heroClass,
    accentClass: theme.accentClass,
    heroIcon: theme.heroIcon,
  };
}

function Hero({ project }: { project: DecoratedProject }) {
  const HeroIcon = project.heroIcon;
  return (
    <div className={`relative h-56 overflow-hidden rounded-t-[28px] ${project.heroClass}`}>
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-8 top-10 h-28 w-20 rounded-[22px] bg-white/15 shadow-xl" />
        <div className="absolute left-32 top-16 h-36 w-24 rounded-[26px] bg-white/10 shadow-xl" />
        <div className="absolute bottom-10 right-10 h-16 w-16 rounded-2xl bg-white/20 shadow-lg" />
        <div className="absolute bottom-8 left-10 h-3 w-40 rounded-full bg-white/20" />
      </div>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
        <div className="rounded-2xl bg-white/85 p-3 text-slate-700 shadow-sm">
          <HeroIcon size={20} />
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${project.badgeClass}`}>
          {project.badge}
        </span>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail || "");
    };
    const handleAddProject = () => setShowModal(true);
    const closeMenus = () => {
      setOpenMenuId(null);
      setShowSortMenu(false);
    };

    window.addEventListener("projects-search", handleSearch as EventListener);
    window.addEventListener("projects-add-project", handleAddProject);
    window.addEventListener("click", closeMenus);

    return () => {
      window.removeEventListener("projects-search", handleSearch as EventListener);
      window.removeEventListener("projects-add-project", handleAddProject);
      window.removeEventListener("click", closeMenus);
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
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? This will remove all tasks and member associations.")) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProjects();
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const decorated = useMemo(() => projects.map((project, index) => decorate(project, index)), [projects]);

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = decorated.filter((project) => {
      const matchesFilter = filter === "all" ? true : project.status === filter;
      const matchesQuery =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.summary.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });

    if (sortMode === "name") return filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === "tasks") return filtered.sort((a, b) => b.taskCount - a.taskCount);
    return filtered.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  }, [decorated, filter, searchQuery, sortMode]);

  const activeCount = decorated.filter((project) => project.status === "active").length;
  const workspaceCount = Math.max(1, Math.min(4, Math.ceil(projects.length / 3)));
  const noMatches = !loading && visibleProjects.length === 0 && projects.length > 0;

  return (
    <div className="min-h-full bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1040px]">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Project Portfolio</h1>
          <p className="mt-2 text-sm text-slate-500">
            You have {activeCount} active project{activeCount === 1 ? "" : "s"} across {workspaceCount} workspace{workspaceCount === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setViewMode("grid")} className={`rounded-xl px-4 py-3 ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}>
              <LayoutGrid size={20} />
            </button>
            <button type="button" onClick={() => setViewMode("list")} className={`rounded-xl px-4 py-3 ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}>
              <List size={20} />
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowSortMenu((value) => !value);
              }}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <SlidersHorizontal size={18} />
              Filters
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-16 z-20 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" onClick={(event) => event.stopPropagation()}>
                {sorts.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setSortMode(option.key);
                      setShowSortMenu(false);
                    }}
                    className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium ${sortMode === option.key ? "bg-blue-50 text-primary" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 flex flex-wrap gap-3">
        {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              filter === option.key
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="mt-10 rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">Loading project portfolio...</div>
      ) : noMatches ? (
        <div className="mt-10 rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <p className="text-lg font-semibold text-slate-900">No projects match "{searchQuery}"</p>
          <p className="mt-2 text-slate-500">Try another search term or switch filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <section className="mt-10 grid gap-7 xl:grid-cols-3">
          {visibleProjects.map((project, index) => {
            const avatarCount = Math.max(Math.min(project.memberCount, 3), 1);
            const extraMembers = Math.max(project.memberCount - avatarCount, 0);
            return (
              <article
                key={project._id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/project/${project._id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/project/${project._id}`);
                  }
                }}
                className="cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <Hero project={project} />
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/project/${project._id}`} className="block">
                        <h2 className="truncate text-xl font-semibold tracking-tight text-slate-950">{project.name}</h2>
                      </Link>
                      <p className="mt-3 line-clamp-2 text-base leading-7 text-slate-500">{project.summary}</p>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId(openMenuId === project._id ? null : project._id);
                        }}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {openMenuId === project._id && (
                        <div className="absolute right-0 top-12 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProject(project);
                              setUpdatedName(project.name);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Pencil size={16} />
                            Edit Name
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDeleteProject(project._id);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                            Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-400">
                      <span>Progress</span>
                      <span className={project.accentClass}>{project.progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${project.progressClass}`} style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex items-center">
                      {Array.from({ length: avatarCount }).map((_, avatarIndex) => (
                        <span
                          key={`${project._id}-${avatarIndex}`}
                          className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-semibold first:ml-0 ${avatarPalette[(index + avatarIndex) % avatarPalette.length]}`}
                        >
                          {project.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      ))}
                      {extraMembers > 0 && (
                        <span className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-500">+{extraMembers}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                      <CalendarDays size={18} />
                      <span>{project.dueDate}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          <button type="button" onClick={() => setShowModal(true)} className="flex min-h-[380px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-300 bg-white px-6 py-8 text-center transition hover:border-primary hover:bg-blue-50/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary shadow-[0_18px_32px_rgba(15,23,42,0.12)]">
              <Plus size={28} />
            </div>
            <h3 className="mt-8 text-xl font-semibold tracking-tight text-slate-950">Create New Project</h3>
            <p className="mt-3 max-w-xs text-base leading-7 text-slate-500">Kickstart a fresh project and invite your team to collaborate.</p>
          </button>
        </section>
      ) : (
        <section className="mt-10 space-y-5">
          {visibleProjects.map((project, index) => (
            <article
              key={project._id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/project/${project._id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/project/${project._id}`);
                }
              }}
              className="flex cursor-pointer flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-4 focus:ring-blue-100 lg:flex-row"
            >
              <div className={`relative h-52 lg:h-auto lg:w-[300px] ${project.heroClass}`}>
                <div className="absolute left-6 top-6 rounded-2xl bg-white/85 p-3 text-slate-700 shadow-sm">
                  <project.heroIcon size={20} />
                </div>
                <span className={`absolute right-6 top-6 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${project.badgeClass}`}>{project.badge}</span>
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/project/${project._id}`} className="block">
                      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{project.name}</h2>
                    </Link>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">{project.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingProject(project);
                      setUpdatedName(project.name);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  >
                    Rename
                  </button>
                </div>
                <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                  <div>
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-400">
                      <span>Progress</span>
                      <span className={project.accentClass}>{project.progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${project.progressClass}`} style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center">
                    {Array.from({ length: Math.max(Math.min(project.memberCount, 3), 1) }).map((_, avatarIndex) => (
                      <span
                        key={`${project._id}-list-${avatarIndex}`}
                        className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-semibold first:ml-0 ${avatarPalette[(index + avatarIndex) % avatarPalette.length]}`}
                      >
                        {project.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                    <CalendarDays size={18} />
                    <span>{project.dueDate}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}

          <button type="button" onClick={() => setShowModal(true)} className="flex w-full items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-slate-300 bg-white px-6 py-6 text-base font-semibold text-slate-600 transition hover:border-primary hover:bg-blue-50/30">
            <Plus size={22} className="text-primary" />
            Create New Project
          </button>
        </section>
      )}

      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-950">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-6 mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-600">Project Name</label>
                <input type="text" required autoFocus className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100" placeholder="Enter project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} disabled={creating} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl px-4 py-3 font-medium text-slate-500 hover:bg-slate-50" disabled={creating}>Cancel</button>
                <button type="submit" disabled={creating} className="rounded-2xl bg-primary px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-70">{creating ? "Creating..." : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-950">Edit Project</h3>
            <form onSubmit={handleUpdateProject}>
              <div className="mb-6 mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-600">Project Name</label>
                <input type="text" required autoFocus className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100" value={updatedName} onChange={(e) => setUpdatedName(e.target.value)} disabled={updating} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingProject(null)} className="rounded-2xl px-4 py-3 font-medium text-slate-500 hover:bg-slate-50" disabled={updating}>Cancel</button>
                <button type="submit" disabled={updating} className="rounded-2xl bg-primary px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-70">{updating ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
