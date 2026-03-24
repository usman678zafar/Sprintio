import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import {
  buildWikiExcerpt,
  createStarterWikiDocument,
  normalizeWikiTitle,
  slugifyWikiTitle,
} from "@/lib/wiki/shared";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import WikiPage from "@/models/WikiPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    await connectDB();

    const currentUserId = (session.user as any).id as string;
    const normalizedUserId = toObjectIdIfPossible(currentUserId);
    const { searchParams } = new URL(req.url);
    const requestedProjectId = searchParams.get("projectId");

    const memberships = await ProjectMember.find({ userId: normalizedUserId }).lean();
    if (memberships.length === 0) {
      return NextResponse.json(
        { projects: [], selectedProjectId: null, pages: [] },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    const projectIds = memberships.map((membership) => membership.projectId);
    const projects = await Project.find({ _id: { $in: projectIds } })
      .select("_id name")
      .lean();

    const membershipRoleMap = new Map(
      memberships.map((membership) => [String(membership.projectId), membership.role])
    );

    const projectOptions = projects
      .map((project) => ({
        _id: String(project._id),
        name: project.name,
        role: membershipRoleMap.get(String(project._id)) || "MEMBER",
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const selectedProjectId =
      requestedProjectId && projectOptions.some((project) => project._id === requestedProjectId)
        ? requestedProjectId
        : projectOptions[0]?._id || null;

    if (!selectedProjectId) {
      return NextResponse.json(
        { projects: projectOptions, selectedProjectId: null, pages: [] },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    const pages = await WikiPage.find({ projectId: selectedProjectId })
      .populate("createdBy", "name image")
      .sort({ order: 1, createdAt: 1, _id: 1 })
      .lean();

    return NextResponse.json(
      {
        projects: projectOptions,
        selectedProjectId,
        pages: pages.map(serializePage),
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { projectId, parentId = null, title } = await req.json();
    const normalizedTitle = normalizeWikiTitle(title);

    if (!projectId) {
      return NextResponse.json({ message: "Project is required" }, { status: 400 });
    }

    if (!normalizedTitle) {
      return NextResponse.json({ message: "Page title is required" }, { status: 400 });
    }

    await connectDB();

    const currentUserId = (session.user as any).id as string;
    const normalizedUserId = toObjectIdIfPossible(currentUserId);
    const membership = await ProjectMember.findOne({
      projectId,
      userId: normalizedUserId,
    }).lean();

    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (parentId) {
      const parentPage = await WikiPage.findOne({ _id: parentId, projectId }).select("_id").lean();
      if (!parentPage) {
        return NextResponse.json({ message: "Parent page not found in this project" }, { status: 400 });
      }
    }

    const siblingCount = await WikiPage.countDocuments({
      projectId,
      parentId: parentId || null,
    });

    const starterDocument = createStarterWikiDocument();
    const starterContent = "Start writing here.";

    const page = await WikiPage.create({
      projectId,
      parentId: parentId || null,
      title: normalizedTitle,
      slug: slugifyWikiTitle(normalizedTitle),
      content: starterContent,
      document: starterDocument,
      excerpt: buildWikiExcerpt(starterContent, starterDocument),
      order: siblingCount,
      createdBy: normalizedUserId,
      updatedBy: normalizedUserId,
    });

    return NextResponse.json(
      {
        page: serializePage({
          ...page.toObject(),
          createdBy: {
            _id: normalizedUserId,
            name: session.user?.name || "",
            image: (session.user as any)?.image || "",
          },
        }),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
