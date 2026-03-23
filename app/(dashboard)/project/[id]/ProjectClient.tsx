"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
    Bug,
    ChevronDown,
    ChevronRight,
    FileText,
    GripVertical,
    Pencil,
    Plus,
    Settings,
    Sparkles,
    TrendingUp,
    Wrench,
    X,
    CheckSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "Pending" | "In Progress" | "Done";
type TaskType = "Task" | "Bug" | "Feature" | "Improvement" | "Chore";

interface ProjectMember {
    _id: string;
    role: "MASTER" | "MEMBER";
    user: { _id: string; name: string; email: string };
}

interface ProjectDetails {
    project: { _id: string; name: string; description?: string; documentUrl?: string; documentName?: string };
    membership: { _id: string; role: "MASTER" | "MEMBER"; userId: string };
    members: ProjectMember[];
    tasks: Task[];
}

interface Task {
    _id: string;
    title: string;
    description?: string;
    assignedTo?: { _id: string; name: string; email: string } | null;
    startDate?: string | null;
    deadline?: string | null;
    status: TaskStatus;
    type?: TaskType;
    parentTaskId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = "#D97757";

const COLUMNS: {
    id: TaskStatus;
    label: string;
    dotCls: string;
    headerCls: string;
    dropCls: string;
    countCls: string;
    selectedStyle: React.CSSProperties;
}[] = [
    {
        id: "Pending",
        label: "To Do",
        dotCls: "bg-amber-400",
        headerCls: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
        dropCls: "border-amber-300 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-900/10",
        countCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        selectedStyle: { backgroundColor: "#d97706", borderColor: "#d97706", color: "white" },
    },
    {
        id: "In Progress",
        label: "In Progress",
        dotCls: "bg-blue-500",
        headerCls: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700",
        dropCls: "border-blue-300 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-900/10",
        countCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        selectedStyle: { backgroundColor: "#2563eb", borderColor: "#2563eb", color: "white" },
    },
    {
        id: "Done",
        label: "Done",
        dotCls: "bg-emerald-500",
        headerCls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700",
        dropCls: "border-emerald-300 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-900/10",
        countCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
        selectedStyle: { backgroundColor: "#059669", borderColor: "#059669", color: "white" },
    },
];

const TASK_TYPES: { id: TaskType; label: string; icon: React.ReactNode; cls: string; selectedStyle: React.CSSProperties }[] = [
    { id: "Task", label: "Task", icon: <CheckSquare size={11} />, cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700", selectedStyle: { backgroundColor: "#2563eb", borderColor: "#2563eb", color: "white" } },
    { id: "Bug", label: "Bug", icon: <Bug size={11} />, cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700", selectedStyle: { backgroundColor: "#dc2626", borderColor: "#dc2626", color: "white" } },
    { id: "Feature", label: "Feature", icon: <Sparkles size={11} />, cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700", selectedStyle: { backgroundColor: "#9333ea", borderColor: "#9333ea", color: "white" } },
    { id: "Improvement", label: "Improvement", icon: <TrendingUp size={11} />, cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700", selectedStyle: { backgroundColor: "#059669", borderColor: "#059669", color: "white" } },
    { id: "Chore", label: "Chore", icon: <Wrench size={11} />, cls: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700", selectedStyle: { backgroundColor: "#4b5563", borderColor: "#4b5563", color: "white" } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getTypeMeta(type?: TaskType) {
    return TASK_TYPES.find((t) => t.id === type) ?? TASK_TYPES[0];
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
});

function parseDateValue(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getUtcDayKey(value?: string | Date | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function fmtDate(d?: string | null) {
    const date = parseDateValue(d);
    return date ? SHORT_DATE_FORMATTER.format(date) : null;
}

function isOverdue(deadline?: string | null, status?: TaskStatus, todayKey?: string | null) {
    if (!deadline || status === "Done" || !todayKey) return false;
    const deadlineKey = getUtcDayKey(deadline);
    return deadlineKey ? deadlineKey < todayKey : false;
}

function isDueToday(deadline?: string | null, status?: TaskStatus, todayKey?: string | null) {
    if (!deadline || status === "Done" || !todayKey) return false;
    return getUtcDayKey(deadline) === todayKey;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectClient({ initialData, renderedAt }: { initialData: ProjectDetails; renderedAt: string }) {
    const params = useParams<{ id: string }>();
    const projectId = params?.id ?? initialData.project._id;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { resolvedTheme } = useTheme();
    const [hasMounted, setHasMounted] = useState(false);
    const colorScheme = hasMounted && resolvedTheme === "dark" ? "dark" : "light";
    const todayKey = useMemo(() => getUtcDayKey(renderedAt) ?? "", [renderedAt]);

    const [project, setProject] = useState(initialData.project);
    const [membership] = useState(initialData.membership);
    const [members, setMembers] = useState<ProjectMember[]>(initialData.members);
    const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [mobileTab, setMobileTab] = useState<TaskStatus>("Pending");

    // Story modal
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [storyForm, setStoryForm] = useState({ title: "", assignedTo: "" });
    const [storySubmitting, setStorySubmitting] = useState(false);
    const [storyMsg, setStoryMsg] = useState("");

    // Task modal
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskStoryId, setTaskStoryId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskForm, setTaskForm] = useState<{ title: string; description: string; status: TaskStatus; type: TaskType; startDate: string; deadline: string }>({
        title: "", description: "", status: "Pending", type: "Task", startDate: "", deadline: "",
    });
    const [taskSubmitting, setTaskSubmitting] = useState(false);
    const [taskMsg, setTaskMsg] = useState("");

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Overview modal
    const [showOverviewModal, setShowOverviewModal] = useState(false);
    const [overviewForm, setOverviewForm] = useState({ description: project.description || "" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [overviewSubmitting, setOverviewSubmitting] = useState(false);
    const [overviewMsg, setOverviewMsg] = useState("");

    // Drag & drop (pure DOM — zero React state changes during drag)
    const dragCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Member filter
    const [filterMember, setFilterMember] = useState<string>("all");

    // Task detail modal
    const [detailTask, setDetailTask] = useState<Task | null>(null);

    const canManage = membership?.role === "MASTER";

    useEffect(() => {
        setHasMounted(true);
    }, []);

    // ─── Derived data ────────────────────────────────────────────────────────

    const allStories = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

    const stories = useMemo(() => {
        if (filterMember === "all") return allStories;
        return allStories.filter((s) => s.assignedTo?._id === filterMember);
    }, [allStories, filterMember]);

    const tasksByStory = useMemo(() => {
        const map: Record<string, Task[]> = {};
        for (const t of tasks) {
            if (t.parentTaskId) {
                (map[t.parentTaskId] ??= []).push(t);
            }
        }
        return map;
    }, [tasks]);

    const stats = useMemo(() => {
        const sub = tasks.filter((t) => t.parentTaskId && (!filterMember || filterMember === "all" || allStories.find((s) => s._id === t.parentTaskId)?.assignedTo?._id === filterMember));
        return {
            total: sub.length,
            todo: sub.filter((t) => t.status === "Pending").length,
            inProgress: sub.filter((t) => t.status === "In Progress").length,
            done: sub.filter((t) => t.status === "Done").length,
        };
    }, [tasks, filterMember, allStories]);

    // ─── Data fetchers ───────────────────────────────────────────────────────

    const fetchTasks = async () => {
        try {
            const res = await fetch(`/api/tasks?projectId=${projectId}&page=1&limit=500`, { cache: "no-store" });
            if (res.ok) setTasks((await res.json()).tasks);
        } catch { /* silent */ }
    };

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
            if (res.ok) {
                const d = await res.json();
                setProject(d.project);
                setMembers(d.members);
                setOverviewForm({ description: d.project.description || "" });
            }
        } catch { /* silent */ }
    };

    // ─── Status change ───────────────────────────────────────────────────────

    const handleStatusChange = async (taskId: string, status: TaskStatus) => {
        setTasks((p) => p.map((t) => (t._id === taskId ? { ...t, status } : t)));
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) fetchTasks();
        } catch { fetchTasks(); }
    };

    // ─── Drag & drop (pure DOM, wrapper-based ghost) ───────────────────────────

    const startDrag = (e: React.PointerEvent<HTMLDivElement>, taskId: string) => {
        if ((e.target as HTMLElement).closest("button, select, input, a")) return;
        if (e.button !== 0) return;

        const maybeEl = dragCardRefs.current[taskId];
        if (!maybeEl) return;
        const cardEl: HTMLDivElement = maybeEl;

        const rect = cardEl.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const startX = e.clientX;
        const startY = e.clientY;
        let dragging = false;
        let wrapper: HTMLDivElement | null = null;
        let currentHighlight: HTMLElement | null = null;

        function getDropZoneAtPoint(x: number, y: number): { el: HTMLElement; status: TaskStatus } | null {
            const zones = document.querySelectorAll<HTMLElement>("[data-drop-zone]");
            for (let i = 0; i < zones.length; i++) {
                const r = zones[i].getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
                    return { el: zones[i], status: zones[i].dataset.dropZone as TaskStatus };
                }
            }
            return null;
        }

        function clearHighlight() {
            if (currentHighlight) {
                currentHighlight.style.borderStyle = "";
                currentHighlight.style.borderColor = "";
                currentHighlight.style.backgroundColor = "";
                currentHighlight = null;
            }
        }

        function setGhostPos(x: number, y: number) {
            if (wrapper) {
                wrapper.style.transform = `translate(${x}px, ${y}px)`;
            }
        }

        function onMove(me: PointerEvent) {
            if (!dragging) {
                if (Math.hypot(me.clientX - startX, me.clientY - startY) <= 5) return;
                dragging = true;

                // Wrapper handles ALL positioning — completely isolated from card CSS
                wrapper = document.createElement("div");
                wrapper.style.position = "fixed";
                wrapper.style.left = "0";
                wrapper.style.top = "0";
                wrapper.style.width = rect.width + "px";
                wrapper.style.zIndex = "9999";
                wrapper.style.pointerEvents = "none";
                wrapper.style.transform = `translate(${me.clientX - offsetX}px, ${me.clientY - offsetY}px)`;
                wrapper.style.boxShadow = "0 18px 44px rgba(0,0,0,0.28)";
                wrapper.style.borderRadius = "0.75rem";
                wrapper.style.overflow = "hidden";
                wrapper.style.opacity = "0.95";

                // Clone goes inside wrapper — its classes can't affect positioning
                const clone = cardEl.cloneNode(true) as HTMLDivElement;
                clone.removeAttribute("style");
                wrapper.appendChild(clone);
                document.body.appendChild(wrapper);

                // Hide original
                cardEl.style.opacity = "0";
                document.body.style.cursor = "grabbing";
                document.body.style.userSelect = "none";
                return;
            }

            // Move ghost
            me.preventDefault();
            setGhostPos(me.clientX - offsetX, me.clientY - offsetY);

            // Highlight drop zone under cursor
            const zone = getDropZoneAtPoint(me.clientX, me.clientY);
            if (currentHighlight && currentHighlight !== zone?.el) {
                clearHighlight();
            }
            if (zone?.el && zone.el !== currentHighlight) {
                currentHighlight = zone.el;
                currentHighlight.style.borderStyle = "dashed";
                currentHighlight.style.borderColor = "var(--color-brand, #D97757)";
                currentHighlight.style.backgroundColor = "rgba(217,119,87,0.06)";
            }
        }

        function cleanup() {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", cleanup);
            if (wrapper) { wrapper.remove(); wrapper = null; }
            cardEl.style.opacity = "";
            clearHighlight();
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }

        function onUp(ue: PointerEvent) {
            const zone = dragging ? getDropZoneAtPoint(ue.clientX, ue.clientY) : null;
            cleanup();
            if (zone) {
                const task = tasks.find((t) => t._id === taskId);
                if (task && task.status !== zone.status) handleStatusChange(taskId, zone.status);
            }
        }

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp, { once: true });
        document.addEventListener("pointercancel", cleanup, { once: true });
    };

    // ─── Story CRUD ──────────────────────────────────────────────────────────

    const submitStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storyForm.title.trim()) return;
        setStorySubmitting(true);
        setStoryMsg("");
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, title: storyForm.title, assignedTo: storyForm.assignedTo || null, status: "Pending", type: "Task" }),
            });
            const d = await res.json();
            if (res.ok) { setShowStoryModal(false); setStoryForm({ title: "", assignedTo: "" }); fetchTasks(); }
            else setStoryMsg(d.message || "Failed to create story");
        } catch { setStoryMsg("Failed to create story"); }
        finally { setStorySubmitting(false); }
    };

    // ─── Task CRUD ───────────────────────────────────────────────────────────

    const openAddTask = (storyId: string, initialStatus: TaskStatus = "Pending") => {
        setEditingTask(null);
        setTaskStoryId(storyId);
        setTaskForm({ title: "", description: "", status: initialStatus, type: "Task", startDate: "", deadline: "" });
        setTaskMsg("");
        setShowTaskModal(true);
    };

    const openEditTask = (task: Task) => {
        setEditingTask(task);
        setTaskStoryId(task.parentTaskId || null);
        setTaskForm({
            title: task.title,
            description: task.description || "",
            status: task.status,
            type: task.type || "Task",
            startDate: task.startDate ? task.startDate.slice(0, 10) : "",
            deadline: task.deadline ? task.deadline.slice(0, 10) : "",
        });
        setTaskMsg("");
        setShowTaskModal(true);
    };

    const submitTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.title.trim()) return;
        setTaskSubmitting(true);
        setTaskMsg("");
        try {
            const payload = {
                projectId,
                title: taskForm.title,
                description: taskForm.description,
                status: taskForm.status,
                type: taskForm.type,
                startDate: taskForm.startDate || null,
                deadline: taskForm.deadline || null,
                parentTaskId: editingTask ? editingTask.parentTaskId : taskStoryId,
            };
            const res = await fetch(editingTask ? `/api/tasks/${editingTask._id}` : "/api/tasks", {
                method: editingTask ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const d = await res.json();
            if (res.ok) { setShowTaskModal(false); fetchTasks(); }
            else setTaskMsg(d.message || "Failed to save task");
        } catch { setTaskMsg("Failed to save task"); }
        finally { setTaskSubmitting(false); }
    };

    // ─── Delete ──────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deletingId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/tasks/${deletingId}`, { method: "DELETE" });
            if (res.ok) { setDeletingId(null); fetchTasks(); }
        } catch { /* silent */ }
        finally { setDeleting(false); }
    };

    // ─── Overview ────────────────────────────────────────────────────────────

    const submitOverview = async (e: React.FormEvent) => {
        e.preventDefault();
        setOverviewSubmitting(true);
        setOverviewMsg("");
        try {
            let documentUrl = project?.documentUrl || "";
            let documentName = project?.documentName || "";
            if (selectedFile) {
                const fd = new FormData();
                fd.append("file", selectedFile);
                const ur = await fetch(`/api/projects/${projectId}/upload`, { method: "POST", body: fd });
                if (!ur.ok) { setOverviewMsg((await ur.json()).message || "Upload failed"); setOverviewSubmitting(false); return; }
                const ud = await ur.json();
                documentUrl = ud.documentUrl;
                documentName = ud.documentName;
            }
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: project.name, description: overviewForm.description, documentUrl, documentName }),
            });
            if (res.ok) { await fetchProject(); setShowOverviewModal(false); }
            else setOverviewMsg((await res.json()).message || "Failed");
        } catch { setOverviewMsg("Something went wrong"); }
        finally { setOverviewSubmitting(false); }
    };

    // ─── Task Card (render function, NOT a component — avoids remount on re-render) ──

    const renderTaskCard = (task: Task) => {
        const typeMeta = getTypeMeta(task.type);
        const overdue = isOverdue(task.deadline, task.status, todayKey);
        const dueToday = isDueToday(task.deadline, task.status, todayKey);
        const start = fmtDate(task.startDate);
        const end = fmtDate(task.deadline);
        return (
            <div
                ref={(el) => { dragCardRefs.current[task._id] = el; }}
                onPointerDown={(e) => startDrag(e, task._id)}
                onDragStart={(e) => e.preventDefault()}
                style={{ touchAction: "pan-y" }}
                className={`group relative rounded-xl border bg-surface select-none transition-[border-color,box-shadow] ${overdue
                    ? "cursor-grab border-red-400 dark:border-red-500 hover:shadow-md"
                    : "cursor-grab border-border-subtle hover:border-primary/40 hover:shadow-md"
                    }`}
            >
                {/* Overdue / due-today pulse strip */}
                {(overdue || dueToday) && (
                    <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${overdue ? "bg-red-500 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
                )}

                {/* Top row: drag handle + type badge + actions */}
                <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                    <GripVertical size={12} className="text-muted opacity-30 group-hover:opacity-60 shrink-0" />
                    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${typeMeta.cls}`}>
                        {typeMeta.icon}
                        {typeMeta.label}
                    </span>
                    {(overdue || dueToday) && (
                        <span className={`text-[9px] font-bold rounded px-1 py-0.5 animate-pulse ${overdue ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"}`}>
                            {overdue ? "OVERDUE" : "DUE TODAY"}
                        </span>
                    )}
                    {canManage && (
                        <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={(e) => { e.stopPropagation(); openEditTask(task); }} className="p-1 rounded-md text-muted hover:text-text-base hover:bg-surface-muted">
                                <Pencil size={11} />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setDeletingId(task._id); }} className="p-1 rounded-md text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <X size={11} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Clickable body — opens detail modal */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailTask(task)}
                    onKeyDown={(e) => e.key === "Enter" && setDetailTask(task)}
                    className="px-3 pb-2 cursor-pointer"
                >
                    <p className="text-sm font-medium text-text-base leading-snug">{task.title}</p>
                    {task.description && (
                        <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed">{task.description}</p>
                    )}
                </div>

                {/* Dates row */}
                {(start || end) && (
                    <div className="px-3 pb-2 flex items-center gap-2 text-[10px] text-muted">
                        {start && <span>▶ {start}</span>}
                        {start && end && <span className="opacity-40">→</span>}
                        {end && (
                            <span className={overdue ? "text-red-500 dark:text-red-400 font-semibold" : dueToday ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                                ⏹ {end}
                            </span>
                        )}
                    </div>
                )}

                {/* Status dropdown */}
                <div className="px-3 pb-3">
                    <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value as TaskStatus)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ colorScheme }}
                        className={`text-[11px] rounded-lg px-2 py-1 border font-semibold cursor-pointer focus:outline-none transition-colors ${task.status === "Done"
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                            : task.status === "In Progress"
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                            }`}
                    >
                        <option value="Pending">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </select>
                </div>
            </div>
        );
    };

    const detailStart = detailTask ? fmtDate(detailTask.startDate) : null;
    const detailEnd = detailTask ? fmtDate(detailTask.deadline) : null;
    const detailOverdue = detailTask ? isOverdue(detailTask.deadline, detailTask.status, todayKey) : false;
    const detailDueToday = detailTask ? isDueToday(detailTask.deadline, detailTask.status, todayKey) : false;

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-full bg-base">

            {/* ── Page header ─────────────────────────────────────────── */}
            <section className="border-b border-border-subtle bg-surface px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <Link href="/projects" className="hover:text-primary transition">Projects</Link>
                            <span>/</span>
                            <span className="font-medium text-text-base">{project.name}</span>
                        </div>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-base sm:text-3xl">{project.name}</h1>
                        {project.description && (
                            <p className="mt-1.5 text-sm text-muted max-w-xl leading-relaxed">{project.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                            <Link href={`/project/${projectId}/settings`} className="inline-flex items-center gap-1.5 text-muted hover:text-primary transition">
                                <Settings size={14} /> Settings
                            </Link>
                            {project.documentUrl && (
                                <a href={project.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-primary transition">
                                    <FileText size={14} /> {project.documentName || "Document"}
                                </a>
                            )}
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() => { setOverviewForm({ description: project.description || "" }); setSelectedFile(null); setOverviewMsg(""); setShowOverviewModal(true); }}
                                    className="inline-flex items-center gap-1.5 text-muted hover:text-primary transition"
                                >
                                    <Pencil size={14} /> Edit overview
                                </button>
                            )}
                        </div>
                    </div>
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => { setStoryForm({ title: "", assignedTo: "" }); setStoryMsg(""); setShowStoryModal(true); }}
                            className="btn-primary shrink-0 px-5 py-2.5 whitespace-nowrap"
                        >
                            <Plus size={18} /> Add Story
                        </button>
                    )}
                </div>
            </section>

            {/* ── Stats strip ─────────────────────────────────────────── */}
            <div className="border-b border-border-subtle bg-surface px-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted shrink-0">
                        <span className="w-2 h-2 rounded-full bg-muted/60 inline-block" />
                        {stats.total} tasks · {allStories.length} stories
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        {stats.todo} to do
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        {stats.inProgress} in progress
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        {stats.done} done
                    </div>
                    <div className="ml-auto shrink-0">
                        <select
                            value={filterMember}
                            onChange={(e) => setFilterMember(e.target.value)}
                            style={{ colorScheme }}
                            className="text-xs rounded-lg border border-border-subtle bg-base text-text-base px-2.5 py-1.5 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All members</option>
                            {members.map((m) => (
                                <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Board ───────────────────────────────────────────────── */}
            <div className="px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-[1400px]">

                    {stories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center text-muted">
                            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4 border border-border-subtle">
                                <Plus size={28} className="opacity-30" />
                            </div>
                            <p className="text-base font-semibold text-text-base">No stories yet</p>
                            <p className="text-sm mt-1.5 text-muted max-w-xs">
                                {canManage
                                    ? <button type="button" onClick={() => { setStoryForm({ title: "", assignedTo: "" }); setShowStoryModal(true); }} className="text-primary hover:underline font-medium">Create your first story →</button>
                                    : "Ask a project manager to add stories."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ── Desktop board (md+) ─────────────────────── */}
                            <div className="hidden md:block overflow-x-auto">
                                {/* Column headers */}
                                <div className="grid grid-cols-[260px_1fr_1fr_1fr] gap-3 mb-3 min-w-[780px]">
                                    <div className="px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-muted">Story</div>
                                    {COLUMNS.map((col) => (
                                        <div key={col.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-widest ${col.headerCls}`}>
                                            <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${col.dotCls}`} />
                                            {col.label}
                                            <span className={`ml-auto text-[11px] font-semibold rounded-full px-1.5 py-0.5 ${col.countCls}`}>
                                                {tasks.filter((t) => t.parentTaskId && t.status === col.id).length}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Story rows */}
                                <div className="space-y-2.5 min-w-[780px]">
                                    {stories.map((story) => {
                                        const isCollapsed = !!collapsed[story._id];
                                        const storyTasks = tasksByStory[story._id] || [];
                                        return (
                                            <div key={story._id} className="rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
                                                {/* Story header row */}
                                                <div className="grid grid-cols-[260px_1fr_1fr_1fr] gap-3 bg-surface px-3 py-3 items-center">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCollapsed((p) => ({ ...p, [story._id]: !p[story._id] }))}
                                                            className="shrink-0 p-1 rounded-lg text-muted hover:bg-surface-muted transition"
                                                        >
                                                            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                                        </button>
                                                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                                                            {getInitials(story.assignedTo?.name)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-text-base truncate">{story.title}</p>
                                                            <p className="text-xs text-muted truncate">{story.assignedTo?.name || "Unassigned"}</p>
                                                        </div>
                                                        {canManage && (
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    title="Add task"
                                                                    onClick={() => openAddTask(story._id)}
                                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white transition hover:opacity-80 shrink-0"
                                                                    style={{ backgroundColor: BRAND }}
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    title="Delete story"
                                                                    onClick={() => setDeletingId(story._id)}
                                                                    className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {COLUMNS.map((col) => {
                                                        const n = storyTasks.filter((t) => t.status === col.id).length;
                                                        return (
                                                            <div key={col.id} className="px-2 text-xs text-muted">
                                                                {n > 0 && <span className="font-semibold">{n} task{n !== 1 ? "s" : ""}</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Task content */}
                                                {!isCollapsed && (
                                                    <div className="grid grid-cols-[260px_1fr_1fr_1fr] gap-3 p-3 bg-base min-h-[80px]">
                                                        {/* Left: empty spacer */}
                                                        <div />

                                                        {/* Status columns */}
                                                        {COLUMNS.map((col) => {
                                                            const colTasks = storyTasks.filter((t) => t.status === col.id);
                                                            return (
                                                                <div
                                                                    key={col.id}
                                                                    data-drop-zone={col.id}
                                                                    className="space-y-2 rounded-xl p-2 min-h-[60px] border-2 border-transparent"
                                                                >
                                                                    {colTasks.map((task) => <React.Fragment key={task._id}>{renderTaskCard(task)}</React.Fragment>)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Mobile board (< md) ─────────────────────── */}
                            <div className="md:hidden">
                                {/* Tab bar */}
                                <div className="flex rounded-2xl overflow-hidden border border-border-subtle mb-4">
                                    {COLUMNS.map((col, i) => (
                                        <button
                                            key={col.id}
                                            type="button"
                                            onClick={() => setMobileTab(col.id)}
                                            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold transition ${mobileTab === col.id
                                                ? "bg-primary text-white"
                                                : "bg-surface text-muted hover:bg-surface-muted"
                                                } ${i > 0 ? "border-l border-border-subtle" : ""}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full inline-block ${mobileTab === col.id ? "bg-white" : col.dotCls}`} />
                                            {col.label}
                                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${mobileTab === col.id ? "bg-white/20 text-white" : col.countCls}`}>
                                                {tasks.filter((t) => t.parentTaskId && t.status === col.id).length}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Stories for the active tab */}
                                <div className="space-y-3">
                                    {stories.map((story) => {
                                        const isCollapsed = !!collapsed[`m-${story._id}`];
                                        const storyTasks = (tasksByStory[story._id] || []).filter((t) => t.status === mobileTab);
                                        return (
                                            <div key={story._id} className="rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
                                                {/* Mobile story header */}
                                                <div className="bg-surface px-4 py-3 flex items-center gap-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCollapsed((p) => ({ ...p, [`m-${story._id}`]: !p[`m-${story._id}`] }))}
                                                        className="shrink-0 text-muted"
                                                    >
                                                        {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                                    </button>
                                                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                                                        {getInitials(story.assignedTo?.name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-text-base truncate">{story.title}</p>
                                                        <p className="text-xs text-muted">{story.assignedTo?.name || "Unassigned"} · {storyTasks.length} task{storyTasks.length !== 1 ? "s" : ""}</p>
                                                    </div>
                                                    {canManage && (
                                                        <div className="flex gap-1.5 shrink-0 items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => openAddTask(story._id, mobileTab)}
                                                                className="w-7 h-7 rounded-full flex items-center justify-center text-white transition hover:opacity-80 shrink-0"
                                                                style={{ backgroundColor: BRAND }}
                                                            >
                                                                <Plus size={13} />
                                                            </button>
                                                            <button type="button" onClick={() => setDeletingId(story._id)} className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Mobile tasks */}
                                                {!isCollapsed && (
                                                    <div className="bg-base px-3 py-3 space-y-2">
                                                        {storyTasks.length === 0 ? (
                                                            <p className="text-sm text-center text-muted py-3">No tasks here.</p>
                                                        ) : (
                                                            storyTasks.map((task) => <React.Fragment key={task._id}>{renderTaskCard(task)}</React.Fragment>)
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Ghost is now created via pure DOM cloning in startDrag — no React JSX needed */}

            {/* ══════════════════ MODALS ══════════════════ */}

            {/* ── Add Story modal ─────────────────────────────────────── */}
            {showStoryModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="modal-surface w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-text-base">Add Story</h3>
                            <button type="button" onClick={() => setShowStoryModal(false)} className="p-2 rounded-full text-muted hover:bg-surface-muted">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={submitStory} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1.5">Story Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="field-surface"
                                    placeholder="e.g. User Authentication Flow"
                                    value={storyForm.title}
                                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1.5">Assignee</label>
                                <select
                                    className="field-surface"
                                    style={{ colorScheme }}
                                    value={storyForm.assignedTo}
                                    onChange={(e) => setStoryForm({ ...storyForm, assignedTo: e.target.value })}
                                >
                                    <option value="">Unassigned</option>
                                    {members.map((m) => (
                                        <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                                    ))}
                                </select>
                            </div>
                            {storyMsg && <p className="text-sm text-red-500">{storyMsg}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowStoryModal(false)} className="btn-secondary px-5 py-2.5" disabled={storySubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary px-5 py-2.5" disabled={storySubmitting}>
                                    {storySubmitting ? "Creating..." : "Create Story"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Task modal ───────────────────────────────── */}
            {showTaskModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="modal-surface w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-text-base">{editingTask ? "Edit Task" : "Add Task"}</h3>
                            <button type="button" onClick={() => setShowTaskModal(false)} className="p-2 rounded-full text-muted hover:bg-surface-muted">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={submitTask} className="space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1.5">Task Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="field-surface"
                                    placeholder="What needs to be done?"
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
                                <textarea
                                    rows={3}
                                    className="field-surface resize-none"
                                    placeholder="Optional details..."
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1.5">Start Date</label>
                                    <input
                                        type="date"
                                        className="field-surface"
                                        value={taskForm.startDate}
                                        style={{ colorScheme }}
                                        onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1.5">Due Date</label>
                                    <input
                                        type="date"
                                        className="field-surface"
                                        value={taskForm.deadline}
                                        style={{ colorScheme }}
                                        onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-muted mb-2">Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {TASK_TYPES.map((t) => {
                                        const isSelected = taskForm.type === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setTaskForm({ ...taskForm, type: t.id })}
                                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ${isSelected ? "" : `${t.cls} hover:opacity-80`}`}
                                                style={isSelected ? t.selectedStyle : undefined}
                                            >
                                                {t.icon} {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-muted mb-2">Status</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {COLUMNS.map((col) => {
                                        const isSelected = taskForm.status === col.id;
                                        return (
                                            <button
                                                key={col.id}
                                                type="button"
                                                onClick={() => setTaskForm({ ...taskForm, status: col.id })}
                                                className={`rounded-xl border py-2.5 text-sm font-semibold transition ${isSelected ? "" : "border-border-subtle text-muted hover:border-primary/40"}`}
                                                style={isSelected ? col.selectedStyle : undefined}
                                            >
                                                {col.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {taskMsg && <p className="text-sm text-red-500">{taskMsg}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary px-5 py-2.5" disabled={taskSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary px-5 py-2.5" disabled={taskSubmitting}>
                                    {taskSubmitting ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Task Detail modal ───────────────────────────────────── */}
            {detailTask && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setDetailTask(null)}>
                    <div
                        className="modal-surface w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                    const meta = getTypeMeta(detailTask.type);
                                    return (
                                        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                                            {meta.icon} {meta.label}
                                        </span>
                                    );
                                })()}
                                <span className={`text-[10px] font-semibold rounded-lg border px-1.5 py-0.5 ${detailTask.status === "Done"
                                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                                    : detailTask.status === "In Progress"
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                                    }`}>
                                    {detailTask.status === "Pending" ? "To Do" : detailTask.status}
                                </span>
                            </div>
                            <button type="button" onClick={() => setDetailTask(null)} className="p-2 rounded-full text-muted hover:bg-surface-muted shrink-0">
                                <X size={18} />
                            </button>
                        </div>
                        <h3 className="text-xl font-semibold text-text-base leading-snug mb-3">{detailTask.title}</h3>
                        {detailTask.description ? (
                            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{detailTask.description}</p>
                        ) : (
                            <p className="text-sm text-muted italic">No description provided.</p>
                        )}
                        {(detailTask.startDate || detailTask.deadline) && (
                            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                                {detailTask.startDate && (
                                    <span>▶ Start: <span className="font-medium text-text-base">{new Date(detailTask.startDate).toLocaleDateString()}</span></span>
                                )}
                                {detailTask.deadline && (
                                    <span className={isOverdue(detailTask.deadline, detailTask.status) ? "text-red-500 dark:text-red-400" : isDueToday(detailTask.deadline, detailTask.status) ? "text-amber-600 dark:text-amber-400" : ""}>
                                        ⏹ Due: <span className="font-medium">{new Date(detailTask.deadline).toLocaleDateString()}</span>
                                        {isOverdue(detailTask.deadline, detailTask.status) && <span className="ml-1 animate-pulse font-bold">OVERDUE</span>}
                                        {isDueToday(detailTask.deadline, detailTask.status) && <span className="ml-1 animate-pulse font-bold">DUE TODAY</span>}
                                    </span>
                                )}
                            </div>
                        )}
                        {detailTask.assignedTo && (
                            <div className="mt-4 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                    {getInitials(detailTask.assignedTo.name)}
                                </div>
                                <span className="text-xs text-muted">{detailTask.assignedTo.name}</span>
                            </div>
                        )}
                        {canManage && (
                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setDetailTask(null); openEditTask(detailTask); }}
                                    className="btn-secondary flex-1 py-2.5 flex items-center justify-center gap-1.5"
                                >
                                    <Pencil size={14} /> Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setDetailTask(null); setDeletingId(detailTask._id); }}
                                    className="btn-danger flex-1 py-2.5"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Delete confirm ──────────────────────────────────────── */}
            <ConfirmDialog
                open={!!deletingId}
                title="Delete item"
                description="This will permanently delete this item and all its tasks. This action cannot be undone."
                confirmLabel="Delete"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
            />

            {/* ── Edit overview modal ─────────────────────────────────── */}
            {showOverviewModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="modal-surface w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-text-base">Update Project Details</h3>
                            <button type="button" onClick={() => setShowOverviewModal(false)} className="p-2 rounded-full text-muted hover:bg-surface-muted">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={submitOverview} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1.5">Project Description</label>
                                <textarea
                                    rows={4}
                                    className="field-surface resize-none"
                                    placeholder="What is this project about?"
                                    value={overviewForm.description}
                                    onChange={(e) => setOverviewForm({ ...overviewForm, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1.5">Attachment (PDF, Image, Doc)</label>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-subtle bg-base py-6 text-muted transition hover:border-primary/50"
                                >
                                    {selectedFile ? (
                                        <div className="flex items-center gap-2 text-sm font-medium text-text-base">
                                            <FileText size={18} /> {selectedFile.name}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Plus size={22} />
                                            <span className="text-sm">Click to select a file</span>
                                        </div>
                                    )}
                                </button>
                                {project.documentUrl && !selectedFile && (
                                    <p className="text-xs text-muted mt-1.5">Current: {project.documentName}</p>
                                )}
                            </div>
                            {overviewMsg && <p className="text-sm text-red-500">{overviewMsg}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowOverviewModal(false)} className="btn-secondary px-5 py-2.5" disabled={overviewSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary px-5 py-2.5" disabled={overviewSubmitting}>
                                    {overviewSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
