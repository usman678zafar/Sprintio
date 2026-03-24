import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import {
  buildWikiExcerpt,
  normalizeWikiTitle,
  slugifyWikiTitle,
} from "@/lib/wiki/shared";
import ProjectMember from "@/models/ProjectMember";
import WikiPage from "@/models/WikiPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toObjectIdIfPossible(value: string) {
  return mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;
}

function serializePage(page: any) {
  return {
    _id: String(page._id),
    projectId: String(page.projectId),
    parentId: page.parentId ? String(page.parentId) : null,
    title: page.title,
    slug: page.slug,
    content: page.content || "",
    document: page.document || null,
    excerpt: page.excerpt || "",
    order: page.order || 0,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    versionCount: Array.isArray(page.versions) ? page.versions.length : 0,
    createdBy:
      page.createdBy && typeof page.createdBy === "object"
        ? {
            id: page.createdBy._id ? String(page.createdBy._id) : String(page.createdBy),
            name: page.createdBy.name || "",
            image: page.createdBy.image || "",
          }
        : null,
  };
}

async function ensureMembership(projectId: mongoose.Types.ObjectId | string, userId: string) {
  return ProjectMember.findOne({
    projectId,
    userId: toObjectIdIfPossible(userId),
  }).lean();
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const page = await WikiPage.findById(params.id);
    if (!page) {
      return NextResponse.json({ message: "Wiki page not found" }, { status: 404 });
    }

    const currentUserId = (session.user as any).id as string;
    const membership = await ensureMembership(page.projectId, currentUserId);
    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { title, content, document } = await req.json();
    const normalizedTitle = normalizeWikiTitle(title);
    const nextContent = String(content || "");
    const nextDocument =
      document && typeof document === "object" && !Array.isArray(document)
        ? document
        : null;

    if (!normalizedTitle) {
      return NextResponse.json({ message: "Page title is required" }, { status: 400 });
    }

    const documentChanged =
      JSON.stringify(page.document || null) !== JSON.stringify(nextDocument || null);
    const hasMeaningfulChange =
      page.title !== normalizedTitle || page.content !== nextContent || documentChanged;

    if (hasMeaningfulChange && (page.title || page.content || page.document)) {
      const nextVersions = [
        ...(page.versions || []),
        {
          title: page.title,
          content: page.content || "",
          document: page.document || null,
          savedAt: page.updatedAt || new Date(),
          updatedBy: page.updatedBy,
        },
      ].slice(-20);

      page.versions = nextVersions;
    }

    page.title = normalizedTitle;
    page.slug = slugifyWikiTitle(normalizedTitle);
    page.content = nextContent;
    page.document = nextDocument;
    page.excerpt = buildWikiExcerpt(nextContent, nextDocument);
    page.updatedBy = toObjectIdIfPossible(currentUserId) as mongoose.Types.ObjectId;

    await page.save();
    await page.populate("createdBy", "name image");

    return NextResponse.json({ page: serializePage(page.toObject()) }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const page = await WikiPage.findById(params.id).lean();
    if (!page) {
      return NextResponse.json({ message: "Wiki page not found" }, { status: 404 });
    }

    const currentUserId = (session.user as any).id as string;
    const membership = await ensureMembership(page.projectId, currentUserId);
    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const idsToDelete: string[] = [String(page._id)];
    const queue: string[] = [String(page._id)];

    while (queue.length > 0) {
      const currentParentId = queue.shift();
      const children = await WikiPage.find({
        projectId: page.projectId,
        parentId: currentParentId,
      }).select("_id").lean();

      children.forEach((child) => {
        const id = String(child._id);
        idsToDelete.push(id);
        queue.push(id);
      });
    }

    await WikiPage.deleteMany({ _id: { $in: idsToDelete } });

    return NextResponse.json({ message: "Wiki page deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
