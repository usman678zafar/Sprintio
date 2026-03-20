"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  ListFilter,
  Plus,
  Tag,
  UserRound,
  X,
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon,
} from "lucide-react";

type ViewMode = "month" | "week" | "day";
type TaskStatus = "Pending" | "In Progress" | "Done";

interface CalendarProject {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  role: "MASTER" | "MEMBER";
  memberCount: number;
  taskCount: number;
  tag: string;
}

interface CalendarMember {
  _id: string;
  name: string;
  email: string;
  projectIds: string[];
}

interface CalendarTask {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  deadline: string;
  projectId: string;
  projectName: string;
  projectTag: string;
  canManage: boolean;
  canUpdate: boolean;
  isMine: boolean;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  } | null;
}

interface CalendarResponse {
  currentUserId: string;
  projects: CalendarProject[];
  members: CalendarMember[];
  tasks: CalendarTask[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TASK_COLORS = [
  {
    surface: "bg-blue-50 border-blue-100",
    dot: "bg-blue-500",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    surface: "bg-emerald-50 border-emerald-100",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    surface: "bg-amber-50 border-amber-100",
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    surface: "bg-violet-50 border-violet-100",
    dot: "bg-violet-500",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    surface: "bg-rose-50 border-rose-100",
    dot: "bg-rose-500",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
  },
];

const DEFAULT_TASK_FORM = {
  projectId: "",
  title: "",
  description: "",
  assignedTo: "",
  deadline: "",
  status: "Pending" as TaskStatus,
};

function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(value: Date) {
  const next = startOfDay(value);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function getMonthGrid(value: Date) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatWeekLabel(value: Date) {
  const start = startOfWeek(value);
  const end = addDays(start, 6);

  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString("en-US", {
      month: "long",
    })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatDayLabel(value: Date) {
  return value.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDeadline(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getStatusTone(status: TaskStatus) {
  if (status === "Done") return "bg-emerald-100 text-emerald-700";
  if (status === "In Progress") return "bg-blue-100 text-primary";
  return "bg-amber-100 text-amber-700";
}

function getPriority(task: CalendarTask) {
  if (task.status === "Done") {
    return { label: "Low", tone: "text-emerald-600" };
  }

  const diff = Math.ceil(
    (startOfDay(new Date(task.deadline)).getTime() - startOfDay(new Date()).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  if (diff <= 3) return { label: "High", tone: "text-red-500" };
  if (diff <= 7) return { label: "Medium", tone: "text-amber-600" };
  return { label: "Planned", tone: "text-blue-600" };
}

export default function CalendarPage() {
  const today = useMemo(() => startOfDay(new Date()), []);

  const [projects, setProjects] = useState<CalendarProject[]>([]);
  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDayKey, setSelectedDayKey] = useState(toDateKey(today));

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedMemberId, setSelectedMemberId] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);

  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
  const [taskMessage, setTaskMessage] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchCalendar = async () => {
    try {
      const response = await fetch("/api/calendar");
      if (!response.ok) return;

      const data: CalendarResponse = await response.json();
      setProjects(data.projects);
      setMembers(data.members);
      setTasks(data.tasks);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail || "");
    };

    const handleAddTask = () => {
      openCreateTaskModal();
    };

    window.addEventListener("calendar-search", handleSearch as EventListener);
    window.addEventListener("calendar-add-task", handleAddTask);

    return () => {
      window.removeEventListener("calendar-search", handleSearch as EventListener);
      window.removeEventListener("calendar-add-task", handleAddTask);
    };
  }, [selectedProjectId, projects]);

  const projectColorIndex = useMemo(() => {
    return new Map(projects.map((project, index) => [project._id, index % TASK_COLORS.length]));
  }, [projects]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.projectName.toLowerCase().includes(query) ||
        task.projectTag.toLowerCase().includes(query) ||
        (task.assignedTo?.name || "").toLowerCase().includes(query);

      const matchesProject =
        selectedProjectId === "all" || task.projectId === selectedProjectId;
      const matchesMember =
        selectedMemberId === "all" || task.assignedTo?._id === selectedMemberId;
      const matchesTag = selectedTag === "all" || task.projectTag === selectedTag;
      const matchesMine = !onlyMine || task.isMine;

      return matchesQuery && matchesProject && matchesMember && matchesTag && matchesMine;
    });
  }, [onlyMine, searchQuery, selectedMemberId, selectedProjectId, selectedTag, tasks]);

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, CalendarTask[]>();

    filteredTasks.forEach((task) => {
      const key = toDateKey(task.deadline);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(task);
    });

    grouped.forEach((value) => {
      value.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    });

    return grouped;
  }, [filteredTasks]);

  const monthDays = useMemo(() => getMonthGrid(currentDate), [currentDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [currentDate]);

  const selectedDate = useMemo(() => new Date(selectedDayKey), [selectedDayKey]);
  const selectedDayTasks = useMemo(
    () => tasksByDate.get(selectedDayKey) || [],
    [selectedDayKey, tasksByDate]
  );

  const upcomingDeadlines = useMemo(() => {
    const start = startOfDay(new Date()).getTime();
    return filteredTasks
      .filter((task) => new Date(task.deadline).getTime() >= start)
      .slice(0, 3);
  }, [filteredTasks]);

  const visibleTags = useMemo(
    () => Array.from(new Set(projects.map((project) => project.tag))).sort(),
    [projects]
  );

  const manageableProjects = useMemo(
    () => projects.filter((project) => project.role === "MASTER"),
    [projects]
  );

  const assignableMembers = useMemo(() => {
    if (!taskForm.projectId) return [];
    return members.filter((member) => member.projectIds.includes(taskForm.projectId));
  }, [members, taskForm.projectId]);

  const headerLabel =
    viewMode === "month"
      ? formatMonthLabel(currentDate)
      : viewMode === "week"
        ? formatWeekLabel(currentDate)
        : formatDayLabel(currentDate);

  const openCreateTaskModal = (initialDate?: string) => {
    const defaultProjectId =
      selectedProjectId !== "all" &&
        manageableProjects.some((project) => project._id === selectedProjectId)
        ? selectedProjectId
        : manageableProjects[0]?._id || "";

    setTaskMessage("");
    setTaskForm({
      ...DEFAULT_TASK_FORM,
      projectId: defaultProjectId,
      deadline: initialDate || "",
    });
    setShowTaskModal(true);
  };

  const closeCreateTaskModal = () => {
    setShowTaskModal(false);
    setTaskForm(DEFAULT_TASK_FORM);
    setTaskMessage("");
  };

  const handleNavigate = (direction: "prev" | "next") => {
    const step = direction === "prev" ? -1 : 1;

    if (viewMode === "month") {
      const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + step, 1);
      setCurrentDate(next);
      return;
    }

    const next = addDays(currentDate, viewMode === "week" ? step * 7 : step);
    setCurrentDate(next);
    setSelectedDayKey(toDateKey(next));
  };

  const handleToday = () => {
    setCurrentDate(today);
    setSelectedDayKey(toDateKey(today));
  };

  const handleSelectDay = (value: Date) => {
    setCurrentDate(value);
    setSelectedDayKey(toDateKey(value));
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!taskForm.projectId || !taskForm.title.trim() || !taskForm.deadline) {
      setTaskMessage("Project, task title, and deadline are required.");
      return;
    }

    setCreatingTask(true);
    setTaskMessage("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: taskForm.projectId,
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          assignedTo: taskForm.assignedTo || undefined,
          deadline: taskForm.deadline,
          status: taskForm.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setTaskMessage(data.message || "Failed to create task.");
        return;
      }

      closeCreateTaskModal();
      const nextDate = new Date(taskForm.deadline);
      setCurrentDate(nextDate);
      setSelectedDayKey(toDateKey(nextDate));
      setViewMode("month");
      setLoading(true);
      await fetchCalendar();
    } catch (error) {
      console.error(error);
      setTaskMessage("Failed to create task.");
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1240px]">
        {/* Header Section */}
        <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <CalendarDays size={20} className="md:h-6 md:w-6" />
              <span className="text-sm font-black uppercase tracking-widest text-primary/70">Planner</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              {selectedProjectId === "all"
                ? "Organization View"
                : projects.find((project) => project._id === selectedProjectId)?.name || "Project View"}
            </h1>
            <p className="mt-2 text-base font-medium text-slate-500">
              Manage sprints, deadlines, and multi-team scheduling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold capitalize transition-all ${viewMode === mode
                      ? "bg-slate-900 text-white shadow-xl"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition lg:hidden"
            >
              <ListFilter size={20} />
            </button>
          </div>
        </section>

        {/* View Grid */}
        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Navigation Strip */}
            <div className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleNavigate("prev")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-lg font-black text-slate-900 md:text-xl">
                  {headerLabel}
                </h2>
                <button
                  onClick={() => handleNavigate("next")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button
                onClick={handleToday}
                className="rounded-xl px-4 py-2 text-sm font-black uppercase tracking-widest text-primary hover:bg-blue-50 transition"
              >
                Today
              </button>
            </div>

            {/* Calendar Main Core */}
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-primary" />
                  <p className="mt-4 font-bold">Synchronizing...</p>
                </div>
              ) : viewMode === "month" ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                      {DAY_LABELS.map(label => (
                        <div key={label} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {monthDays.map((day) => {
                        const key = toDateKey(day);
                        const dayTasks = tasksByDate.get(key) || [];
                        const inMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = isSameDay(day, today);
                        const isSelected = key === selectedDayKey;

                        return (
                          <div
                            key={key}
                            onClick={() => handleSelectDay(day)}
                            className={`min-h-[140px] border-b border-r border-slate-100 p-3 transition-all hover:bg-slate-50/50 cursor-pointer ${inMonth ? "bg-white" : "bg-slate-50/30"} ${isSelected ? "bg-blue-50/30" : ""}`}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black transition-all ${isToday ? "bg-primary text-white shadow-lg shadow-primary/20" : inMonth ? "text-slate-900" : "text-slate-300"}`}>
                                {day.getDate()}
                              </span>
                              {dayTasks.length > 0 && (
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {dayTasks.slice(0, 2).map((task) => {
                                const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                                return (
                                  <div
                                    key={task._id}
                                    className={`truncate rounded-lg border px-2 py-1 text-[10px] font-bold ${color.surface} ${color.text} border-transparent`}
                                  >
                                    {task.title}
                                  </div>
                                );
                              })}
                              {dayTasks.length > 2 && (
                                <div className="px-1 text-[9px] font-black uppercase text-slate-400">
                                  +{dayTasks.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : viewMode === "week" ? (
                <div className="grid divide-x divide-slate-100 md:grid-cols-7">
                  {weekDays.map(day => {
                    const key = toDateKey(day);
                    const dayTasks = tasksByDate.get(key) || [];
                    const isToday = isSameDay(day, today);
                    return (
                      <div key={key} className="min-h-[500px] p-4 bg-white hover:bg-slate-50/30 transition">
                        <div className={`mb-6 rounded-2xl p-3 text-center ${isToday ? "bg-primary text-white shadow-xl shadow-primary/10" : "bg-slate-50"}`}>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? "text-white/70" : "text-slate-400"}`}>{DAY_LABELS[day.getDay()]}</p>
                          <p className="mt-1 text-xl font-black">{day.getDate()}</p>
                        </div>
                        <div className="space-y-3">
                          {dayTasks.map(task => {
                            const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                            return (
                              <div
                                key={task._id}
                                onClick={() => setSelectedTask(task)}
                                className={`cursor-pointer rounded-2xl border border-slate-100 p-3 transition shadow-sm hover:shadow-md ${color.surface}`}
                              >
                                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400 mb-1">{task.projectTag}</p>
                                <p className={`text-xs font-bold leading-tight ${color.text}`}>{task.title}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Detailed Report</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-900">{formatDayLabel(selectedDate)}</h3>
                    </div>
                    <button
                      onClick={() => openCreateTaskModal(selectedDayKey)}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 transition-all hover:scale-110 active:scale-95"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  {selectedDayTasks.length === 0 ? (
                    <div className="py-20 text-center">
                      <CalendarIcon size={48} className="mx-auto text-slate-100 mb-4" />
                      <p className="text-lg font-bold text-slate-400">Zero missions found.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedDayTasks.map(task => {
                        const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                        return (
                          <div
                            key={task._id}
                            onClick={() => setSelectedTask(task)}
                            className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-6 transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${color.badge}`}>
                                {task.projectTag}
                              </span>
                              <div className={`h-2.5 w-2.5 rounded-full ${color.dot} shadow-lg shadow-${color.dot.split('-')[1]}-200`} />
                            </div>
                            <h4 className="text-lg font-black text-slate-900 leading-snug group-hover:text-primary transition-colors">{task.title}</h4>
                            <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-500">{task.description || "In-depth review and execution."}</p>
                            <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-5">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                                  {task.assignedTo?.name.charAt(0) || "U"}
                                </div>
                                <span className="text-xs font-bold text-slate-600">{task.assignedTo?.name || "Unassigned"}</span>
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${getStatusTone(task.status)} px-3 py-1 rounded-full`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Collapsible on Mobile */}
          <aside className="hidden space-y-8 lg:block">
            {/* Project Filter */}
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-black text-slate-900">Project Engine</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedProjectId("all")}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${selectedProjectId === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  All Active
                </button>
                {projects.map(p => (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProjectId(p._id)}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${selectedProjectId === p._id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-black text-slate-900">Priority Stream</h3>
              <div className="space-y-6">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400">Clear horizon ahead.</p>
                ) : (
                  upcomingDeadlines.map(task => {
                    const priority = getPriority(task);
                    return (
                      <div key={task._id} className="flex gap-4">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-lg shadow-red-200" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 leading-tight">{task.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400">{formatDeadline(task.deadline)}</span>
                            <span className={`text-[10px] font-black uppercase ${priority.tone}`}>{priority.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-t-[40px] border border-slate-200 bg-white p-8 shadow-2xl sm:rounded-[40px] animate-in slide-in-from-bottom-full sm:zoom-in-95">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Plan Mission</h3>
              <button onClick={closeCreateTaskModal} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Objective Title</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="Core task identifier..."
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                    disabled={creatingTask}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Deadline</label>
                    <input
                      type="date"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white transition-all"
                      value={taskForm.deadline}
                      onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })}
                      disabled={creatingTask}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Assigned To</label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold outline-none focus:border-primary focus:bg-white transition-all"
                      value={taskForm.assignedTo}
                      onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                      disabled={creatingTask || !taskForm.projectId}
                    >
                      <option value="">Collaborator (Optional)</option>
                      {assignableMembers.map(m => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {taskMessage && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl">{taskMessage}</p>}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeCreateTaskModal} className="flex-1 rounded-[22px] py-4 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition">Discard</button>
                <button type="submit" disabled={creatingTask} className="flex-1 rounded-[22px] bg-primary py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 hover:bg-blue-700 transition disabled:opacity-50">
                  {creatingTask ? "Syncing..." : "Launch Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full rounded-t-[40px] bg-white p-8 shadow-2xl animate-in slide-in-from-bottom-full">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Control Panel</h3>
              <button onClick={() => setShowMobileFilters(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">Quick Filters</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setOnlyMine(!onlyMine); setShowMobileFilters(false); }}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold border transition ${onlyMine ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-100"}`}
                  >
                    {onlyMine ? "My Work Only" : "Team & Me"}
                  </button>
                  <select
                    value={selectedMemberId}
                    onChange={e => { setSelectedMemberId(e.target.value); setShowMobileFilters(false); }}
                    className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600"
                  >
                    <option value="all">Any Member</option>
                    {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">Project Workspace</label>
                <select
                  value={selectedProjectId}
                  onChange={e => { setSelectedProjectId(e.target.value); setShowMobileFilters(false); }}
                  className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600"
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="mt-10 w-full rounded-[22px] bg-slate-950 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
