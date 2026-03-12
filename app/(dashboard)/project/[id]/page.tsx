"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import TaskTree from "@/components/TaskTree";

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

const DEFAULT_TASK_FORM = {
  title: "",
  description: "",
  assignedTo: "",
  deadline: "",
  status: "Pending" as TaskStatus,
};

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetails["project"] | null>(null);
  const [membership, setMembership] = useState<ProjectDetails["membership"] | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTaskParent, setNewTaskParent] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const canManageTasks = membership?.role === "MASTER";

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data: ProjectDetails = await res.json();
        setProject(data.project);
        setMembership(data.membership);
        setMembers(data.members);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [projectId]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map((task) => (task._id === taskId ? { ...task, status: newStatus as TaskStatus } : task)));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        fetchTasks();
      }
    } catch (e) {
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
    } catch (e) {
      console.error(e);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setNewTaskParent(null);
    setEditingTask(null);
    setTaskForm(DEFAULT_TASK_FORM);
    setMessage("");
  };

  const openAddModal = (parentId: string | null = null) => {
    setEditingTask(null);
    setNewTaskParent(parentId);
    setTaskForm(DEFAULT_TASK_FORM);
    setMessage("");
    setShowModal(true);
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
    setMessage("");
    setShowModal(true);
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    setSubmitting(true);
    setMessage("");

    const isEditing = Boolean(editingTask);
    const payload = {
      projectId,
      title: taskForm.title,
      description: taskForm.description,
      assignedTo: taskForm.assignedTo || null,
      deadline: taskForm.deadline || null,
      status: taskForm.status,
      parentTaskId: isEditing ? editingTask?.parentTaskId || null : newTaskParent,
    };

    try {
      const res = await fetch(isEditing ? `/api/tasks/${editingTask?._id}` : "/api/tasks", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        closeModal();
        fetchTasks();
      } else {
        setMessage(data.message || "Failed to save task");
      }
    } catch (e) {
      console.error(e);
      setMessage("Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {project ? project.name : "Project Tasks"}
          </h2>
          {project && <p className="text-gray-500 text-sm">Manage tasks for this project</p>}
        </div>
        <div className="flex gap-3">
          <Link href={`/project/${projectId}/settings`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm">
            <Settings size={18} />
            Settings
          </Link>
          {canManageTasks && (
            <button
              onClick={() => openAddModal(null)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
            >
              <Plus size={18} />
              Add Task
            </button>
          )}
        </div>
      </div>

      {membership && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Your role in this project: <span className="font-semibold text-gray-800">{membership.role}</span>
          {canManageTasks
            ? " . You can create, edit, assign, and remove tasks."
            : " . You can only update the status of tasks assigned to you."}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading tasks...</div>
      ) : (
        <TaskTree
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onAddSubtask={openAddModal}
          onEdit={openEditModal}
          canManageTasks={canManageTasks}
          currentUserId={membership?.userId}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingTask ? "Edit Task" : newTaskParent ? "Create Subtask" : "Create New Task"}
            </h3>
            <form onSubmit={submitTask}>
              {message && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {message}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition bg-white"
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                      disabled={submitting}
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member._id} value={member.user._id}>
                          {member.user.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, deadline: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition bg-white"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value as TaskStatus }))}
                    disabled={submitting}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-70"
                >
                  {submitting ? "Saving..." : editingTask ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
