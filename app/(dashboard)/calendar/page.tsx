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
    <div className="min-h-full bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto grid w-full max-w-[1320px] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {selectedProjectId === "all"
                  ? "All Projects Calendar"
                  : projects.find((project) => project._id === selectedProjectId)?.name || "Project Calendar"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Track milestones, due dates, and sprint commitments across your active work.
              </p>
            </div>

            <div className="flex w-full max-w-xs items-center gap-3 self-start rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Filter size={18} className="text-slate-400" />
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-700"
              >
                <option value="all">Select Projects</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Filter By:
                </span>

                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <UserRound size={16} className="text-slate-400" />
                  <select
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    className="bg-transparent"
                  >
                    <option value="all">Team Member</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <Tag size={16} className="text-slate-400" />
                  <select
                    value={selectedTag}
                    onChange={(event) => setSelectedTag(event.target.value)}
                    className="bg-transparent"
                  >
                    <option value="all">Project Tag</option>
                    {visibleTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-600">
                <span>Show only my tasks</span>
                <button
                  type="button"
                  onClick={() => setOnlyMine((value) => !value)}
                  className={`relative h-7 w-12 rounded-full transition ${
                    onlyMine ? "bg-primary" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      onlyMine ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit items-center rounded-[20px] border border-slate-200 bg-white p-1 shadow-sm">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-medium capitalize transition ${
                    viewMode === mode
                      ? "bg-primary text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigate("prev")}
                  className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="min-w-[190px] text-center text-xl font-semibold tracking-tight text-slate-950">
                  {headerLabel}
                </h2>
                <button
                  type="button"
                  onClick={() => handleNavigate("next")}
                  className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleToday}
                className="text-sm font-semibold text-primary transition hover:text-blue-700"
              >
                Today
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">
                Loading calendar...
              </div>
            ) : viewMode === "month" ? (
              <>
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {DAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                    >
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
                        className={`min-h-[152px] cursor-pointer border-b border-r border-slate-100 p-3 transition last:border-r-0 ${
                          inMonth ? "bg-white" : "bg-slate-50/80"
                        } ${isSelected ? "bg-blue-50/40" : ""}`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${
                              isToday
                                ? "bg-primary text-white"
                                : inMonth
                                  ? "text-slate-800"
                                  : "text-slate-300"
                            }`}
                          >
                            {day.getDate()}
                          </span>
                          {dayTasks.length > 0 && (
                            <span className="text-[11px] font-semibold text-slate-400">
                              {dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {dayTasks.slice(0, 3).map((task) => {
                            const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                            return (
                              <button
                                key={task._id}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedTask(task);
                                }}
                                className={`w-full rounded-2xl border px-2.5 py-2 text-left ${color.surface}`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                                  <span className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                    {task.projectTag}
                                  </span>
                                </div>
                                <p className={`mt-1 truncate text-sm font-semibold ${color.text}`}>
                                  {task.title}
                                </p>
                              </button>
                            );
                          })}
                          {dayTasks.length > 3 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectDay(day);
                                setViewMode("day");
                              }}
                              className="text-xs font-semibold text-primary"
                            >
                              +{dayTasks.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : viewMode === "week" ? (
              <div className="grid gap-px bg-slate-100 lg:grid-cols-7">
                {weekDays.map((day) => {
                  const key = toDateKey(day);
                  const dayTasks = tasksByDate.get(key) || [];

                  return (
                    <div key={key} className="min-h-[420px] bg-white p-4">
                      <button
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                          key === selectedDayKey ? "bg-blue-50 text-primary" : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {DAY_LABELS[day.getDay()]}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {day.getDate()}
                          </p>
                        </div>
                        {isSameDay(day, today) && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-primary">
                            Today
                          </span>
                        )}
                      </button>

                      <div className="mt-4 space-y-3">
                        {dayTasks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                            No scheduled tasks
                          </div>
                        ) : (
                          dayTasks.map((task) => {
                            const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                            return (
                              <button
                                key={task._id}
                                type="button"
                                onClick={() => setSelectedTask(task)}
                                className={`block w-full rounded-2xl border px-3 py-3 text-left ${color.surface}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                                  <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    {task.projectTag}
                                  </span>
                                </div>
                                <p className={`mt-1 text-sm font-semibold ${color.text}`}>
                                  {task.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {task.assignedTo?.name || "Unassigned"}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Selected Day
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                      {formatDayLabel(selectedDate)}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateTaskModal(selectedDayKey)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Plus size={16} />
                    Add Task
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedDayTasks.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-400">
                      No tasks scheduled for this day.
                    </div>
                  ) : (
                    selectedDayTasks.map((task) => {
                      const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                      return (
                        <button
                          key={task._id}
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className="flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${color.badge}`}>
                                {task.projectTag}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(task.status)}`}>
                                {task.status === "Pending" ? "To Do" : task.status}
                              </span>
                            </div>
                            <p className="mt-3 text-base font-semibold text-slate-900">
                              {task.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {task.projectName} · {task.assignedTo?.name || "Unassigned"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatDeadline(task.deadline)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">Deadline</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-primary">
                <ListFilter size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Calendar Scope
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {filteredTasks.length} scheduled task{filteredTasks.length === 1 ? "" : "s"} in view
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {selectedProjectId === "all"
                  ? "All Projects"
                  : projects.find((project) => project._id === selectedProjectId)?.name || "Project"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {selectedMemberId === "all"
                  ? "Any Member"
                  : members.find((member) => member._id === selectedMemberId)?.name || "Member"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {selectedTag === "all" ? "Any Tag" : selectedTag}
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                Upcoming Deadlines
              </h3>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {upcomingDeadlines.length} items
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {upcomingDeadlines.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  No upcoming deadlines match the current filters.
                </div>
              ) : (
                upcomingDeadlines.map((task) => {
                  const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                  return (
                    <button
                      key={task._id}
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className="block w-full rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${color.badge}`}>
                          {getPriority(task).label} Priority
                        </span>
                        <span className="text-sm text-slate-400">
                          {formatDeadline(task.deadline)}
                        </span>
                      </div>
                      <h4 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                        {task.title}
                      </h4>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                        {task.description || `Milestone scheduled in ${task.projectName}.`}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold ${color.badge}`}>
                            {task.assignedTo?.name
                              ?.split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase() || "NA"}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {task.assignedTo?.name || "Unassigned"}
                            </p>
                            <p className="text-xs text-slate-400">{task.projectTag}</p>
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-slate-300" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => openCreateTaskModal(selectedDayKey)}
            className="flex min-h-[150px] w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-center transition hover:border-primary hover:bg-blue-50/30"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-primary">
              <Plus size={24} />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-950">Schedule a Task</p>
            <p className="mt-1 text-sm text-slate-500">
              Create a new deadline and place it on the calendar.
            </p>
          </button>
        </aside>
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  New Task
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Add a scheduled task to one of your managed projects.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateTaskModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {manageableProjects.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                You need MASTER access on at least one project to schedule tasks from the calendar.
              </div>
            ) : (
              <form onSubmit={handleCreateTask} className="mt-6">
                {taskMessage && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {taskMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-600">
                        Project
                      </label>
                      <select
                        value={taskForm.projectId}
                        onChange={(event) =>
                          setTaskForm((prev) => ({
                            ...prev,
                            projectId: event.target.value,
                            assignedTo: "",
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">Select a project</option>
                        {manageableProjects.map((project) => (
                          <option key={project._id} value={project._id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-600">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={taskForm.deadline}
                        onChange={(event) =>
                          setTaskForm((prev) => ({ ...prev, deadline: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(event) =>
                        setTaskForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                      placeholder="Prepare milestone deliverable..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={taskForm.description}
                      onChange={(event) =>
                        setTaskForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                      placeholder="Add context, handoff details, or acceptance notes..."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-600">
                        Assignee
                      </label>
                      <select
                        value={taskForm.assignedTo}
                        onChange={(event) =>
                          setTaskForm((prev) => ({ ...prev, assignedTo: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">Unassigned</option>
                        {assignableMembers.map((member) => (
                          <option key={member._id} value={member._id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-600">
                        Status
                      </label>
                      <select
                        value={taskForm.status}
                        onChange={(event) =>
                          setTaskForm((prev) => ({
                            ...prev,
                            status: event.target.value as TaskStatus,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="Pending">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCreateTaskModal}
                    className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                  >
                    {creatingTask ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedTask && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setSelectedTask(null)}
          />
          <aside className="fixed inset-y-2 right-2 z-50 flex w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:w-[460px]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="rounded-xl bg-blue-50 px-3 py-1 text-sm font-medium text-primary">
                  {selectedTask.projectTag}
                </span>
                <span>{selectedTask.projectName}</span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {selectedTask.title}
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Status
                  </p>
                  <span className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusTone(selectedTask.status)}`}>
                    {selectedTask.status === "Pending" ? "To Do" : selectedTask.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Due Date
                  </p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {new Date(selectedTask.deadline).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Assignee
                  </p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {selectedTask.assignedTo?.name || "Unassigned"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Priority
                  </p>
                  <div className={`mt-2 inline-flex items-center gap-2 text-base font-medium ${getPriority(selectedTask).tone}`}>
                    <Flag size={16} />
                    {getPriority(selectedTask).label}
                  </div>
                </div>
              </div>

              <section className="mt-8">
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDays size={18} />
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                    Description
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {selectedTask.description || "No description has been added to this task yet."}
                </p>
              </section>

              <section className="mt-8 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Project Link
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {selectedTask.projectName}
                </p>
                <Link
                  href={`/project/${selectedTask.projectId}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  Open Project
                  <ArrowRight size={16} />
                </Link>
              </section>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
