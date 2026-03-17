"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

type Assignment = {
  membershipId: string;
  projectId: string;
  projectName: string;
  role: "MASTER" | "MEMBER";
  canManage: boolean;
  isSelf: boolean;
};

type TeamMember = {
  userId: string;
  name: string;
  email: string;
  roleSummary: "Admin" | "Member";
  assignments: Assignment[];
};

type TeamResponse = {
  currentUserId: string;
  manageableProjects: Array<{ projectId: string; projectName: string }>;
  members: TeamMember[];
};

const PAGE_SIZE = 5;

function roleBadge(role: string) {
  if (role === "Admin") return "bg-blue-100 text-primary";
  if (role === "Partner") return "bg-violet-100 text-violet-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [manageableProjects, setManageableProjects] = useState<
    Array<{ projectId: string; projectName: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [editing, setEditing] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [removeAssignmentId, setRemoveAssignmentId] = useState("");
  const [removing, setRemoving] = useState(false);
  const [removeMessage, setRemoveMessage] = useState("");

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data: TeamResponse = await res.json();
        setMembers(data.members);
        setManageableProjects(data.manageableProjects);
        if (!inviteProjectId && data.manageableProjects[0]) {
          setInviteProjectId(data.manageableProjects[0].projectId);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail || "");
      setPage(1);
    };

    window.addEventListener("team-search", handleSearch as EventListener);
    return () => window.removeEventListener("team-search", handleSearch as EventListener);
  }, []);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      const projects = member.assignments.map((assignment) => assignment.projectName.toLowerCase()).join(" ");
      return (
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        projects.includes(query)
      );
    });
  }, [members, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredMembers]);

  const resetInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("MEMBER");
    setInviteMessage("");
    if (manageableProjects[0]) {
      setInviteProjectId(manageableProjects[0].projectId);
    }
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteProjectId) return;

    setInviting(true);
    setInviteMessage("");
    try {
      const res = await fetch(`/api/projects/${inviteProjectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (res.ok) {
        resetInviteModal();
        fetchTeam();
      } else {
        setInviteMessage(data.message || "Failed to invite member");
      }
    } catch (error) {
      console.error(error);
      setInviteMessage("Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const openEditModal = (member: TeamMember) => {
    const manageableAssignments = member.assignments.filter((assignment) => assignment.canManage);
    if (manageableAssignments.length === 0) return;

    setEditingMember(member);
    setSelectedAssignmentId(manageableAssignments[0].membershipId);
    setSelectedRole(manageableAssignments[0].role);
    setEditMessage("");
  };

  const submitRoleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !selectedAssignmentId) return;

    const assignment = editingMember.assignments.find(
      (item) => item.membershipId === selectedAssignmentId
    );
    if (!assignment) return;

    setEditing(true);
    setEditMessage("");
    try {
      const res = await fetch(`/api/projects/${assignment.projectId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: assignment.membershipId, role: selectedRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingMember(null);
        fetchTeam();
      } else {
        setEditMessage(data.message || "Failed to update role");
      }
    } catch (error) {
      console.error(error);
      setEditMessage("Failed to update role");
    } finally {
      setEditing(false);
    }
  };

  const openRemoveModal = (member: TeamMember) => {
    const removableAssignments = member.assignments.filter(
      (assignment) => assignment.canManage && !assignment.isSelf
    );
    if (removableAssignments.length === 0) return;

    setRemovingMember(member);
    setRemoveAssignmentId(removableAssignments[0].membershipId);
    setRemoveMessage("");
  };

  const submitRemoval = async () => {
    if (!removingMember || !removeAssignmentId) return;

    const assignment = removingMember.assignments.find(
      (item) => item.membershipId === removeAssignmentId
    );
    if (!assignment) return;

    setRemoving(true);
    setRemoveMessage("");
    try {
      const res = await fetch(
        `/api/projects/${assignment.projectId}/role?memberId=${assignment.membershipId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (res.ok) {
        setRemovingMember(null);
        fetchTeam();
      } else {
        setRemoveMessage(data.message || "Failed to remove member");
      }
    } catch (error) {
      console.error(error);
      setRemoveMessage("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const assignmentOptions = editingMember
    ? editingMember.assignments.filter((assignment) => assignment.canManage)
    : [];

  const removableOptions = removingMember
    ? removingMember.assignments.filter((assignment) => assignment.canManage && !assignment.isSelf)
    : [];

  return (
    <div className="min-h-full bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1040px]">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Team Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your workspace members, their roles, and project assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          disabled={manageableProjects.length === 0}
          className="inline-flex items-center gap-2.5 self-start rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_32px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={20} />
          Invite New Member
        </button>
      </section>

      <section className="mt-10 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        <div className="grid min-w-[980px] grid-cols-[minmax(0,1.8fr)_220px_minmax(0,2fr)_120px] bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <div>Name</div>
          <div>Role</div>
          <div>Project Assignments</div>
          <div />
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading team members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            {members.length === 0 ? "No members found yet." : `No members match "${searchQuery}".`}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {pagedMembers.map((member) => {
                const canEdit = member.assignments.some((assignment) => assignment.canManage);
                const canRemove = member.assignments.some(
                  (assignment) => assignment.canManage && !assignment.isSelf
                );

                return (
                  <div
                    key={member.userId}
                    className="grid min-w-[980px] grid-cols-[minmax(0,1.8fr)_220px_minmax(0,2fr)_120px] items-center border-t border-slate-200 px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {member.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-medium tracking-tight text-slate-950">
                          {member.name}
                        </p>
                        <p className="truncate text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>

                    <div>
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${roleBadge(member.roleSummary)}`}>
                        {member.roleSummary}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {member.assignments.map((assignment) => (
                        <span
                          key={assignment.membershipId}
                          className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                        >
                          {assignment.projectName}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        disabled={!canEdit}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openRemoveModal(member)}
                        disabled={!canRemove}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-5 border-t border-slate-200 px-6 py-4 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length} members
              </p>

              <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="grid h-10 w-10 place-items-center text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`grid h-10 w-10 place-items-center border-l border-slate-200 text-sm transition ${
                        currentPage === pageNumber
                          ? "bg-blue-50 font-medium text-primary"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                  className="grid h-10 w-10 place-items-center border-l border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Invite Team Member</h3>
                <p className="mt-1 text-sm text-slate-500">Add a member to one of your managed projects.</p>
              </div>
              <button
                type="button"
                onClick={resetInviteModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitInvite} className="mt-6 space-y-5">
              {inviteMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {inviteMessage}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-12 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Project</label>
                  <select
                    value={inviteProjectId}
                    onChange={(event) => setInviteProjectId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  >
                    {manageableProjects.map((project) => (
                      <option key={project.projectId} value={project.projectId}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MASTER">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetInviteModal}
                  className="rounded-2xl px-4 py-3 font-medium text-slate-500 transition hover:bg-slate-50"
                  disabled={inviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  <UserPlus size={18} />
                  {inviting ? "Inviting..." : "Invite Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-950">Edit Member Role</h3>
                <p className="mt-1 text-sm text-slate-500">{editingMember.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitRoleUpdate} className="mt-6 space-y-5">
              {editMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {editMessage}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Project Assignment</label>
                <select
                  value={selectedAssignmentId}
                  onChange={(event) => {
                    const nextAssignmentId = event.target.value;
                    setSelectedAssignmentId(nextAssignmentId);
                    const assignment = assignmentOptions.find((item) => item.membershipId === nextAssignmentId);
                    if (assignment) {
                      setSelectedRole(assignment.role);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                >
                  {assignmentOptions.map((assignment) => (
                    <option key={assignment.membershipId} value={assignment.membershipId}>
                      {assignment.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Role</label>
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                >
                  <option value="MEMBER">Member</option>
                  <option value="MASTER">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="rounded-2xl px-4 py-3 font-medium text-slate-500 transition hover:bg-slate-50"
                  disabled={editing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-950">Remove Member Assignment</h3>
                <p className="mt-1 text-sm text-slate-500">{removingMember.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRemovingMember(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {removeMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {removeMessage}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Project Assignment</label>
                <select
                  value={removeAssignmentId}
                  onChange={(event) => setRemoveAssignmentId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                >
                  {removableOptions.map((assignment) => (
                    <option key={assignment.membershipId} value={assignment.membershipId}>
                      {assignment.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                This removes the selected project membership only. The member will remain in other project assignments.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRemovingMember(null)}
                  className="rounded-2xl px-4 py-3 font-medium text-slate-500 transition hover:bg-slate-50"
                  disabled={removing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRemoval}
                  disabled={removing}
                  className="rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:opacity-70"
                >
                  {removing ? "Removing..." : "Remove Assignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
