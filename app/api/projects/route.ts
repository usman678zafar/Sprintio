import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import User from "@/models/User";

import Task from "@/models/Task";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROJECT_NAME_MAX = 80;
const PROJECT_DESCRIPTION_MAX = 1000;

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
    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 12), 50);
    const skip = (page - 1) * limit;
    const query = (searchParams.get("query") || "").trim();
    const sort = searchParams.get("sort") || "recent";

    const sortStage: Record<string, 1 | -1> =
      sort === "name"
        ? { name: 1 as const, _id: -1 as const }
        : sort === "tasks"
          ? { taskCount: -1 as const, createdAt: -1 as const, _id: -1 as const }
          : { createdAt: -1 as const, _id: -1 as const };

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

    await connectDB();
    const userId = (session.user as any).id;
    // We need to convert string userId to ObjectId if necessary, depending on how mongoose validates aggregate matches. 
    // Assuming userId is a string but stored as string or ObjectId in Mongo. Let's use mongoose.Types.ObjectId if it's stored as ObjectId in ProjectMember
    const objectIdUser = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const [result] = await ProjectMember.aggregate([
      { $match: { userId: objectIdUser } },
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "_id",
          as: "project"
        }
      },
      { $unwind: "$project" },
      {
        $lookup: {
          from: "tasks",
          let: { pid: "$projectId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$projectId", "$$pid"] } } },
            { $count: "count" }
          ],
          as: "taskCountInfo"
        }
      },
      {
        $lookup: {
          from: "projectmembers",
          let: { pid: "$projectId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$projectId", "$$pid"] } } },
            { $count: "count" }
          ],
          as: "memberCountInfo"
        }
      },
      {
        $addFields: {
          "project.taskCount": { $ifNull: [{ $arrayElemAt: ["$taskCountInfo.count", 0] }, 0] },
          "project.memberCount": { $ifNull: [{ $arrayElemAt: ["$memberCountInfo.count", 0] }, 0] }
        }
      },
      {
        $replaceRoot: { newRoot: "$project" }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          cardColor: 1,
          languages: 1,
          createdAt: 1,
          taskCount: 1,
          memberCount: 1,
        }
      },
      ...(query
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: query, $options: "i" } },
                  { description: { $regex: query, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $sort: sortStage,
      },
      {
        $facet: {
          projects: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const projects = result?.projects ?? [];
    const totalItems = result?.totalCount?.[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return NextResponse.json(
      {
        projects,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const {
      name,
      description = "",
      cardColor = "#D97757",
      languages = [],
      memberIdentifiers = [],
    } = await req.json();
    if (!name) return NextResponse.json({ message: "Project name is required" }, { status: 400 });

    const normalizedName = String(name).trim().slice(0, PROJECT_NAME_MAX);
    const normalizedDescription = String(description || "").trim().slice(0, PROJECT_DESCRIPTION_MAX);
    if (!normalizedName) {
      return NextResponse.json({ message: "Project name is required" }, { status: 400 });
    }

    await connectDB();
    const userId = (session.user as any).id;
    const normalizedLanguages = Array.isArray(languages)
      ? languages
          .map((value) => String(value).trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const normalizedIdentifiers = Array.isArray(memberIdentifiers)
      ? Array.from(new Set(memberIdentifiers.map((value) => String(value).trim().toLowerCase()).filter(Boolean)))
      : [];

    const project = await Project.create({
      name: normalizedName,
      description: normalizedDescription,
      cardColor,
      languages: normalizedLanguages,
      createdBy: userId,
    });

    await ProjectMember.create({
      projectId: project._id,
      userId,
      role: "MASTER",
    });

    if (normalizedIdentifiers.length > 0) {
      const users = await User.find({
        $or: [
          { email: { $in: normalizedIdentifiers } },
          { name: { $in: normalizedIdentifiers } },
        ],
      }).select("_id email name");

      const memberships = users
        .filter((user) => String(user._id) !== String(userId))
        .map((user) => ({
          projectId: project._id,
          userId: user._id,
          role: "MEMBER" as const,
        }));

      if (memberships.length > 0) {
        await ProjectMember.insertMany(memberships, { ordered: false }).catch(() => null);
      }
    }

    revalidateTag("dashboard-projects");

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
