import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const projectId = params.id;
    const userId = (session.user as any).id;

    await connectDB();

    // Check if user is a member of the project
    const membership = await ProjectMember.findOne({ projectId, userId }).lean();
    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const [project, members] = await Promise.all([
      Project.findById(projectId).lean(),
      ProjectMember.find({ projectId })
        .populate("userId", "name email")
        .lean(),
    ]);

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const sanitizedMembers = members
      .map((member) => {
        const populatedUser = member.userId as unknown as { _id: string; name: string; email: string } | null;
        if (!populatedUser) return null;

        return {
          _id: member._id,
          role: member.role,
          user: {
            _id: populatedUser._id,
            name: populatedUser.name,
            email: populatedUser.email,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        project,
        membership: {
          _id: membership._id,
          role: membership.role,
          userId,
        },
        members: sanitizedMembers,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, documentUrl, documentName } = body;

    if (!name) return NextResponse.json({ message: "Project name is required" }, { status: 400 });

    const projectId = params.id;
    const userId = (session.user as any).id;

    await connectDB();

    // Check if user is a MASTER of the project
    const membership = await ProjectMember.findOne({ projectId, userId });
    if (!membership || membership.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can edit project details" }, { status: 403 });
    }

    const updateData: any = { name };
    if (description !== undefined) updateData.description = description;
    if (documentUrl !== undefined) updateData.documentUrl = documentUrl;
    if (documentName !== undefined) updateData.documentName = documentName;

    const project = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true, strict: false }
    );

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const projectId = params.id;
    const userId = (session.user as any).id;

    await connectDB();

    // Check if user is a MASTER of the project
    const membership = await ProjectMember.findOne({ projectId, userId });
    if (!membership || membership.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can delete projects" }, { status: 403 });
    }

    // Delete project and all memberships
    await Promise.all([
      Project.findByIdAndDelete(projectId),
      ProjectMember.deleteMany({ projectId })
    ]);

    return NextResponse.json({ message: "Project deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
