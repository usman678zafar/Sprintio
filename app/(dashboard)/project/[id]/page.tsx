"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TaskTree from "@/components/TaskTree";
import { Plus, Settings } from "lucide-react";
import Link from "next/link";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskParent, setNewTaskParent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    fetchTasks();
  }, [projectId]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // optimistic update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      // revert if failed - for simplicity we just fetch
      fetchTasks();
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t._id !== taskId && t.parentTaskId !== taskId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: newTaskTitle,
          parentTaskId: newTaskParent
        })
      });
      if (res.ok) {
        setNewTaskTitle("");
        setShowModal(false);
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = (parentId: string | null = null) => {
    setNewTaskParent(parentId);
    setNewTaskTitle("");
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-800">Project Tasks</h2>
        <div className="flex gap-3">
          <Link href={`/project/${projectId}/settings`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm">
            <Settings size={18} />
            Settings
          </Link>
          <button
            onClick={() => openAddModal(null)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading tasks...</div>
      ) : (
        <TaskTree
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onAddSubtask={(parentId) => openAddModal(parentId)}
          onEdit={() => {}} // Not fully implemented in this MVP for brevity, can be expanded
          canEdit={true} // Hardcoded to true for demo, should be based on role
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {newTaskParent ? "Create Subtask" : "Create New Task"}
            </h3>
            <form onSubmit={submitTask}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
