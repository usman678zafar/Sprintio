"use client";

import { useEffect, useState } from "react";
import { UserMinus } from "lucide-react";

interface MemberListProps {
  projectId: string;
}

export default function MemberList({ projectId }: MemberListProps) {
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
  }, [projectId]);

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

  if (loading) return <div className="text-gray-500">Loading members...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800">Project Members</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {members.map((m) => (
          <div key={m._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {m.userId.name ? m.userId.name[0].toUpperCase() : "U"}
              </div>
              <div>
                <div className="font-medium text-gray-800">{m.userId.name}</div>
                <div className="text-sm text-gray-500">{m.userId.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m._id, e.target.value)}
                className="bg-transparent border border-gray-200 text-sm rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:border-primary"
              >
                <option value="MASTER">MASTER</option>
                <option value="MEMBER">MEMBER</option>
              </select>
              <button
                onClick={() => handleRemoveMember(m._id)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition"
              >
                <UserMinus size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
