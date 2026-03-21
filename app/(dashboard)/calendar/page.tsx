"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  ListFilter,
  Plus,
  Tag as TagIcon,
  UserRound,
  X,
  Calendar as CalendarIcon,
  ChevronDown,
  LayoutGrid,
  MoreVertical,
  ArrowRight,
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
  { surface: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
  { surface: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  { surface: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  { surface: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700" },
  { surface: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
];

function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function getWeekStrip(value: Date) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatMonthYear(value: Date) {
  return value.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getPriority(task: CalendarTask) {
  if (task.status === "Done") {
    return { label: "Low", tone: "text-emerald-600" };
  }

  const diff = Math.ceil(
    (startOfDay(new Date(task.deadline)).getTime() - startOfDay(new Date()).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  if (diff <= 3) return { label: "High Priority", tone: "text-red-500" };
  if (diff <= 7) return { label: "Medium", tone: "text-amber-600" };
  return { label: "Planned", tone: "text-blue-600" };
}

export default function CalendarPage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<CalendarProject[]>([]);
  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDayKey, setSelectedDayKey] = useState(toDateKey(today));
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ projectId: "", title: "", deadline: "" });
  const [creatingTask, setCreatingTask] = useState(false);

  const fetchCalendar = async () => {
    try {
      const response = await fetch("/api/calendar");
      if (response.ok) {
        const data: CalendarResponse = await response.json();
        setProjects(data.projects);
        setMembers(data.members);
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const projectColorIndex = useMemo(() => {
    return new Map(projects.map((p, i) => [p._id, i % TASK_COLORS.length]));
  }, [projects]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesProject = selectedProjectId === "all" || task.projectId === selectedProjectId;
      const matchesMine = !onlyMine || task.isMine;
      return matchesProject && matchesMine;
    });
  }, [onlyMine, selectedProjectId, tasks]);

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, CalendarTask[]>();
    filteredTasks.forEach((t) => {
      const key = toDateKey(t.deadline);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(t);
    });
    return grouped;
  }, [filteredTasks]);

  const monthDays = useMemo(() => getMonthGrid(currentDate), [currentDate]);
  const currentWeekDays = useMemo(() => getWeekStrip(currentDate), [currentDate]);
  const selectedDayTasks = useMemo(() => tasksByDate.get(selectedDayKey) || [], [selectedDayKey, tasksByDate]);

  const upcomingDeadlines = useMemo(() => {
    const start = startOfDay(new Date()).getTime();
    return filteredTasks
      .filter((task) => new Date(task.deadline).getTime() >= start && task.status !== "Done")
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);
  }, [filteredTasks]);

  const handleSelectDay = (day: Date) => {
    setCurrentDate(day);
    setSelectedDayKey(toDateKey(day));
  };

  const handleNavigate = (step: number) => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + step, 1);
    setCurrentDate(next);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] pb-24 md:pb-8">
      {/* Mobile Sticky Header */}
      <section className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 px-4 py-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">{formatMonthYear(currentDate)}</h1>
            <button onClick={() => setViewMode(viewMode === "month" ? "day" : "month")} className="text-slate-400">
              <ChevronDown size={18} className={`transition-transform ${viewMode === "month" ? "rotate-180" : ""}`} />
            </button>
          </div>
          <button onClick={() => setShowFilters(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <Filter size={18} />
          </button>
        </div>

        {/* Swipeable Date Strip (Only visible in 'day' view) */}
        {viewMode !== "month" && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none" ref={scrollRef}>
            {currentWeekDays.map((day) => {
              const isSelected = toDateKey(day) === selectedDayKey;
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={toDateKey(day)}
                  onClick={() => handleSelectDay(day)}
                  className={`flex min-w-[54px] flex-col items-center gap-1.5 rounded-2xl py-3 transition-all ${isSelected ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{DAY_LABELS[day.getDay()]}</span>
                  <span className="text-lg font-black">{day.getDate()}</span>
                  {tasksByDate.has(toDateKey(day)) && !isSelected && <div className="h-1 w-1 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Desktop Header */}
      <header className="hidden bg-white border-b border-slate-100 px-8 py-6 md:block">
        <div className="mx-auto max-w-[1240px] flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{formatMonthYear(currentDate)}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Coordinate releases and team sprints.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex rounded-xl bg-slate-50 p-1">
              <button onClick={() => handleNavigate(-1)} className="p-2 text-slate-400 hover:text-slate-900 transition"><ChevronLeft size={20} /></button>
              <button onClick={() => handleSelectDay(today)} className="px-4 text-sm font-black uppercase text-slate-600">Today</button>
              <button onClick={() => handleNavigate(1)} className="p-2 text-slate-400 hover:text-slate-900 transition"><ChevronRight size={20} /></button>
            </div>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-slate-200 transition hover:scale-105 active:scale-95"
            >
              <Plus size={18} />
              New Event
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Filter Bar - Sticky */}
      <div className="sticky top-0 z-30 hidden border-b border-slate-100 bg-white/80 py-3 backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stream:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProjectId("all")}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${selectedProjectId === "all" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  All Active
                </button>
                {projects.slice(0, 4).map((project) => (
                  <button
                    key={project._id}
                    onClick={() => setSelectedProjectId(project._id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${selectedProjectId === project._id
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "border border-slate-100 text-slate-500 hover:bg-slate-50"
                      }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setOnlyMine(!onlyMine)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${onlyMine ? "bg-primary text-white shadow-lg shadow-primary/20" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
            >
              <UserRound size={14} className={onlyMine ? "text-white" : "text-slate-400"} />
              My Targets Only
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1240px] px-4 pt-6 md:px-8">
        {/* Mobile View: Tasks for selected day */}
        <div className="md:hidden">
          {viewMode === "month" && (
            <div className="mb-8 overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/50">
                {DAY_LABELS.map((dayLabel) => (
                  <div key={dayLabel} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {dayLabel.substring(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {monthDays.map(day => {
                  const key = toDateKey(day);
                  const isSelected = key === selectedDayKey;
                  const inMonth = day.getMonth() === currentDate.getMonth();
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectDay(day)}
                      className={`flex h-12 items-center justify-center text-sm font-bold transition-all ${isSelected ? "bg-primary text-white" : inMonth ? "text-slate-900" : "text-slate-200"}`}
                    >
                      {day.getDate()}
                      {tasksByDate.has(key) && !isSelected && <div className="absolute mt-6 h-1 w-1 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Schedule</h2>
            {selectedDayTasks.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-slate-200 bg-white py-14 text-center">
                <CalendarIcon size={40} className="mx-auto text-slate-100 mb-4" />
                <p className="text-sm font-bold text-slate-400">No events found.</p>
              </div>
            ) : (
              selectedDayTasks.map(task => {
                const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                return (
                  <div key={task._id} className="group flex items-start gap-4 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${color.dot} shadow-lg shadow-${color.dot.split('-')[1]}-200`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{task.projectTag}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h3 className="mt-1 text-lg font-black text-slate-900">{task.title}</h3>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold">
                            {task.assignedTo?.name.charAt(0) || "U"}
                          </div>
                        </div>
                        <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${color.badge}`}>{task.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop View: Full Month Grid */}
        <div className="hidden md:grid gap-8 xl:grid-cols-[1fr_320px]">
          <div className="rounded-[40px] border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/50">
              {DAY_LABELS.map(l => (
                <div key={l} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{l}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map(day => {
                const key = toDateKey(day);
                const dayTasks = tasksByDate.get(key) || [];
                const inMonth = day.getMonth() === currentDate.getMonth();
                const isSelected = key === selectedDayKey;
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={key}
                    onClick={() => handleSelectDay(day)}
                    className={`group min-h-[140px] border-b border-r border-slate-50 p-4 transition-all hover:bg-slate-50/50 cursor-pointer ${inMonth ? "bg-white" : "bg-slate-50/20"} ${isSelected ? "bg-blue-50/30" : ""}`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${isToday ? "bg-primary text-white shadow-lg shadow-primary/20" : inMonth ? "text-slate-900" : "text-slate-300"}`}>{day.getDate()}</span>
                      {dayTasks.length > 0 && <span className="text-[10px] font-black text-slate-400">{dayTasks.length} E</span>}
                    </div>
                    <div className="space-y-2">
                      {dayTasks.slice(0, 2).map(t => {
                        const color = TASK_COLORS[projectColorIndex.get(t.projectId) || 0];
                        return (
                          <div key={t._id} className={`truncate rounded-xl px-3 py-2 text-[10px] font-bold ${color.surface} ${color.text}`}>
                            {t.title}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && <p className="text-[9px] font-black uppercase text-slate-400">+{dayTasks.length - 2} More</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Upcoming Deadlines</h3>
              <button className="text-slate-300 hover:text-slate-600 transition"><MoreVertical size={20} /></button>
            </div>

            <div className="space-y-4">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm font-bold text-slate-400">All clear for now.</p>
              ) : (
                upcomingDeadlines.map(task => {
                  const color = TASK_COLORS[projectColorIndex.get(task.projectId) || 0];
                  const priority = getPriority(task);
                  return (
                    <div key={task._id} className="group relative rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-xl hover:shadow-slate-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest ${color.badge}`}>
                          {priority.label}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">{task.title}</h4>
                      <p className="mt-2 text-sm font-medium text-slate-400 line-clamp-2">
                        {task.description || "Review alignment and confirm deliverables before the final demo."}
                      </p>
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex -space-x-1.5">
                          <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                            {task.assignedTo?.name.charAt(0) || "U"}
                          </div>
                          <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center" />
                        </div>
                        <ArrowRight size={18} className="text-slate-100 transition-colors group-hover:text-primary" />
                      </div>
                    </div>
                  );
                })
              )}

              {/* Schedule a Meeting Placeholder */}
              <button className="w-full flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-slate-100 bg-slate-50/30 py-8 transition hover:bg-white hover:border-primary group">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-blue-100/50 text-blue-600 transition group-hover:bg-primary group-hover:text-white">
                  <Plus size={20} />
                </div>
                <h5 className="text-sm font-black text-slate-900">Schedule a Meeting</h5>
                <p className="mt-1 text-xs font-bold text-slate-400">Find time for the whole team.</p>
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowTaskModal(true)}
        className="fixed bottom-24 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 md:hidden"
      >
        <Plus size={32} />
      </button>

      {/* Task Modal (Common for both) */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-md sm:items-center sm:p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-t-[48px] bg-white p-10 shadow-2xl sm:rounded-[48px] animate-in slide-in-from-bottom-full sm:zoom-in-95">
            <div className="mb-10 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">New Mission</h3>
              <button onClick={() => setShowTaskModal(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400"><X size={20} /></button>
            </div>
            <form className="space-y-8">
              <div>
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Objective</label>
                <input type="text" required placeholder="What needs to be done?" className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none focus:border-primary focus:bg-white transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Deadline</label>
                  <input type="date" required className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Workspace</label>
                  <select className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none focus:border-primary focus:bg-white">
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <button className="w-full rounded-[24px] bg-slate-950 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-300 transition hover:bg-slate-800">Identify Mission</button>
            </form>
          </div>
        </div>
      )}

      {/* Filters Overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full rounded-t-[48px] bg-white p-10 shadow-2xl animate-in slide-in-from-bottom-full">
            <div className="mb-10 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Workspace Hub</h3>
              <button onClick={() => setShowFilters(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-8">
              <div>
                <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-slate-400">Active Field</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setSelectedProjectId("all"); setShowFilters(false); }}
                    className={`rounded-2xl border px-4 py-4 text-xs font-black uppercase transition ${selectedProjectId === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-100"}`}
                  >
                    All Streams
                  </button>
                  {projects.slice(0, 3).map(p => (
                    <button
                      key={p._id}
                      onClick={() => { setSelectedProjectId(p._id); setShowFilters(false); }}
                      className={`truncate rounded-2xl border px-4 py-4 text-xs font-black uppercase transition ${selectedProjectId === p._id ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-100"}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowFilters(false)} className="w-full rounded-[24px] bg-slate-950 py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200">Return to Field</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
