import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import Task from "@/models/Task";

function toObjectIdIfPossible(value: string) {
  return mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;
}

function deriveProjectTag(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .join(" ")
    .toUpperCase();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUserId = (session.user as any).id as string;
    const sessionUserId = toObjectIdIfPossible(currentUserId);

    const memberships = await ProjectMember.find({ userId: sessionUserId }).lean();
    if (memberships.length === 0) {
      return NextResponse.json(
        {
          currentUserId,
          projects: [],
          members: [],
          tasks: [],
        },
        { status: 200 }
      );
    }

    const projectIds = memberships.map((membership) => membership.projectId);
    const roleByProjectId = new Map(
      memberships.map((membership) => [String(membership.projectId), membership.role])
    );

    const [projects, tasks, workspaceMembers] = await Promise.all([
      Project.find({ _id: { $in: projectIds } })
        .select("name description createdAt")
        .lean(),
      Task.find({
        projectId: { $in: projectIds },
        deadline: { $ne: null },
      })
        .populate("assignedTo", "name email")
        .sort({ deadline: 1, createdAt: 1 })
        .lean(),
      ProjectMember.find({ projectId: { $in: projectIds } })
        .populate("userId", "name email")
        .lean(),
    ]);

    const memberCounts = new Map<string, number>();
    const taskCounts = new Map<string, number>();

    workspaceMembers.forEach((membership) => {
      const projectId = String(membership.projectId);
      memberCounts.set(projectId, (memberCounts.get(projectId) || 0) + 1);
    });

    tasks.forEach((task) => {
      const projectId = String(task.projectId);
      taskCounts.set(projectId, (taskCounts.get(projectId) || 0) + 1);
    });

    const projectPayload = projects
      .map((project) => ({
        _id: String(project._id),
        name: project.name,
        description: project.description || "",
        createdAt: project.createdAt,
        role: roleByProjectId.get(String(project._id)) || "MEMBER",
        memberCount: memberCounts.get(String(project._id)) || 0,
        taskCount: taskCounts.get(String(project._id)) || 0,
        tag: deriveProjectTag(project.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const projectMap = new Map(projectPayload.map((project) => [project._id, project]));

    const memberMap = new Map<
      string,
      {
        _id: string;
        name: string;
        email: string;
        projectIds: string[];
      }
    >();

    workspaceMembers.forEach((membership) => {
      const user =
        membership.userId && typeof membership.userId === "object"
          ? (membership.userId as { _id: mongoose.Types.ObjectId; name?: string; email?: string })
          : null;

      if (!user) return;

      const memberId = String(user._id);
      const existing = memberMap.get(memberId);
      if (existing) {
        if (!existing.projectIds.includes(String(membership.projectId))) {
          existing.projectIds.push(String(membership.projectId));
        }
        return;
      }

      memberMap.set(memberId, {
        _id: memberId,
        name: user.name || "Workspace Member",
        email: user.email || "",
        projectIds: [String(membership.projectId)],
      });
    });

    const taskPayload = tasks
      .map((task) => {
        const projectId = String(task.projectId);
        const project = projectMap.get(projectId);
        if (!project) return null;

        const assignedUser =
          task.assignedTo && typeof task.assignedTo === "object"
            ? (task.assignedTo as {
                _id: mongoose.Types.ObjectId;
                name?: string;
                email?: string;
              })
            : null;

        const assignedUserId = assignedUser ? String(assignedUser._id) : null;
        const canManage = roleByProjectId.get(projectId) === "MASTER";

        return {
          _id: String(task._id),
          title: task.title,
          description: task.description || "",
          status: task.status,
          deadline: task.deadline,
          projectId,
          projectName: project.name,
          projectTag: project.tag,
          canManage,
          canUpdate: canManage || assignedUserId === currentUserId,
          isMine: assignedUserId === currentUserId,
          assignedTo: assignedUser
            ? {
                _id: assignedUserId as string,
                name: assignedUser.name || "Assignee",
                email: assignedUser.email || "",
              }
            : null,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        currentUserId,
        projects: projectPayload,
        members: Array.from(memberMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
        tasks: taskPayload,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
