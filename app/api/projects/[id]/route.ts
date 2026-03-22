import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROJECT_NAME_MAX = 80;
const PROJECT_DESCRIPTION_MAX = 1000;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

    const projectId = params.id;
    const userId = (session.user as any).id;

    await connectDB();

    // Check if user is a member of the project
    const membership = await ProjectMember.findOne({ projectId, userId }).lean();
    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const [project, members] = await Promise.all([
      Project.findById(projectId).lean(),
      ProjectMember.find({ projectId })
        .populate("userId", "name email")
        .lean(),
    ]);

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404, headers: NO_STORE_HEADERS });
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
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, cardColor, languages, documentUrl, documentName } = body;

    const normalizedName = String(name || "").trim().slice(0, PROJECT_NAME_MAX);
    const normalizedDescription = description === undefined ? undefined : String(description || "").trim().slice(0, PROJECT_DESCRIPTION_MAX);

    if (!normalizedName) return NextResponse.json({ message: "Project name is required" }, { status: 400 });

    const projectId = params.id;
    const userId = (session.user as any).id;

    await connectDB();

    // Check if user is a MASTER of the project
    const membership = await ProjectMember.findOne({ projectId, userId });
    if (!membership || membership.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can edit project details" }, { status: 403 });
    }

    const updateData: any = { name: normalizedName };
    if (normalizedDescription !== undefined) updateData.description = normalizedDescription;
    if (cardColor !== undefined) updateData.cardColor = cardColor;
    if (languages !== undefined) {
      updateData.languages = Array.isArray(languages)
        ? languages.map((value: unknown) => String(value).trim()).filter(Boolean).slice(0, 8)
        : [];
    }
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

    revalidateTag("dashboard-projects");

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

    revalidateTag("dashboard-projects");

    return NextResponse.json({ message: "Project deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
