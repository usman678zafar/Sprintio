import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";
import ProjectMember from "@/models/ProjectMember";

const VALID_STATUSES = ["Pending", "In Progress", "Done"];

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

// GET all tasks for a project
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 25), 100);
    const skip = (page - 1) * limit;

    if (!projectId) return NextResponse.json({ message: "projectId is required" }, { status: 400, headers: NO_STORE_HEADERS });

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

    await connectDB();
    const userId = (session.user as any).id;

    // Check member
    const isMember = await ProjectMember.findOne({ projectId, userId });
    if (!isMember) return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });

    const [tasks, totalItems] = await Promise.all([
      Task.find({ projectId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedTo", "name email"),
      Task.countDocuments({ projectId }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return NextResponse.json(
      {
        tasks,
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

    revalidateTag("dashboard-projects");

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
