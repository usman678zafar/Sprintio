import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, R2_BUCKET_NAME } from "@/lib/s3";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { filename, contentType } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: "Filename and contentType are required" }, { status: 400 });
        }

        const key = `profiles/${(session.user as any).id}/${Date.now()}-${filename}`;

        const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const presignedUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

        return NextResponse.json({
            presignedUrl,
            publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
            key
        });

    } catch (error: any) {
        console.error("Presigned URL gen error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
