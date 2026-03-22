"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Flag,
    Download,
    FileText,
    ListChecks,
    Pencil,
    Plus,
    Send,
    Settings,
    Share2,
    UserCircle2,
    X,
} from "lucide-react";

type TaskStatus = "Pending" | "In Progress" | "Done";

interface ProjectMember {
    _id: string;
    role: "MASTER" | "MEMBER";
    user: {
        _id: string;
        name: string;
        email: string;
    };
}

interface ProjectDetails {
    project: {
        _id: string;
        name: string;
        description?: string;
        documentUrl?: string;
        documentName?: string;
    };
    membership: {
        _id: string;
        role: "MASTER" | "MEMBER";
        userId: string;
    };
    members: ProjectMember[];
    tasks: Task[];
}

interface Task {
    _id: string;
    title: string;
    description?: string;
    assignedTo?: {
        _id: string;
        name: string;
        email: string;
    } | null;
    deadline?: string | null;
    status: TaskStatus;
    parentTaskId?: string | null;
}

interface TaskNode extends Task {
    children: TaskNode[];
}

const DEFAULT_TASK_FORM = {
    title: "",
    description: "",
    assignedTo: "",
    deadline: "",
    status: "Pending" as TaskStatus,
};

function buildTaskTree(tasks: Task[], parentId: string | null = null): TaskNode[] {
    return tasks
        .filter((task) => (parentId === null ? !task.parentTaskId : task.parentTaskId === parentId))
        .map((task) => ({
            ...task,
            children: buildTaskTree(tasks, task._id),
        }));
}

function formatDate(date?: string | null) {
    if (!date) return "No date";
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}

function getStatusPill(status: TaskStatus) {
    const common = "px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider";
    if (status === "Done") {
        return `bg-emerald-50/60 text-emerald-700 border border-emerald-200/50 ${common}`;
    }
    if (status === "In Progress") {
        return `bg-brand/10 dark:bg-brand/5/60 text-primary border border-primary/20 ${common}`;
    }
    return `bg-amber-50/60 text-amber-700 border border-amber-200/50 ${common}`;
}

function findTaskNode(nodes: TaskNode[], taskId: string | null): TaskNode | null {
    if (!taskId) return null;

    for (const node of nodes) {
        if (node._id === taskId) return node;
        const nested = findTaskNode(node.children, taskId);
        if (nested) return nested;
    }

    return null;
}

function getPriority(task: TaskNode | null) {
    if (!task) return { label: "Medium", className: "text-amber-600" };
    if (task.status === "Done") return { label: "Low", className: "text-emerald-600" };
    if (!task.deadline) return { label: "Medium", className: "text-amber-600" };

    const due = new Date(task.deadline).getTime();
    const days = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return { label: "High", className: "text-red-500" };
    return { label: "Medium", className: "text-amber-600" };
}

export default function ProjectClient({ initialData }: { initialData: ProjectDetails }) {
    const params = useParams<{ id: string }>();
    const projectId = params?.id ?? initialData.project._id;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [project, setProject] = useState<ProjectDetails["project"]>(initialData.project);
    const [membership, setMembership] = useState<ProjectDetails["membership"]>(initialData.membership);
    const [members, setMembers] = useState<ProjectMember[]>(initialData.members);
    const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskComments, setTaskComments] = useState<Record<string, string[]>>({});
    const [commentDraft, setCommentDraft] = useState("");

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTaskParent, setNewTaskParent] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [taskMessage, setTaskMessage] = useState("");
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const [deletingTask, setDeletingTask] = useState(false);

    const [showOverviewModal, setShowOverviewModal] = useState(false);
    const [overviewForm, setOverviewForm] = useState({ description: project.description || "" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [overviewSubmitting, setOverviewSubmitting] = useState(false);
    const [overviewMessage, setOverviewMessage] = useState("");

    const canManageTasks = membership?.role === "MASTER";

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
            if (res.ok) {
                const data: ProjectDetails = await res.json();
                setProject(data.project);
                setMembership(data.membership);
                setMembers(data.members);
                setOverviewForm({ description: data.project.description || "" });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchTasks = async () => {
        try {
            const params = new URLSearchParams({
                projectId,
                page: "1",
                limit: "200",
            });
            const res = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const rootTasks = useMemo(() => buildTaskTree(tasks), [tasks]);
    const selectedTask = useMemo(
        () => findTaskNode(rootTasks, selectedTaskId),
        [rootTasks, selectedTaskId]
    );
    const selectedPriority = useMemo(() => getPriority(selectedTask), [selectedTask]);

    const toggleExpand = (taskId: string) => {
        setExpanded((prev) => ({ ...prev, [taskId]: prev[taskId] === false ? true : !prev[taskId] }));
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        setTasks((prev) =>
            prev.map((task) =>
                task._id === taskId ? { ...task, status: newStatus as TaskStatus } : task
            )
        );

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                fetchTasks();
            }
        } catch {
            fetchTasks();
        }
    };

    const handleDelete = async () => {
        if (!deletingTaskId) return;
        setDeletingTask(true);
        try {
            const res = await fetch(`/api/tasks/${deletingTaskId}`, { method: "DELETE" });
            if (res.ok) {
                if (selectedTaskId === deletingTaskId) {
                    setSelectedTaskId(null);
                }
                setDeletingTaskId(null);
                fetchTasks();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setDeletingTask(false);
        }
    };

    const submitComment = () => {
        if (!selectedTaskId || !commentDraft.trim()) return;

        setTaskComments((prev) => ({
            ...prev,
            [selectedTaskId]: [...(prev[selectedTaskId] || []), commentDraft.trim()],
        }));
        setCommentDraft("");
    };

    const closeTaskModal = () => {
        setShowTaskModal(false);
        setNewTaskParent(null);
        setEditingTask(null);
        setTaskForm(DEFAULT_TASK_FORM);
        setTaskMessage("");
    };

    const openAddModal = (parentId: string | null = null) => {
        setEditingTask(null);
        setNewTaskParent(parentId);
        setTaskForm(DEFAULT_TASK_FORM);
        setTaskMessage("");
        setShowTaskModal(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setNewTaskParent(task.parentTaskId || null);
        setTaskForm({
            title: task.title,
            description: task.description || "",
            assignedTo: task.assignedTo?._id || "",
            deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : "",
            status: task.status,
        });
        setTaskMessage("");
        setShowTaskModal(true);
    };

    const submitTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.title.trim()) return;

        setSubmitting(true);
        setTaskMessage("");

        const payload = {
            projectId,
            title: taskForm.title,
            description: taskForm.description,
            assignedTo: taskForm.assignedTo || null,
            deadline: taskForm.deadline || null,
            status: taskForm.status,
            parentTaskId: editingTask ? editingTask.parentTaskId || null : newTaskParent,
        };

        try {
            const res = await fetch(editingTask ? `/api/tasks/${editingTask._id}` : "/api/tasks", {
                method: editingTask ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok) {
                closeTaskModal();
                fetchTasks();
            } else {
                setTaskMessage(data.message || "Failed to save task");
            }
        } catch (error) {
            console.error(error);
            setTaskMessage("Failed to save task");
        } finally {
            setSubmitting(false);
        }
    };

    const openOverviewModal = () => {
        setOverviewForm({ description: project?.description || "" });
        setSelectedFile(null);
        setOverviewMessage("");
        setShowOverviewModal(true);
    };

    const closeOverviewModal = () => {
        setShowOverviewModal(false);
        setSelectedFile(null);
        setOverviewMessage("");
    };

    const submitOverview = async (e: React.FormEvent) => {
        e.preventDefault();
        setOverviewSubmitting(true);
        setOverviewMessage("");

        try {
            let documentUrl = project?.documentUrl || "";
            let documentName = project?.documentName || "";

            if (selectedFile) {
                const formData = new FormData();
                formData.append("file", selectedFile);
                const uploadRes = await fetch(`/api/projects/${projectId}/upload`, {
                    method: "POST",
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    setOverviewMessage(uploadData.message || "File upload failed");
                    setOverviewSubmitting(false);
                    return;
                }

                const uploadData = await uploadRes.json();
                documentUrl = uploadData.documentUrl;
                documentName = uploadData.documentName;
            }

            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: project?.name,
                    description: overviewForm.description,
                    documentUrl,
                    documentName,
                }),
            });

            if (res.ok) {
                await fetchProject();
                closeOverviewModal();
            } else {
                const data = await res.json();
                setOverviewMessage(data.message || "Failed to save overview");
            }
        } catch (error) {
            console.error(error);
            setOverviewMessage("Something went wrong");
        } finally {
            setOverviewSubmitting(false);
        }
    };

    const stats = useMemo(() => {
        const completed = tasks.filter((task) => task.status === "Done").length;
        const upcoming = tasks
            .map((task) => task.deadline)
            .filter(Boolean)
            .map((deadline) => new Date(deadline as string))
            .filter((date) => !Number.isNaN(date.getTime()))
            .sort((a, b) => a.getTime() - b.getTime())[0];

        if (!upcoming) {
            return { total: tasks.length, completed, deadlineLabel: "No deadline", deadlineTone: "text-neutral-500 dark:text-neutral-400" };
        }

        const diff = Math.ceil((upcoming.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
            total: tasks.length,
            completed,
            deadlineLabel: diff <= 0 ? "Due now" : `${diff} Day${diff === 1 ? "" : "s"} Left`,
            deadlineTone: diff <= 7 ? "text-red-500" : "text-amber-500",
        };
    }, [tasks]);

    const renderRows = (nodes: TaskNode[], level = 0): React.ReactNode[] =>
        nodes.flatMap((task) => {
            const isExpanded = expanded[task._id] !== false;
            const hasChildren = task.children.length > 0;
            const avatar = task.assignedTo?.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

            const row = (
                <div
                    key={task._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTaskId(task._id)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedTaskId(task._id);
                        }
                    }}
                    className={`grid min-w-[980px] grid-cols-[minmax(0,1.9fr)_220px_220px_180px] items-center border-t border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] px-6 py-5 ${level > 0 ? "text-base" : "text-[17px]"
                        } cursor-pointer transition hover:bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)]/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/20`}
                >
                    <div className="flex items-center gap-4">
                        <div style={{ width: level * 28 }} className="shrink-0" />
                        {level === 0 ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (hasChildren) toggleExpand(task._id);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
                            >
                                {hasChildren ? (
                                    isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                                ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-surface" />
                                )}
                            </button>
                        ) : (
                            <span className="ml-1 h-2 w-2 rounded-full bg-surface" />
                        )}

                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <span className={`truncate ${level === 0 ? "font-medium text-slate-950" : "text-neutral-700 dark:text-neutral-300"}`}>
                                    {task.title}
                                </span>
                                {canManageTasks && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openEditModal(task);
                                            }}
                                            className="rounded-lg p-1.5 text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openAddModal(task._id);
                                            }}
                                            className="rounded-lg p-1.5 text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setDeletingTaskId(task._id);
                                            }}
                                            className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {task.description && level === 0 && (
                                <p className="mt-2 truncate text-sm text-muted">{task.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-muted">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted">
                            {avatar || "NA"}
                        </div>
                        <span>{task.assignedTo?.name || "Unassigned"}</span>
                    </div>

                    <div className="text-muted">{formatDate(task.deadline)}</div>

                    <div className="flex items-center gap-3">
                        <span className={`rounded-full ${getStatusPill(task.status)}`}>
                            {task.status === "Pending" ? "To Do" : task.status}
                        </span>
                        <select
                            value={task.status}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => handleStatusChange(task._id, event.target.value)}
                            className="rounded-xl border border-border-subtle bg-[var(--color-light-surface)] px-3 py-2 text-sm text-muted"
                        >
                            <option value="Pending">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                </div>
            );

            return hasChildren && isExpanded ? [row, ...renderRows(task.children, level + 1)] : [row];
        });

    const renderMobileCards = (nodes: TaskNode[], level = 0): React.ReactNode[] =>
        nodes.flatMap((task) => {
            const isExpanded = expanded[task._id] !== false;
            const hasChildren = task.children.length > 0;
            const avatar = task.assignedTo?.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

            const card = (
                <article
                    key={`card-${task._id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTaskId(task._id)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedTaskId(task._id);
                        }
                    }}
                    className={`rounded-[22px] border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition hover:border-neutral-300 dark:border-neutral-700 hover:bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)]/40 focus:outline-none focus:ring-4 focus:ring-brand/20 ${level > 0 ? "bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)]/70" : ""
                        }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                {level > 0 ? (
                                    <span className="rounded-full bg-surface/60 border border-border-subtle px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted backdrop-blur-sm">
                                        Subtask
                                    </span>
                                ) : null}
                                <span className={`rounded-full ${getStatusPill(task.status)}`}>
                                    {task.status === "Pending" ? "To Do" : task.status}
                                </span>
                            </div>

                            <h3 className="mt-3 text-lg font-semibold tracking-tight text-muted">
                                {task.title}
                            </h3>

                            {task.description ? (
                                <p className="mt-2 text-sm leading-6 text-muted">{task.description}</p>
                            ) : null}
                        </div>

                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    toggleExpand(task._id);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-[var(--color-light-surface)] text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
                            >
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                        ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-[var(--color-light-bg)] px-3.5 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                                Assignee
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted">
                                    {avatar || "NA"}
                                </div>
                                <span className="text-sm text-muted">
                                    {task.assignedTo?.name || "Unassigned"}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-[var(--color-light-bg)] px-3.5 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                                Due Date
                            </p>
                            <p className="mt-2 text-sm text-muted">{formatDate(task.deadline)}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <select
                            value={task.status}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => handleStatusChange(task._id, event.target.value)}
                            className="w-full rounded-xl border border-border-subtle bg-[var(--color-light-surface)] px-3 py-2.5 text-sm text-muted sm:w-auto"
                        >
                            <option value="Pending">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>

                        {canManageTasks ? (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openEditModal(task);
                                    }}
                                    className="rounded-xl border border-border-subtle px-3 py-2 text-sm font-medium text-muted transition hover:bg-[var(--color-light-bg)]"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openAddModal(task._id);
                                    }}
                                    className="rounded-xl border border-border-subtle px-3 py-2 text-sm font-medium text-muted transition hover:bg-[var(--color-light-bg)]"
                                >
                                    Add Subtask
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setDeletingTaskId(task._id);
                                    }}
                                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                    Delete
                                </button>
                            </div>
                        ) : null}
                    </div>
                </article>
            );

            const children =
                hasChildren && isExpanded ? (
                    <div
                        key={`children-${task._id}`}
                        className="ml-4 border-l border-dashed border-border-subtle pl-4"
                    >
                        <div className="space-y-3">{renderMobileCards(task.children, level + 1)}</div>
                    </div>
                ) : null;

            return children ? [card, children] : [card];
        });

    return (
        <div className="min-h-full bg-base">
            <section className="border-b border-border-subtle bg-[var(--color-light-surface)] px-4 py-7 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                            <Link href="/projects" className="hover:text-primary">
                                Projects
                            </Link>
                            <span>/</span>
                            <span className="text-muted">{project?.name || "Project Workspace"}</span>
                        </div>

                        <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-muted sm:text-3xl">
                            {project?.name || "Project Workspace"}
                        </h1>
                        <p className="mt-2.5 max-w-4xl text-sm leading-6 text-muted">
                            {project?.description || "Design and implementation work is organized here with tasks, owners, and due dates."}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                            <Link href={`/project/${projectId}/settings`} className="inline-flex items-center gap-2 text-muted transition hover:text-primary">
                                <Settings size={16} />
                                Project settings
                            </Link>
                            {project?.documentUrl && (
                                <a
                                    href={project.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-muted transition hover:text-primary"
                                >
                                    <FileText size={16} />
                                    {project.documentName || "View document"}
                                </a>
                            )}
                            {canManageTasks && (
                                <button
                                    type="button"
                                    onClick={openOverviewModal}
                                    className="inline-flex items-center gap-2 text-muted transition hover:text-primary"
                                >
                                    <Pencil size={16} />
                                    Edit overview
                                </button>
                            )}
                        </div>
                    </div>

                    {canManageTasks && (
                        <button
                            type="button"
                            onClick={() => openAddModal(null)}
                            className="btn-primary w-full px-4 py-2.5 sm:w-auto"
                        >
                            <Plus size={20} />
                            Add Task
                        </button>
                    )}
                </div>
            </section>

            <section className="px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-[1040px]">
                    <div className="overflow-hidden rounded-[24px] border border-border-subtle bg-[var(--color-light-surface)] shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
                        {loading ? (
                            <div className="px-6 py-10 text-sm text-muted">Loading tasks...</div>
                        ) : tasks.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => openAddModal(null)}
                                className="flex w-full items-center gap-3 px-6 py-5 text-left text-base text-muted transition hover:bg-[var(--color-light-bg)] hover:text-primary"
                            >
                                <Plus size={18} />
                                Add a new task...
                            </button>
                        ) : (
                            <>
                                <div className="space-y-3 p-4 lg:hidden">{renderMobileCards(rootTasks)}</div>

                                <div className="hidden lg:block">
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[980px]">
                                            <div className="grid grid-cols-[minmax(0,1.9fr)_220px_220px_180px] bg-[var(--color-light-bg)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                                                <div>Task Name</div>
                                                <div>Assignee</div>
                                                <div>Due Date</div>
                                                <div>Status</div>
                                            </div>
                                            {renderRows(rootTasks)}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openAddModal(null)}
                                    className="flex w-full items-center gap-3 border-t border-border-subtle px-4 py-5 text-left text-base text-muted transition hover:bg-[var(--color-light-bg)] hover:text-primary sm:px-6"
                                >
                                    <Plus size={18} />
                                    Add a new task...
                                </button>
                            </>
                        )}
                    </div>

                    <div className="mt-8 grid gap-5 lg:grid-cols-3">
                        <div className="rounded-[22px] border border-border-subtle bg-[var(--color-light-surface)] px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
                            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Total Tasks</p>
                            <p className="mt-2.5 text-2xl font-semibold tracking-tight text-muted">{stats.total}</p>
                        </div>
                        <div className="rounded-[22px] border border-border-subtle bg-[var(--color-light-surface)] px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
                            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Completed</p>
                            <p className="mt-2.5 text-2xl font-semibold tracking-tight text-emerald-600">{stats.completed}</p>
                        </div>
                        <div className="rounded-[22px] border border-border-subtle bg-[var(--color-light-surface)] px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
                            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Deadline</p>
                            <p className={`mt-2.5 text-2xl font-semibold tracking-tight ${stats.deadlineTone}`}>{stats.deadlineLabel}</p>
                        </div>
                    </div>

                </div>
            </section>

            {showTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
                    <div className="modal-surface w-full max-w-xl p-7">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-semibold text-muted">
                                {editingTask ? "Edit Task" : newTaskParent ? "Add Subtask" : "Add New Task"}
                            </h3>
                            <button
                                type="button"
                                onClick={closeTaskModal}
                                className="rounded-full p-2 text-muted hover:bg-[var(--color-light-bg)] hover:text-muted"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={submitTask} className="mt-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-muted">Task Title</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        className="w-full rounded-2xl border border-border-subtle px-4 py-3 text-muted focus:border-primary"
                                        placeholder="What needs to be done?"
                                        value={taskForm.title}
                                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-muted">Description</label>
                                    <textarea
                                        rows={3}
                                        className="w-full rounded-2xl border border-border-subtle px-4 py-3 text-muted focus:border-primary placeholder:text-muted"
                                        placeholder="Add more details about this task..."
                                        value={taskForm.description}
                                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-muted">Assignee</label>
                                        <select
                                            className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] px-4 py-3 text-muted focus:border-primary"
                                            value={taskForm.assignedTo}
                                            onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                                        >
                                            <option value="">Select Assignee</option>
                                            {members.map((m) => (
                                                <option key={m.user._id} value={m.user._id}>
                                                    {m.user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-muted">Due Date</label>
                                        <input
                                            type="date"
                                            className="w-full rounded-2xl border border-border-subtle px-4 py-3 text-muted focus:border-primary"
                                            value={taskForm.deadline}
                                            onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-muted">Status</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["Pending", "In Progress", "Done"].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setTaskForm({ ...taskForm, status: s as TaskStatus })}
                                                className={`rounded-xl border py-3 text-sm font-semibold transition ${taskForm.status === s
                                                    ? "border-primary bg-primary text-white"
                                                    : "border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:border-neutral-700 hover:bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)]"
                                                    }`}
                                            >
                                                {s === "Pending" ? "To Do" : s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {taskMessage && <p className="mt-6 text-sm font-medium text-red-500">{taskMessage}</p>}

                            <div className="mt-10 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeTaskModal}
                                    className="btn-danger px-6 py-3"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`${editingTask ? "btn-warning" : "btn-success"} px-8 py-3`}
                                >
                                    {submitting ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showOverviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
                    <div className="modal-surface w-full max-w-xl p-7">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-semibold text-muted">Update Project Details</h3>
                            <button
                                type="button"
                                onClick={closeOverviewModal}
                                className="rounded-full p-2 text-muted hover:bg-[var(--color-light-bg)] hover:text-muted"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={submitOverview} className="mt-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-muted">Project Description</label>
                                    <textarea
                                        rows={4}
                                        className="w-full rounded-2xl border border-border-subtle px-4 py-3 text-muted focus:border-primary"
                                        placeholder="What is this project about?"
                                        value={overviewForm.description}
                                        onChange={(e) => setOverviewForm({ ...overviewForm, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-muted">Attachment (PDF, Image, Doc)</label>
                                    <div className="flex flex-col gap-3">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-subtle bg-[var(--color-light-bg)] py-8 text-muted transition hover:border-primary hover:bg-base"
                                        >
                                            {selectedFile ? (
                                                <div className="flex items-center gap-2 font-medium text-muted">
                                                    <FileText size={20} />
                                                    {selectedFile.name}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Plus size={24} />
                                                    <span className="text-sm font-medium">Click to select a file</span>
                                                </div>
                                            )}
                                        </button>
                                        {project.documentUrl && !selectedFile && (
                                            <p className="text-xs text-muted">Current file: {project.documentName}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {overviewMessage && <p className="mt-6 text-sm font-medium text-red-500">{overviewMessage}</p>}

                            <div className="mt-10 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeOverviewModal}
                                    className="btn-danger px-6 py-3"
                                    disabled={overviewSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={overviewSubmitting}
                                    className="btn-warning px-8 py-3"
                                >
                                    {overviewSubmitting ? "Updating..." : "Save Overview"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!deletingTaskId}
                title="Delete Task"
                description="This task will be deleted permanently. Child subtasks will also be removed."
                confirmLabel="Delete Task"
                loading={deletingTask}
                onCancel={() => setDeletingTaskId(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
