import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";
import ProjectMember from "@/models/ProjectMember";

const VALID_STATUSES = ["Pending", "In Progress", "Done"];

// GET all tasks for a project
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) return NextResponse.json({ message: "projectId is required" }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = (session.user as any).id;

    // Check member
    const isMember = await ProjectMember.findOne({ projectId, userId });
    if (!isMember) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const tasks = await Task.find({ projectId }).populate("assignedTo", "name email");
    return NextResponse.json({ tasks }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

// POST a new task
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { projectId, title, description, assignedTo, deadline, parentTaskId, status } = await req.json();
    if (!projectId || !title) return NextResponse.json({ message: "projectId and title are required" }, { status: 400 });

    await connectDB();
    const userId = (session.user as any).id;

    const isMember = await ProjectMember.findOne({ projectId, userId });
    if (!isMember) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // MASTER role check (if desired) or any member? The prompt says MASTER permissions: add tasks, delete tasks
    if (isMember.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can add tasks" }, { status: 403 });
    }

    if (assignedTo) {
      const assigneeMembership = await ProjectMember.findOne({ projectId, userId: assignedTo });
      if (!assigneeMembership) {
        return NextResponse.json({ message: "Assigned user must belong to the project" }, { status: 400 });
      }
    }

    if (parentTaskId) {
      const parentTask = await Task.findOne({ _id: parentTaskId, projectId });
      if (!parentTask) {
        return NextResponse.json({ message: "Parent task not found in this project" }, { status: 400 });
      }
    }

    const nextStatus = VALID_STATUSES.includes(status) ? status : "Pending";

    const newTask = await Task.create({
      projectId,
      title,
      description,
      assignedTo: assignedTo || null,
      deadline: deadline || null,
      parentTaskId: parentTaskId || null,
      status: nextStatus,
    });

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
