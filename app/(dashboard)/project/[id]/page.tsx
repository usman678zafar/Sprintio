"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Settings, FileText, Upload, Eye, Download, X, Pencil } from "lucide-react";
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

  // Overview state
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [overviewForm, setOverviewForm] = useState({ description: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [overviewSubmitting, setOverviewSubmitting] = useState(false);
  const [overviewMessage, setOverviewMessage] = useState("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showOverviewDrawer, setShowOverviewDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const submitOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverviewSubmitting(true);
    setOverviewMessage("");

    try {
      let documentUrl = project?.documentUrl || "";
      let documentName = project?.documentName || "";

      // Upload file if selected
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

      // Update project overview description
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
    } catch (e) {
      console.error(e);
      setOverviewMessage("Something went wrong");
    } finally {
      setOverviewSubmitting(false);
    }
  };

  const isPdf = project?.documentName?.toLowerCase().endsWith(".pdf");

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
          <button
            onClick={() => setShowOverviewDrawer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm shadow-sm"
          >
            <FileText size={18} className="text-primary" />
            Overview
          </button>
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

      {/* Project Overview Drawer moved to bottom */}

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

      {/* Task Modal */}
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

      {/* Edit Overview Modal */}
      {showOverviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">Edit Project Overview</h3>
              <button onClick={closeOverviewModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitOverview}>
              {overviewMessage && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {overviewMessage}
                </div>
              )}

              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                  <textarea
                    rows={5}
                    placeholder="Describe the project goals, scope, and any important details..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition resize-none text-sm"
                    value={overviewForm.description}
                    onChange={(e) => setOverviewForm({ description: e.target.value })}
                    disabled={overviewSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Document</label>

                  {/* Current document display */}
                  {project?.documentName && !selectedFile && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200 mb-3">
                      <FileText size={16} className="text-primary flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">{project.documentName}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">Current file</span>
                    </div>
                  )}

                  {/* Selected new file display */}
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-primary/30 mb-3">
                      <FileText size={16} className="text-primary flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={overviewSubmitting}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition w-full justify-center"
                  >
                    <Upload size={16} />
                    {project?.documentName ? "Replace Document" : "Upload Document"} (PDF or Word)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={overviewSubmitting}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Supported formats: PDF, DOC, DOCX · Max size: 10 MB</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeOverviewModal}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                  disabled={overviewSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overviewSubmitting}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-70"
                >
                  {overviewSubmitting ? "Saving..." : "Save Overview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PDF Preview Modal */}
      {showPdfPreview && project?.documentUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <span className="font-semibold text-gray-800 text-sm truncate max-w-xs">{project.documentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={project.documentUrl}
                  download={project.documentName}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <Download size={14} />
                  Download
                </a>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`${project.documentUrl}#toolbar=1`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Project Overview Drawer */}
      {showOverviewDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-300"
            onClick={() => setShowOverviewDrawer(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Project Overview</h3>
                    <p className="text-xs text-gray-500">Details and documentation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOverviewDrawer(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {canManageTasks && (
                  <button
                    onClick={() => {
                      setShowOverviewDrawer(false);
                      openOverviewModal();
                    }}
                    className="flex items-center gap-2 w-full justify-center px-4 py-2.5 mb-6 text-sm font-semibold text-primary bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition group"
                  >
                    <Pencil size={16} className="group-hover:scale-110 transition-transform" />
                    Edit Project Overview
                  </button>
                )}

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Description</h4>
                    {project?.description ? (
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No description provided yet.</p>
                    )}
                  </div>

                  {project?.documentUrl && project?.documentName && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Attachment</h4>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center border border-gray-100">
                            <FileText size={20} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{project.documentName}</p>
                            <p className="text-xs text-gray-500">{isPdf ? "PDF Document" : "Word Document"}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isPdf && (
                            <button
                              onClick={() => setShowPdfPreview(true)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-purple-700 transition"
                            >
                              <Eye size={16} />
                              Preview
                            </button>
                          )}
                          <a
                            href={project.documentUrl}
                            download={project.documentName}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium ${isPdf ? "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50" : "text-white bg-primary hover:bg-purple-700"} rounded-lg transition`}
                          >
                            <Download size={16} />
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-gray-50 bg-gray-50/50">
                <p className="text-[11px] text-center text-gray-400 uppercase tracking-widest font-medium">Sprintio Project Dashboard</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

