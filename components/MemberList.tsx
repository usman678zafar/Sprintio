"use client";

import { useEffect, useState } from "react";
import { UserMinus } from "lucide-react";

interface MemberListProps {
  projectId: string;
  canManageMembers: boolean;
  refreshKey?: number;
}

export default function MemberList({ projectId, canManageMembers, refreshKey = 0 }: MemberListProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId, refreshKey]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/role?memberId=${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-slate-400">Loading members...</div>;

  return (
    <div className="bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] dark:bg-[var(--color-dark-surface)] rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden mt-6 transition-all duration-300">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-surface-dark/50">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100">Project Members</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
        {members.map((m) => (
          <div key={m._id} className="flex flex-col gap-4 p-4 transition hover:bg-gray-50 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {m.userId.name ? m.userId.name[0].toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-800 dark:text-slate-100">{m.userId.name}</div>
                <div className="truncate text-sm text-gray-500 dark:text-slate-400">{m.userId.email}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              {canManageMembers ? (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m._id, e.target.value)}
                    className="min-w-[130px] bg-transparent border border-gray-200 dark:border-slate-700 text-sm rounded-md px-2 py-1 text-gray-700 dark:text-slate-300 focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="MASTER" className="dark:bg-surface-dark">MASTER</option>
                    <option value="MEMBER" className="dark:bg-surface-dark">MEMBER</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(m._id)}
                    className="p-1.5 text-gray-400 dark:text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <UserMinus size={18} />
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 border border-transparent dark:border-slate-700">
                  {m.role}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
