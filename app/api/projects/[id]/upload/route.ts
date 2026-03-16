import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const projectId = params.id;
    const userId = (session.user as any).id;

    await connectDB();

    // Only MASTER can upload documents
    const membership = await ProjectMember.findOne({ projectId, userId });
    if (!membership || membership.role !== "MASTER") {
      return NextResponse.json({ message: "Only MASTER can upload documents" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: "Only PDF and Word documents are allowed" }, { status: 400 });
    }

    // Validate file size (10 MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ message: "File size must be less than 10 MB" }, { status: 400 });
    }

    // Save file to public/uploads/projects/{projectId}/
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "projects", projectId);
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split(".").pop();
    const safeFilename = `document_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, safeFilename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    const documentUrl = `/uploads/projects/${projectId}/${safeFilename}`;
    const documentName = file.name;

    // Update project with the new document URL
    await Project.findByIdAndUpdate(projectId, { documentUrl, documentName }, { strict: false });

    return NextResponse.json({ documentUrl, documentName }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
