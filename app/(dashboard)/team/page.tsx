"use client";

import { useEffect, useState } from "react";
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
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

const PAGE_SIZE = 8;

function roleBadge(role: string) {
  if (role === "Admin") return "bg-brand/20 dark:bg-brand/30 text-primary";
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

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

  const fetchTeam = async (nextPage: number, query: string) => {
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      });

      if (query.trim()) {
        params.set("query", query.trim());
      }

      const res = await fetch(`/api/team?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data: TeamResponse = await res.json();
        setMembers(data.members);
        setManageableProjects(data.manageableProjects);
        setPagination(data.pagination);
        if (data.pagination.page !== page) {
          setPage(data.pagination.page);
        }
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
    fetchTeam(page, searchQuery);
  }, [page, searchQuery]);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail || "");
      setPage(1);
    };

    window.addEventListener("team-search", handleSearch as EventListener);
    return () => window.removeEventListener("team-search", handleSearch as EventListener);
  }, []);

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;

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
        fetchTeam(currentPage, searchQuery);
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
        fetchTeam(currentPage, searchQuery);
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
        fetchTeam(currentPage, searchQuery);
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
    <div className="min-h-full bg-base px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1040px]">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-muted sm:text-3xl">
            Team Management
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage your workspace members, their roles, and project assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          disabled={manageableProjects.length === 0}
          className="btn-primary self-start px-4 py-2.5 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Invite New Member
        </button>
      </section>

      <section className="mt-10 overflow-hidden rounded-[24px] border border-border-subtle bg-[var(--color-light-surface)] shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="px-6 py-10 text-sm text-muted">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted">
            {searchQuery.trim() ? `No members match "${searchQuery}".` : "No members found yet."}
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200 lg:hidden">
              {members.map((member) => {
                const canEdit = member.assignments.some((assignment) => assignment.canManage);
                const canRemove = member.assignments.some(
                  (assignment) => assignment.canManage && !assignment.isSelf
                );

                return (
                  <article key={member.userId} className="space-y-4 px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-sm font-semibold text-muted">
                        {member.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-medium tracking-tight text-muted">
                          {member.name}
                        </p>
                        <p className="truncate text-sm text-muted">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Role
                      </span>
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${roleBadge(member.roleSummary)}`}>
                        {member.roleSummary}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Project Assignments
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {member.assignments.map((assignment) => (
                          <span
                            key={assignment.membershipId}
                            className="rounded-xl bg-surface px-3 py-1.5 text-sm text-muted"
                          >
                            {assignment.projectName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        disabled={!canEdit}
                        className="rounded-xl p-2 text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openRemoveModal(member)}
                        disabled={!canRemove}
                        className="rounded-xl p-2 text-muted transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[minmax(0,1.8fr)_220px_minmax(0,2fr)_120px] bg-[var(--color-light-bg)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    <div>Name</div>
                    <div>Role</div>
                    <div>Project Assignments</div>
                    <div />
                  </div>

                  {members.map((member) => {
                    const canEdit = member.assignments.some((assignment) => assignment.canManage);
                    const canRemove = member.assignments.some(
                      (assignment) => assignment.canManage && !assignment.isSelf
                    );

                    return (
                      <div
                        key={member.userId}
                        className="grid grid-cols-[minmax(0,1.8fr)_220px_minmax(0,2fr)_120px] items-center border-t border-border-subtle px-6 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-sm font-semibold text-muted">
                            {member.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-medium tracking-tight text-muted">
                              {member.name}
                            </p>
                            <p className="truncate text-sm text-muted">{member.email}</p>
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
                              className="rounded-xl bg-surface px-3 py-1.5 text-sm text-muted"
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
                            className="rounded-xl p-2 text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openRemoveModal(member)}
                            disabled={!canRemove}
                            className="rounded-xl p-2 text-muted transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 border-t border-border-subtle px-6 py-4 text-muted sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                Showing {pagination.totalItems === 0 ? 0 : (currentPage - 1) * pagination.limit + 1} to{" "}
                {Math.min(currentPage * pagination.limit, pagination.totalItems)} of {pagination.totalItems} members
              </p>

              <div className="flex flex-wrap items-center overflow-hidden rounded-2xl border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="grid h-10 w-10 place-items-center text-muted transition hover:bg-[var(--color-light-bg)] disabled:opacity-40"
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
                      className={`grid h-10 w-10 place-items-center border-l border-neutral-200 dark:border-neutral-800 text-sm transition ${
                        currentPage === pageNumber
                          ? "bg-brand/10 dark:bg-brand/5 font-medium text-primary"
                          : "text-neutral-500 dark:text-neutral-400 hover:bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)]"
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
                  className="grid h-10 w-10 place-items-center border-l border-border-subtle text-muted transition hover:bg-[var(--color-light-bg)] disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="modal-surface w-full max-w-lg p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-muted">Invite Team Member</h3>
                <p className="mt-1 text-sm text-muted">Add a member to one of your managed projects.</p>
              </div>
              <button
                type="button"
                onClick={resetInviteModal}
                className="rounded-xl p-2 text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
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
                <label className="mb-2 block text-sm font-medium text-muted">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    className="w-full rounded-2xl border border-border-subtle px-12 py-3 text-muted focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted">Project</label>
                  <select
                    value={inviteProjectId}
                    onChange={(event) => setInviteProjectId(event.target.value)}
                    className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] px-4 py-3 text-muted focus:border-primary"
                  >
                    {manageableProjects.map((project) => (
                      <option key={project.projectId} value={project.projectId}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                    className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] px-4 py-3 text-muted focus:border-primary"
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
                  className="btn-danger px-4 py-3"
                  disabled={inviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-success px-5 py-3"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="modal-surface w-full max-w-lg p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-muted">Edit Member Role</h3>
                <p className="mt-1 text-sm text-muted">{editingMember.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-xl p-2 text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
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
                <label className="mb-2 block text-sm font-medium text-muted">Project Assignment</label>
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
                  className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] px-4 py-3 text-muted focus:border-primary"
                >
                  {assignmentOptions.map((assignment) => (
                    <option key={assignment.membershipId} value={assignment.membershipId}>
                      {assignment.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted">Role</label>
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] px-4 py-3 text-muted focus:border-primary"
                >
                  <option value="MEMBER">Member</option>
                  <option value="MASTER">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="btn-danger px-4 py-3"
                  disabled={editing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="btn-warning px-5 py-3"
                >
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="modal-surface w-full max-w-lg p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-muted">Remove Member Assignment</h3>
                <p className="mt-1 text-sm text-muted">{removingMember.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRemovingMember(null)}
                className="rounded-xl p-2 text-muted transition hover:bg-[var(--color-light-bg)] hover:text-muted"
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
                <label className="mb-2 block text-sm font-medium text-muted">Project Assignment</label>
                <select
                  value={removeAssignmentId}
                  onChange={(event) => setRemoveAssignmentId(event.target.value)}
                  className="w-full rounded-2xl border border-border-subtle bg-[var(--color-light-surface)] px-4 py-3 text-muted focus:border-primary"
                >
                  {removableOptions.map((assignment) => (
                    <option key={assignment.membershipId} value={assignment.membershipId}>
                      {assignment.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-[var(--color-light-bg)] px-4 py-4 text-sm leading-6 text-muted">
                This removes the selected project membership only. The member will remain in other project assignments.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRemovingMember(null)}
                  className="btn-danger px-4 py-3"
                  disabled={removing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRemoval}
                  disabled={removing}
                  className="btn-danger px-5 py-3"
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

