import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";
import ProjectMember from "@/models/ProjectMember";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const updates = await req.json();
    await connectDB();
    const userId = (session.user as any).id;

    const task = await Task.findById(params.id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    const member = await ProjectMember.findOne({ projectId: task.projectId, userId });
    if (!member) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // Permissions logic
    if (member.role === "MEMBER") {
      // MEMBER can only change status of tasks assigned to them
      if (task.assignedTo?.toString() !== userId.toString()) {
        return NextResponse.json({ message: "Forbidden to edit this task" }, { status: 403 });
      }
      // ONLY allow status update
      const allowedUpdates = { status: updates.status };
      Object.assign(task, allowedUpdates);
    } else {
      // MASTER can edit anything
      Object.assign(task, updates);
    }

    await task.save();
    return NextResponse.json({ task }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = (session.user as any).id;

    const task = await Task.findById(params.id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    const member = await ProjectMember.findOne({ projectId: task.projectId, userId });
    if (!member || member.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can delete tasks" }, { status: 403 });
    }

    // Optionally handle cascading deletion of subtasks
    await Task.deleteMany({ parentTaskId: task._id });
    await Task.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Task deleted" }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
