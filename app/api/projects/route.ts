import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";

import Task from "@/models/Task";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = (session.user as any).id;
    // We need to convert string userId to ObjectId if necessary, depending on how mongoose validates aggregate matches. 
    // Assuming userId is a string but stored as string or ObjectId in Mongo. Let's use mongoose.Types.ObjectId if it's stored as ObjectId in ProjectMember
    const objectIdUser = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const enrichedProjects = await ProjectMember.aggregate([
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
          name: 1,
          description: 1,
          createdAt: 1,
          taskCount: 1,
          memberCount: 1,
        }
      }
    ]);

    return NextResponse.json({ projects: enrichedProjects }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();
    if (!name) return NextResponse.json({ message: "Project name is required" }, { status: 400 });

    await connectDB();
    const userId = (session.user as any).id;

    const project = await Project.create({
      name,
      createdBy: userId,
    });

    await ProjectMember.create({
      projectId: project._id,
      userId,
      role: "MASTER",
    });

    revalidateTag("dashboard-projects");

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
