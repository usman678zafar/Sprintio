import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";
import ProjectMember from "@/models/ProjectMember";

const VALID_STATUSES = ["Pending", "In Progress", "Done"];

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

      if (!VALID_STATUSES.includes(updates.status)) {
        return NextResponse.json({ message: "Invalid status" }, { status: 400 });
      }

      // ONLY allow status update
      const allowedUpdates = { status: updates.status };
      Object.assign(task, allowedUpdates);
    } else {
      if (updates.status && !VALID_STATUSES.includes(updates.status)) {
        return NextResponse.json({ message: "Invalid status" }, { status: 400 });
      }

      if (updates.assignedTo) {
        const assigneeMembership = await ProjectMember.findOne({ projectId: task.projectId, userId: updates.assignedTo });
        if (!assigneeMembership) {
          return NextResponse.json({ message: "Assigned user must belong to the project" }, { status: 400 });
        }
      }

      if (updates.parentTaskId) {
        if (updates.parentTaskId === params.id) {
          return NextResponse.json({ message: "A task cannot be its own parent" }, { status: 400 });
        }

        const parentTask = await Task.findOne({ _id: updates.parentTaskId, projectId: task.projectId });
        if (!parentTask) {
          return NextResponse.json({ message: "Parent task not found in this project" }, { status: 400 });
        }
      }

      // MASTER can edit anything
      Object.assign(task, updates);
    }

    await task.save();
    revalidateTag("dashboard-projects");
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

    const idsToDelete = [task._id];
    const queue = [task._id];

    while (queue.length > 0) {
      const currentParentId = queue.shift();
      const children = await Task.find({ parentTaskId: currentParentId }).select("_id");

      for (const child of children) {
        idsToDelete.push(child._id);
        queue.push(child._id);
      }
    }

    await Task.deleteMany({ _id: { $in: idsToDelete } });

    revalidateTag("dashboard-projects");

    return NextResponse.json({ message: "Task deleted" }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
