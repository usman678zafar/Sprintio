import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ProjectMember from "@/models/ProjectMember";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { memberId, role } = await req.json(); // memberId is the ProjectMember document _id
    if (!memberId || !role) return NextResponse.json({ message: "memberId and role are required" }, { status: 400 });

    await connectDB();
    const userId = (session.user as any).id;
    const projectId = params.id;

    // Verify current user is MASTER
    const currentMember = await ProjectMember.findOne({ projectId, userId });
    if (!currentMember || currentMember.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can change roles" }, { status: 403 });
    }

    const targetMember = await ProjectMember.findOne({ _id: memberId, projectId });
    if (!targetMember) {
      return NextResponse.json({ message: "Member not found in this project" }, { status: 404 });
    }

    if (!["MASTER", "MEMBER"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    if (currentMember._id.toString() === memberId && role !== "MASTER") {
      return NextResponse.json({ message: "You cannot demote yourself" }, { status: 400 });
    }

    const updatedMember = await ProjectMember.findByIdAndUpdate(memberId, { role }, { new: true });
    revalidateTag("dashboard-projects");
    return NextResponse.json({ member: updatedMember }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId"); // ProjectMember document _id
    
    if (!memberId) return NextResponse.json({ message: "memberId is required" }, { status: 400 });

    await connectDB();
    const userId = (session.user as any).id;
    const projectId = params.id;

    // Verify current user is MASTER
    const currentMember = await ProjectMember.findOne({ projectId, userId });
    if (!currentMember || currentMember.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can remove members" }, { status: 403 });
    }

    const targetMember = await ProjectMember.findOne({ _id: memberId, projectId });
    if (!targetMember) {
      return NextResponse.json({ message: "Member not found in this project" }, { status: 404 });
    }

    if (currentMember._id.toString() === memberId) {
      return NextResponse.json({ message: "You cannot remove yourself from the project" }, { status: 400 });
    }

    await ProjectMember.findByIdAndDelete(memberId);
    revalidateTag("dashboard-projects");
    return NextResponse.json({ message: "Member removed" }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
