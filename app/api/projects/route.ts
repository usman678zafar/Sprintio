import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";

import Task from "@/models/Task";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = (session.user as any).id;

    const memberships = await ProjectMember.find({ userId }).populate("projectId");
    
    // Enrich projects with counts
    const enrichedProjects = await Promise.all(memberships.map(async (m) => {
      const project = m.projectId;
      if (!project) return null;

      const [taskCount, memberCount] = await Promise.all([
        Task.countDocuments({ projectId: project._id }),
        ProjectMember.countDocuments({ projectId: project._id })
      ]);

      return {
        ...project.toObject(),
        taskCount,
        memberCount
      };
    }));

    const projects = enrichedProjects.filter(Boolean);

    return NextResponse.json({ projects }, { status: 200 });
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

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
