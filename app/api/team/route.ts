import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 8), 50);
    const query = (searchParams.get("query") || "").trim().toLowerCase();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
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
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
        { status: 200, headers: NO_STORE_HEADERS }
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

    const allMembers = Array.from(grouped.values())
      .map((member) => ({
        ...member,
        roleSummary: member.assignments.some((assignment) => assignment.role === "MASTER")
          ? "Admin"
          : "Member",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const filteredMembers =
      query.length === 0
        ? allMembers
        : allMembers.filter((member) => {
            const projectNames = member.assignments
              .map((assignment) => assignment.projectName.toLowerCase())
              .join(" ");

            return (
              member.name.toLowerCase().includes(query) ||
              member.email.toLowerCase().includes(query) ||
              projectNames.includes(query)
            );
          });

    const totalItems = filteredMembers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(page, totalPages);
    const safeSkip = (safePage - 1) * limit;
    const members = filteredMembers.slice(safeSkip, safeSkip + limit);

    return NextResponse.json(
      {
        currentUserId: userId,
        manageableProjects,
        members,
        pagination: {
          page: safePage,
          limit,
          totalItems,
          totalPages,
          hasNextPage: safePage < totalPages,
          hasPrevPage: safePage > 1,
        },
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
