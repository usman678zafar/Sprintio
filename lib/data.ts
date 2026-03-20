import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ProjectMember from "@/models/ProjectMember";
import Project from "@/models/Project";
import Task from "@/models/Task";
import mongoose from "mongoose";

export async function getDashboardData() {
    const session = await getServerSession(authOptions);
    if (!session) return { projects: [] };

    await connectDB();
    const userId = (session.user as any).id;
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
                localField: "projectId",
                foreignField: "projectId",
                as: "tasks"
            }
        },
        {
            $lookup: {
                from: "projectmembers",
                localField: "projectId",
                foreignField: "projectId",
                as: "members"
            }
        },
        {
            $addFields: {
                "project.taskCount": { $size: "$tasks" },
                "project.memberCount": { $size: "$members" }
            }
        },
        {
            $replaceRoot: { newRoot: "$project" }
        }
    ]);

    // Convert ObjectIds to strings for React Serializability
    return {
        projects: JSON.parse(JSON.stringify(enrichedProjects))
    };
}

export async function getProjectData(projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    await connectDB();
    const userId = (session.user as any).id;

    const projectObj = await Project.findById(projectId);
    if (!projectObj) return null;

    const membership = await ProjectMember.findOne({
        projectId,
        userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId
    });

    if (!membership) return null;

    const members = await ProjectMember.find({ projectId }).populate("userId", "name email");
    const tasks = await Task.find({ projectId }).populate("assignedTo", "name email");

    return JSON.parse(JSON.stringify({
        project: projectObj,
        membership,
        members: members.map(m => ({
            ...m.toObject(),
            user: m.userId
        })),
        tasks
    }));
}
