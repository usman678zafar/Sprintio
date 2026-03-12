"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import MemberList from "@/components/MemberList";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");

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
        // Reload page to refresh member list component
        window.location.reload(); 
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/project/${projectId}`} className="inline-flex items-center gap-2 text-primary hover:underline font-medium mb-4">
          <ArrowLeft size={18} />
          Back to Project Tasks
        </Link>
        <h2 className="text-2xl font-semibold text-gray-800">Project Settings</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-primary" />
          Invite Team Member
        </h3>

        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${message.startsWith("Error") ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex items-end gap-4 max-w-2xl">
          <div className="flex-1">
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
          <div className="w-40">
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
            className="px-6 py-2 bg-primary text-white font-medium rounded hover:bg-purple-700 transition disabled:opacity-70 h-[42px]"
          >
            {inviting ? "Inviting..." : "Invite"}
          </button>
        </form>
      </div>

      <MemberList projectId={projectId} />
    </div>
  );
}
