import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import { R2_BUCKET_NAME, R2_PUBLIC_URL, s3Client } from "@/lib/s3";
import connectDB from "@/lib/mongodb";
import ProjectMember from "@/models/ProjectMember";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toObjectIdIfPossible(value: string) {
  return mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { projectId, filename, contentType } = await req.json();
    if (!projectId || !filename || !contentType) {
      return NextResponse.json(
        { message: "projectId, filename, and contentType are required" },
        { status: 400 }
      );
    }

    if (!String(contentType).startsWith("image/")) {
      return NextResponse.json({ message: "Only image uploads are supported" }, { status: 400 });
    }

    await connectDB();

    const currentUserId = (session.user as any).id as string;
    const membership = await ProjectMember.findOne({
      projectId,
      userId: toObjectIdIfPossible(currentUserId),
    }).lean();

    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const safeFilename = sanitizeFilename(String(filename));
    const key = `wiki/${projectId}/${currentUserId}/${Date.now()}-${safeFilename}`;

    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

    return NextResponse.json(
      {
        presignedUrl,
        publicUrl: `${R2_PUBLIC_URL}/${key}`,
        key,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
