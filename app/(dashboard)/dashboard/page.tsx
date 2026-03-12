"use client";

import { useEffect, useState } from "react";
import ProjectCard from "@/components/ProjectCard";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
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
        fetchProjects(); // refresh list
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-800">Your Projects</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
        >
          <Plus size={18} />
          Add Project
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
          <h3 className="text-xl font-medium text-gray-600 mb-2">No projects yet</h3>
          <p className="text-gray-400">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <ProjectCard
              key={p._id}
              id={p._id}
              name={p.name}
              memberCount={1} // To be updated via agg or separate api
              taskCount={0}   // To be updated via agg or separate api
            />
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-70"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
