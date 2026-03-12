import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ProjectMember from "@/models/ProjectMember";
import User from "@/models/User";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { email, role } = await req.json();
    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

    await connectDB();
    const userId = (session.user as any).id;
    const projectId = params.id;

    // Verify current user is MASTER
    const member = await ProjectMember.findOne({ projectId, userId });
    if (!member || member.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can invite members" }, { status: 403 });
    }

    // Find the user to invite
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await ProjectMember.findOne({ projectId, userId: userToInvite._id });
    if (existingMember) {
      return NextResponse.json({ message: "User is already a member" }, { status: 400 });
    }

    const newMember = await ProjectMember.create({
      projectId,
      userId: userToInvite._id,
      role: role || "MEMBER",
    });

    return NextResponse.json({ message: "Member invited", member: newMember }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = (session.user as any).id;
    const projectId = params.id;

    // Verify current user is part of the project
    const member = await ProjectMember.findOne({ projectId, userId });
    if (!member) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const members = await ProjectMember.find({ projectId }).populate("userId", "name email");
    return NextResponse.json({ members }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
