"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";

type Project = {
  _id: string;
  name: string;
  memberCount: number;
  taskCount: number;
  description?: string;
  createdAt?: string;
};

type StatusTone = "progress" | "risk" | "planning";

const teamPalette = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
];

const mockTeam = [
  { name: "Sarah Jones", status: "Online" },
  { name: "Mark Thompson", status: "Away" },
  { name: "Emily White", status: "Online" },
];

function clampProgress(value: number) {
  return Math.max(10, Math.min(88, value));
}

function getProjectTone(project: Project): {
  label: string;
  tone: StatusTone;
  progress: number;
  timeline: string;
} {
  if (project.taskCount === 0) {
    return {
      label: "Planning",
      tone: "planning",
      progress: 10,
      timeline: "Starts next week",
    };
  }

  if (project.taskCount < 3) {
    return {
      label: "At Risk",
      tone: "risk",
      progress: clampProgress(22 + project.memberCount * 5),
      timeline: "Overdue 2 days",
    };
  }

  return {
    label: "In Progress",
    tone: "progress",
    progress: clampProgress(46 + project.taskCount * 6),
    timeline: "Due in 5 days",
  };
}

function getToneClasses(tone: StatusTone) {
  if (tone === "risk") {
    return {
      badge: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      accent: "text-amber-600",
    };
  }

  if (tone === "planning") {
    return {
      badge: "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      accent: "text-slate-400",
    };
  }

  return {
    badge: "bg-blue-50 text-primary",
    bar: "bg-primary",
    accent: "text-slate-500",
  };
}

function getProjectSummary(project: Project) {
  if (project.description?.trim()) {
    return project.description;
  }

  return `Coordinating deliverables, ownership, and task progress for ${project.name}.`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [updatedName, setUpdatedName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

    const handleAddProject = () => {
      setShowModal(true);
    };

    window.addEventListener("dashboard-search", handleSearch as EventListener);
    window.addEventListener("dashboard-add-project", handleAddProject);

    return () => {
      window.removeEventListener(
        "dashboard-search",
        handleSearch as EventListener
      );
      window.removeEventListener("dashboard-add-project", handleAddProject);
    };
  }, []);

  useEffect(() => {
    const handleCloseMenus = () => setOpenMenuId(null);

    window.addEventListener("click", handleCloseMenus);
    return () => window.removeEventListener("click", handleCloseMenus);
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
    if (!updatedName.trim() || !editingProject) return;

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
    if (
      !confirm(
        "Are you sure you want to delete this project? This will remove all tasks and member associations."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

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

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return projects;

    return projects.filter((project) => {
      const summary = getProjectSummary(project).toLowerCase();
      return (
        project.name.toLowerCase().includes(query) || summary.includes(query)
      );
    });
  }, [projects, searchQuery]);

  const metrics = useMemo(() => {
    const totalTasks = projects.reduce(
      (sum, project) => sum + project.taskCount,
      0
    );
    const activeProjects = projects.length;
    const upcomingDeadlines =
      projects.length === 0
        ? 0
        : Math.min(3, Math.max(1, Math.ceil(totalTasks / 4)));
    const efficiency =
      projects.length === 0 ? 0 : Math.min(98, 84 + activeProjects * 2);

    return { totalTasks, activeProjects, upcomingDeadlines, efficiency };
  }, [projects]);

  const featuredProjects = filteredProjects.slice(0, 3);

  const recentActivity = useMemo(() => {
    const fallback = [
      {
        text: "Alex Chen completed the User Dashboard Mockup task.",
        meta: "2 hours ago",
        color: "bg-blue-500",
      },
      {
        text: "New project Q4 Marketing Campaign was created by Admin.",
        meta: "5 hours ago",
        color: "bg-slate-300",
      },
      {
        text: "Deadline for API Documentation was moved to tomorrow.",
        meta: "Yesterday at 4:30 PM",
        color: "bg-amber-500",
      },
    ];

    if (projects.length === 0) return fallback;

    return projects.slice(0, 3).map((project, index) => ({
      text:
        index === 0
          ? `${session?.user?.name || "Admin"} is leading ${project.name}.`
          : index === 1
            ? `${project.name} has ${project.taskCount} active tracked tasks.`
            : `${project.name} currently has ${project.memberCount} team members assigned.`,
      meta:
        index === 0
          ? "2 hours ago"
          : index === 1
            ? "5 hours ago"
            : "Yesterday at 4:30 PM",
      color:
        index === 2 ? "bg-amber-500" : index === 1 ? "bg-slate-300" : "bg-blue-500",
    }));
  }, [projects, session?.user?.name]);

  const teamMembers = useMemo(() => {
    return [
      {
        name: session?.user?.name || "Sarah Jones",
        status: "Online",
      },
      ...mockTeam.slice(0, 2),
    ];
  }, [session?.user?.name]);

  const noResults =
    !loading && filteredProjects.length === 0 && projects.length > 0;

  return (
    <div className="min-h-full bg-[#f6f8fc] px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <div className="mx-auto w-full max-w-[1040px]">
      <section className="grid gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total Tasks",
            value: metrics.totalTasks,
            chip: "+12%",
            chipClass: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Active Projects",
            value: metrics.activeProjects,
            chip: "Steady",
            chipClass: "bg-blue-50 text-primary",
          },
          {
            label: "Upcoming Deadlines",
            value: metrics.upcomingDeadlines,
            chip: "Attention",
            chipClass: "bg-amber-50 text-amber-600",
          },
          {
            label: "Team Efficiency",
            value: `${metrics.efficiency}%`,
            chip: "+4%",
            chipClass: "bg-emerald-50 text-emerald-600",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)]"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-3xl font-semibold tracking-tight text-slate-950">
                {card.value}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${card.chipClass}`}
              >
                {card.chip}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Active Projects
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Focused delivery across your most important workspaces.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("active-projects")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="text-base font-medium text-primary transition hover:text-blue-700"
          >
            View All Projects
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-500 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            Loading dashboard...
          </div>
        ) : noResults ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <p className="text-xl font-semibold text-slate-900">
              No projects match "{searchQuery}"
            </p>
            <p className="mt-2 text-slate-500">
              Try a different search term from the top bar.
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <p className="text-xl font-semibold text-slate-900">
              No projects yet
            </p>
            <p className="mt-2 text-slate-500">
              Use the Add New Project button to create your first workspace.
            </p>
          </div>
        ) : (
          <div id="active-projects" className="grid gap-5 xl:grid-cols-3">
            {featuredProjects.map((project, index) => {
              const tone = getProjectTone(project);
              const toneClasses = getToneClasses(tone.tone);
              const avatarCount = Math.max(Math.min(project.memberCount, 2), 1);
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
                  className="cursor-pointer rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] ${toneClasses.badge}`}
                    >
                      {tone.label}
                    </span>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId(
                            openMenuId === project._id ? null : project._id
                          );
                        }}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                        aria-label={`Open actions for ${project.name}`}
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {openMenuId === project._id && (
                        <div
                          className="absolute right-0 top-12 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProject(project);
                              setUpdatedName(project.name);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
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
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                            Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/project/${project._id}`} className="mt-5 block">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {project.name}
                    </h2>
                    <p className="mt-3 min-h-12 text-base leading-7 text-slate-500">
                      {getProjectSummary(project)}
                    </p>

                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between text-sm font-medium text-slate-600">
                        <span>Progress</span>
                        <span>{tone.progress}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${toneClasses.bar}`}
                          style={{ width: `${tone.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div className="flex items-center">
                        {Array.from({ length: avatarCount }).map((_, avatarIndex) => (
                          <span
                            key={`${project._id}-avatar-${avatarIndex}`}
                            className={`-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-semibold first:ml-0 ${teamPalette[(index + avatarIndex) % teamPalette.length]}`}
                          >
                            {project.name.charAt(avatarIndex).toUpperCase() || "P"}
                          </span>
                        ))}
                        {extraMembers > 0 && (
                          <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-500">
                            +{extraMembers}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${toneClasses.accent}`}
                      >
                        {tone.timeline}
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Recent Activity
          </h2>
          <div className="mt-6 space-y-6">
            {recentActivity.map((item) => (
              <div key={`${item.text}-${item.meta}`} className="flex gap-4">
                <span
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`}
                />
                <div>
                  <p className="text-base leading-7 text-slate-900">{item.text}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Team Status
          </h2>
          <div className="mt-6 space-y-5">
            {teamMembers.map((member, index) => (
              <div key={`${member.name}-${index}`} className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${teamPalette[index % teamPalette.length]}`}
                  >
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      member.status === "Online" ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-slate-900">{member.name}</p>
                </div>
                <span className="text-sm text-slate-400">{member.status}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-6 flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Manage Team
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-primary">
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Workload Trend
              </h3>
              <p className="text-sm text-slate-500">Current delivery pace</p>
            </div>
          </div>
          <div className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {metrics.activeProjects === 0
              ? "0%"
              : `${Math.min(24 + metrics.totalTasks * 3, 89)}%`}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Healthy momentum across active projects with balanced task ownership.
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <CalendarDays size={22} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Priority Window
              </h3>
              <p className="text-sm text-slate-500">Deadlines to watch</p>
            </div>
          </div>
          <div className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {metrics.upcomingDeadlines}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Projects currently flagged for closer deadline coordination this week.
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Team Coverage
              </h3>
              <p className="text-sm text-slate-500">Assigned collaborators</p>
            </div>
          </div>
          <div className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            {projects.reduce((sum, project) => sum + project.memberCount, 0)}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Combined member assignments across all workspaces currently in view.
          </p>
        </div>
      </section>

      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <h3 className="text-2xl font-semibold text-slate-950">
              Create New Project
            </h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-6 mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl px-4 py-3 font-medium text-slate-500 transition hover:bg-slate-50"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <h3 className="text-2xl font-semibold text-slate-950">
              Edit Project
            </h3>
            <form onSubmit={handleUpdateProject}>
              <div className="mb-6 mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                  value={updatedName}
                  onChange={(e) => setUpdatedName(e.target.value)}
                  disabled={updating}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="rounded-2xl px-4 py-3 font-medium text-slate-500 transition hover:bg-slate-50"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
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
