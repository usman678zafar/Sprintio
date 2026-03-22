import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ProjectMember from "@/models/ProjectMember";
import Project from "@/models/Project";
import Task from "@/models/Task";
import mongoose from "mongoose";

async function getDashboardProjects(userId: string) {
    await connectDB();

    const objectIdUser = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

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
                cardColor: 1,
                languages: 1,
                createdAt: 1,
                taskCount: 1,
                memberCount: 1,
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);

    return JSON.parse(JSON.stringify(enrichedProjects));
}

export async function getDashboardData() {
    const session = await getServerSession(authOptions);
    if (!session) return { projects: [] };

    return {
        projects: await getDashboardProjects((session.user as any).id)
    };
}

export async function getProjectData(projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    await connectDB();
    const userId = (session.user as any).id;
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

    const [projectObj, membership] = await Promise.all([
        Project.findById(projectId).lean(),
        ProjectMember.findOne({
            projectId,
            userId: normalizedUserId
        }).lean(),
    ]);

    if (!projectObj || !membership) return null;

    const [members, tasks] = await Promise.all([
        ProjectMember.find({ projectId })
            .populate("userId", "name email")
            .lean(),
        Task.find({ projectId })
            .populate("assignedTo", "name email")
            .lean(),
    ]);

    return JSON.parse(JSON.stringify({
        project: projectObj,
        membership,
        members: members.map((m: any) => ({
            ...m,
            user: m.userId
        })),
        tasks
    }));
}
