import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const currentMemberships = await ProjectMember.find({ userId: normalizedUserId }).lean();
    const projectIds = currentMemberships.map((membership) => membership.projectId);

    if (projectIds.length === 0) {
      return NextResponse.json(
        {
          currentUserId: userId,
          manageableProjects: [],
          members: [],
        },
        { status: 200 }
      );
    }

    const projectDocs = await Project.find({ _id: { $in: projectIds } })
      .select("_id name")
      .lean();

    const projectNameMap = new Map(
      projectDocs.map((project) => [project._id.toString(), project.name])
    );

    const manageableProjects = currentMemberships
      .filter((membership) => membership.role === "MASTER")
      .map((membership) => ({
        projectId: membership.projectId.toString(),
        projectName: projectNameMap.get(membership.projectId.toString()) || "Project",
      }));

    const rawMembers = await ProjectMember.aggregate([
      {
        $match: {
          projectId: { $in: projectIds },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          projectId: 1,
          role: 1,
          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
        },
      },
    ]);

    const membershipRoleMap = new Map(
      currentMemberships.map((membership) => [
        membership.projectId.toString(),
        membership.role,
      ])
    );

    const grouped = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        assignments: Array<{
          membershipId: string;
          projectId: string;
          projectName: string;
          role: "MASTER" | "MEMBER";
          canManage: boolean;
          isSelf: boolean;
        }>;
      }
    >();

    for (const member of rawMembers) {
      const key = member.userId.toString();
      const projectId = member.projectId.toString();
      const projectName = projectNameMap.get(projectId) || "Project";

      if (!grouped.has(key)) {
        grouped.set(key, {
          userId: key,
          name: member.name,
          email: member.email,
          assignments: [],
        });
      }

      grouped.get(key)!.assignments.push({
        membershipId: member._id.toString(),
        projectId,
        projectName,
        role: member.role,
        canManage: membershipRoleMap.get(projectId) === "MASTER",
        isSelf: key === userId,
      });
    }

    const members = Array.from(grouped.values())
      .map((member) => ({
        ...member,
        roleSummary: member.assignments.some((assignment) => assignment.role === "MASTER")
          ? "Admin"
          : "Member",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      {
        currentUserId: userId,
        manageableProjects,
        members,
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
