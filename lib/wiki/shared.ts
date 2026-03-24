import type { JSONContent } from "@tiptap/react";

export type WikiDocument = JSONContent | null;

export type WikiPageDto = {
  _id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  slug: string;
  content: string;
  document: WikiDocument;
  excerpt: string;
  order: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  versionCount?: number;
};

export function normalizeWikiTitle(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 140);
}

export function slugifyWikiTitle(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

  return slug || "untitled-page";
}

function collectDocumentText(node: JSONContent | undefined, segments: string[]) {
  if (!node) return;

  if (typeof node.text === "string") {
    segments.push(node.text);
  }

  node.content?.forEach((child) => collectDocumentText(child, segments));
}

export function extractPlainTextFromWikiDocument(document: WikiDocument) {
  if (!document) return "";

  const segments: string[] = [];
  collectDocumentText(document, segments);
  return segments.join(" ").replace(/\s+/g, " ").trim();
}

export function stripMarkdownMarkup(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]/g, " ")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripLeadingTitleHeading(markdown: string, title: string) {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) return markdown;

  const lines = markdown.split("\n");
  const firstMeaningfulLineIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstMeaningfulLineIndex === -1) {
    return markdown;
  }

  const headingMatch = lines[firstMeaningfulLineIndex].trim().match(/^#{1,6}\s+(.*)$/);
  if (!headingMatch) {
    return markdown;
  }

  if (headingMatch[1].trim().toLowerCase() !== normalizedTitle) {
    return markdown;
  }

  const nextLines = [...lines];
  nextLines.splice(firstMeaningfulLineIndex, 1);
  return nextLines.join("\n").replace(/^\s+/, "");
}

export function buildWikiExcerpt(markdown: string, document: WikiDocument, limit = 280) {
  const source = extractPlainTextFromWikiDocument(document) || stripMarkdownMarkup(markdown || "");
  if (source.length <= limit) return source;
  return `${source.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

export function createStarterWikiDocument(): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Start writing here." }],
      },
    ],
  };
}
