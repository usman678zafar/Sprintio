"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import MemberList from "@/components/MemberList";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const canManageMembers = project?.membership?.role === "MASTER";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    setMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("User invited successfully!");
        setInviteEmail("");
        setRefreshKey((prev) => prev + 1);
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (e: any) {
      setMessage("Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <Link href={`/project/${projectId}`} className="mb-4 inline-flex items-center gap-2 font-medium text-primary hover:underline">
          <ArrowLeft size={18} />
          Back to {project?.project ? project.project.name : "Project"}
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800 sm:text-3xl">Project Settings</h2>
      </div>

      <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <UserPlus size={20} className="text-primary" />
          Invite Team Member
        </h3>

        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${message.startsWith("Error") ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
            {message}
          </div>
        )}

        {canManageMembers ? (
          <form onSubmit={handleInvite} className="grid max-w-2xl gap-4 lg:grid-cols-[minmax(0,1fr)_160px_auto] lg:items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-white"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={inviting}
              >
                <option value="MEMBER">MEMBER</option>
                <option value="MASTER">MASTER</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="h-[42px] rounded bg-primary px-6 py-2 font-medium text-white transition hover:bg-purple-700 disabled:opacity-70"
            >
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">
            You can view project members here, but only a MASTER can invite people or change roles.
          </p>
        )}
      </div>

      <MemberList projectId={projectId} canManageMembers={canManageMembers} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
