"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  if (status === "Done") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "In Progress") {
    return "bg-blue-100 text-primary";
  }
  return "bg-amber-100 text-amber-700";
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

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<ProjectDetails["project"] | null>(null);
  const [membership, setMembership] = useState<ProjectDetails["membership"] | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [overviewForm, setOverviewForm] = useState({ description: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [overviewSubmitting, setOverviewSubmitting] = useState(false);
  const [overviewMessage, setOverviewMessage] = useState("");

  const canManageTasks = membership?.role === "MASTER";

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
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
      const res = await fetch(`/api/tasks?projectId=${projectId}`);
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

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [projectId]);

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

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error(error);
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
      return { total: tasks.length, completed, deadlineLabel: "No deadline", deadlineTone: "text-slate-500" };
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
          className={`grid min-w-[980px] grid-cols-[minmax(0,1.9fr)_220px_220px_180px] items-center border-t border-slate-200 bg-white px-6 py-5 ${
            level > 0 ? "text-base" : "text-[17px]"
          } cursor-pointer transition hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-100`}
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                )}
              </button>
            ) : (
              <span className="ml-1 h-2 w-2 rounded-full bg-slate-200" />
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className={`truncate ${level === 0 ? "font-medium text-slate-950" : "text-slate-700"}`}>
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
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openAddModal(task._id);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(task._id);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              {task.description && level === 0 && (
                <p className="mt-2 truncate text-sm text-slate-500">{task.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              {avatar || "NA"}
            </div>
            <span>{task.assignedTo?.name || "Unassigned"}</span>
          </div>

          <div className="text-slate-600">{formatDate(task.deadline)}</div>

          <div className="flex items-center gap-3">
            <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${getStatusPill(task.status)}`}>
              {task.status === "Pending" ? "To Do" : task.status}
            </span>
            <select
              value={task.status}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => handleStatusChange(task._id, event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500"
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

  return (
    <div className="min-h-full bg-[#f6f8fc]">
      <section className="border-b border-slate-200 bg-white px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Link href="/projects" className="hover:text-primary">
                Projects
              </Link>
              <span>/</span>
              <span className="text-slate-600">{project?.name || "Project Workspace"}</span>
            </div>

            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {project?.name || "Project Workspace"}
            </h1>
            <p className="mt-2.5 max-w-4xl text-sm leading-6 text-slate-500">
              {project?.description || "Design and implementation work is organized here with tasks, owners, and due dates."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <Link href={`/project/${projectId}/settings`} className="inline-flex items-center gap-2 text-slate-500 transition hover:text-primary">
                <Settings size={16} />
                Project settings
              </Link>
              {project?.documentUrl && (
                <a
                  href={project.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-slate-500 transition hover:text-primary"
                >
                  <FileText size={16} />
                  {project.documentName || "View document"}
                </a>
              )}
              {canManageTasks && (
                <button
                  type="button"
                  onClick={openOverviewModal}
                  className="inline-flex items-center gap-2 text-slate-500 transition hover:text-primary"
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
              className="inline-flex items-center gap-2.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_32px_rgba(37,99,235,0.24)] transition hover:bg-blue-700"
            >
              <Plus size={20} />
              Add Task
            </button>
          )}
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1040px]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="min-w-[980px] grid grid-cols-[minmax(0,1.9fr)_220px_220px_180px] bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <div>Task Name</div>
            <div>Assignee</div>
            <div>Due Date</div>
            <div>Status</div>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-sm text-slate-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <button
              type="button"
              onClick={() => openAddModal(null)}
              className="flex w-full items-center gap-3 border-t border-slate-200 px-6 py-5 text-left text-base text-slate-400 transition hover:bg-slate-50 hover:text-primary"
            >
              <Plus size={18} />
              Add a new task...
            </button>
          ) : (
            <>
              <div className="overflow-x-auto">{renderRows(rootTasks)}</div>
              <button
                type="button"
                onClick={() => openAddModal(null)}
                className="flex w-full items-center gap-3 border-t border-slate-200 px-6 py-5 text-left text-base text-slate-400 transition hover:bg-slate-50 hover:text-primary"
              >
                <Plus size={18} />
                Add a new task...
              </button>
            </>
          )}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Total Tasks</p>
            <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-950">{stats.total}</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Completed</p>
            <p className="mt-2.5 text-2xl font-semibold tracking-tight text-emerald-600">{stats.completed}</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Deadline</p>
            <p className={`mt-2.5 text-2xl font-semibold tracking-tight ${stats.deadlineTone}`}>{stats.deadlineLabel}</p>
          </div>
        </div>

        <p className="mt-16 text-center text-sm text-slate-400">
          Copyright 2026 Sprintio Project Management. All rights reserved.
        </p>
        </div>
      </section>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">
                  {editingTask ? "Edit Task" : newTaskParent ? "Create Subtask" : "Create New Task"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in the details to {editingTask ? "update" : "add"} the task.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTaskModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitTask} className="mt-6">
              {taskMessage && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {taskMessage}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Task Title</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={taskForm.title}
                    onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Description</label>
                  <textarea
                    rows={4}
                    value={taskForm.description}
                    onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">Assignee</label>
                    <select
                      value={taskForm.assignedTo}
                      onChange={(event) => setTaskForm((prev) => ({ ...prev, assignedTo: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member._id} value={member.user._id}>
                          {member.user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">Deadline</label>
                    <input
                      type="date"
                      value={taskForm.deadline}
                      onChange={(event) => setTaskForm((prev) => ({ ...prev, deadline: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(event) => setTaskForm((prev) => ({ ...prev, status: event.target.value as TaskStatus }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="Pending">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="rounded-2xl px-4 py-3 font-medium text-slate-500 transition hover:bg-slate-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {submitting ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOverviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Edit Project Overview</h3>
                <p className="mt-1 text-sm text-slate-500">Update the project description and documentation.</p>
              </div>
              <button
                type="button"
                onClick={closeOverviewModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitOverview} className="mt-6">
              {overviewMessage && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {overviewMessage}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Project Description</label>
                  <textarea
                    rows={6}
                    value={overviewForm.description}
                    onChange={(event) => setOverviewForm({ description: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Project Document</label>
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6">
                    {(selectedFile || project?.documentName) && (
                      <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-white p-2 text-primary shadow-sm">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {selectedFile?.name || project?.documentName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {selectedFile ? "Ready to upload" : "Current file"}
                            </p>
                          </div>
                        </div>
                        {project?.documentUrl && !selectedFile && (
                          <a
                            href={project.documentUrl}
                            download={project.documentName}
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
                          >
                            <Download size={16} />
                            Download
                          </a>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      <FileText size={18} />
                      {project?.documentName ? "Replace document" : "Upload document"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeOverviewModal}
                  className="rounded-2xl px-4 py-3 font-medium text-slate-500 transition hover:bg-slate-50"
                  disabled={overviewSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overviewSubmitting}
                  className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {overviewSubmitting ? "Saving..." : "Update Overview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => setSelectedTaskId(null)}
          />
          <aside className="fixed inset-y-2 right-2 z-50 flex w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:w-[560px]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="rounded-xl bg-blue-50 px-3 py-1 text-sm font-medium text-primary">
                  TSK-{selectedTask._id.slice(-4).toUpperCase()}
                </span>
                <span>{project?.name || "Project"}</span>
                <span className="text-slate-300">/</span>
                <span>Task Details</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard?.writeText(window.location.href);
                    }
                  }}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <Share2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(null)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-[32px]">
                {selectedTask.title}
              </h2>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Assignee</p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <UserCircle2 size={20} />
                    </div>
                    <span className="text-base text-slate-900">
                      {selectedTask.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
                  <div className="mt-2.5">
                    <span className={`rounded-2xl border px-3.5 py-1.5 text-base font-medium ${getStatusPill(selectedTask.status)} border-current/20`}>
                      {selectedTask.status === "Pending" ? "To Do" : selectedTask.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Priority</p>
                  <div className={`mt-2.5 inline-flex items-center gap-2 text-base font-medium ${selectedPriority.className}`}>
                    <Flag size={18} />
                    {selectedPriority.label}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Due Date</p>
                  <div className="mt-2.5 text-base text-slate-900">
                    {formatDate(selectedTask.deadline)}
                  </div>
                </div>
              </div>

              <section className="mt-8">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-500" />
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">Description</h3>
                </div>
                <div className="mt-3.5 space-y-3 text-sm leading-6 text-slate-600">
                  <p>
                    {selectedTask.description ||
                      "No detailed description has been added to this task yet."}
                  </p>
                </div>
              </section>

              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ListChecks size={18} className="text-primary" />
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">Checklist</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedTask.children.length > 0
                      ? `${selectedTask.children.filter((child) => child.status === "Done").length} of ${selectedTask.children.length} complete`
                      : `${selectedTask.status === "Done" ? 1 : 0} of 1 complete`}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${
                        selectedTask.children.length > 0
                          ? (selectedTask.children.filter((child) => child.status === "Done").length / selectedTask.children.length) * 100
                          : selectedTask.status === "Done"
                            ? 100
                            : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="mt-4 space-y-3">
                  {(selectedTask.children.length > 0
                    ? selectedTask.children
                    : [
                        {
                          _id: `${selectedTask._id}-fallback`,
                          title: "Complete this task",
                          status: selectedTask.status,
                        },
                      ]
                  ).map((item) => {
                    const done = item.status === "Done";
                    return (
                      <div key={item._id} className="flex items-center gap-3 text-sm">
                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full border ${
                            done
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {done && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>
                        <span className={done ? "text-slate-400 line-through" : "text-slate-800"}>
                          {item.title}
                        </span>
                      </div>
                    );
                  })}
                  {canManageTasks && (
                    <button
                      type="button"
                      onClick={() => openAddModal(selectedTask._id)}
                      className="pt-1 text-sm font-medium text-primary"
                    >
                      + Add an item
                    </button>
                  )}
                </div>
              </section>

              <section className="mt-8">
                <div className="flex items-center gap-3">
                  <Download size={18} className="text-slate-500" />
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">Attachments</h3>
                </div>
                <div className="mt-4 grid gap-3">
                  {project?.documentUrl && project?.documentName ? (
                    <a
                      href={project.documentUrl}
                      download={project.documentName}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="rounded-xl bg-red-50 p-2.5 text-red-500">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {project.documentName}
                        </p>
                        <p className="text-xs text-slate-500">Project attachment</p>
                      </div>
                    </a>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-400">
                      No attachments are available for this task yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-8">
                <div className="flex items-center gap-3">
                  <Pencil size={18} className="text-slate-500" />
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">Quick Notes</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {(taskComments[selectedTask._id] || []).length === 0 ? (
                    <p className="text-xs text-slate-400">No notes yet for this task.</p>
                  ) : (
                    (taskComments[selectedTask._id] || []).map((comment, index) => (
                      <div
                        key={`${selectedTask._id}-comment-${index}`}
                        className="rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600"
                      >
                        {comment}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="border-t border-slate-200 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={submitComment}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Send size={18} />
                  Send
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
