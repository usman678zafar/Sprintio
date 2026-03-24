"use client";

import clsx from "clsx";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";

import type { WikiDocument } from "@/lib/wiki/shared";

type MarkdownPreviewProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  title: string;
  document: WikiDocument;
  selectedBlockId?: string | null;
};

type RenderContext = {
  inListItem?: boolean;
};

function getInlineTextContent(content: JSONContent[] | undefined): string {
  if (!content?.length) return "";

  return content
    .map((child) => {
      if (child.type === "text") {
        return child.text || "";
      }

      if (child.type === "hardBreak") {
        return "\n";
      }

      return getInlineTextContent(child.content);
    })
    .join("");
}

function renderInlineNode(node: JSONContent, key: string): ReactNode {
  if (node.type === "text") {
    let rendered: ReactNode = node.text || "";

    (node.marks || []).forEach((mark, index) => {
      const markKey = `${key}-${mark.type}-${index}`;

      if (mark.type === "bold") {
        rendered = <strong key={markKey}>{rendered}</strong>;
        return;
      }

      if (mark.type === "italic") {
        rendered = <em key={markKey}>{rendered}</em>;
        return;
      }

      if (mark.type === "strike") {
        rendered = <s key={markKey}>{rendered}</s>;
        return;
      }

      if (mark.type === "code") {
        rendered = (
          <code key={markKey} className="rounded-lg bg-base px-1.5 py-1 text-[13px] text-text-base">
            {rendered}
          </code>
        );
        return;
      }

      if (mark.type === "link") {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "#";
        rendered = (
          <a
            key={markKey}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-4"
          >
            {rendered}
          </a>
        );
      }
    });

    return rendered;
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  return renderInlineContent(node.content, key);
}

function renderInlineContent(content: JSONContent[] | undefined, keyPrefix: string) {
  if (!content?.length) return null;
  return content.map((child, index) => renderInlineNode(child, `${keyPrefix}-${index}`));
}

function getBlockHighlightClass(blockId: string | null | undefined, selectedBlockId: string | null | undefined) {
  if (!blockId || blockId !== selectedBlockId) return "";
  return "rounded-xl bg-primary/8";
}

function renderBlockNode(
  node: JSONContent,
  key: string,
  selectedBlockId: string | null | undefined,
  context: RenderContext = {}
): ReactNode {
  const blockId = typeof node.attrs?.blockId === "string" ? node.attrs.blockId : undefined;
  const highlightClass = getBlockHighlightClass(blockId, selectedBlockId);

  switch (node.type) {
    case "heading": {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 1));
      const headingClass =
        level === 1
          ? "mt-8 text-3xl font-semibold tracking-tight text-text-base first:mt-0"
          : level === 2
            ? "mt-7 text-2xl font-semibold tracking-tight text-text-base first:mt-0"
            : "mt-6 text-xl font-semibold tracking-tight text-text-base first:mt-0";

      if (level === 1) {
        return (
          <h1 key={key} data-block-id={blockId} className={clsx(headingClass, highlightClass, "px-2 py-1")}>
            {renderInlineContent(node.content, key)}
          </h1>
        );
      }

      if (level === 2) {
        return (
          <h2 key={key} data-block-id={blockId} className={clsx(headingClass, highlightClass, "px-2 py-1")}>
            {renderInlineContent(node.content, key)}
          </h2>
        );
      }

      return (
        <h3 key={key} data-block-id={blockId} className={clsx(headingClass, highlightClass, "px-2 py-1")}>
          {renderInlineContent(node.content, key)}
        </h3>
      );
    }
    case "paragraph":
      if (!getInlineTextContent(node.content).trim()) {
        return (
          <div
            key={key}
            data-block-id={blockId}
            aria-hidden="true"
            className={clsx(
              context.inListItem ? "min-h-[1.35rem]" : "mt-2 min-h-[1.75rem] px-2",
              highlightClass
            )}
          />
        );
      }

      return (
        <p
          key={key}
          data-block-id={blockId}
          className={clsx(
            context.inListItem
              ? "my-1 px-2 py-1 text-sm leading-7 text-muted sm:text-base"
              : "mt-4 px-2 py-1 text-sm leading-7 text-muted first:mt-0 sm:text-base",
            highlightClass
          )}
        >
          {renderInlineContent(node.content, key)}
        </p>
      );
    case "bulletList":
      return (
        <ul key={key} className="mt-4 list-disc space-y-1 pl-7 text-sm leading-7 text-muted sm:text-base">
          {(node.content || []).map((child, index) => renderBlockNode(child, `${key}-${index}`, selectedBlockId))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="mt-4 list-decimal space-y-1 pl-7 text-sm leading-7 text-muted sm:text-base">
          {(node.content || []).map((child, index) => renderBlockNode(child, `${key}-${index}`, selectedBlockId))}
        </ol>
      );
    case "listItem":
      return (
        <li key={key} className="pl-1">
          {(node.content || []).map((child, index) =>
            renderBlockNode(child, `${key}-${index}`, selectedBlockId, { inListItem: true })
          )}
        </li>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="mt-5 rounded-r-2xl border-l-4 border-primary/70 bg-primary/8 px-4 py-3 text-sm leading-7 text-text-base"
        >
          {(node.content || []).map((child, index) =>
            renderBlockNode(child, `${key}-${index}`, selectedBlockId)
          )}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          key={key}
          data-block-id={blockId}
          className={clsx(
            "mt-5 overflow-x-auto rounded-[24px] border border-border-subtle bg-[#151515] p-4 text-sm text-white",
            highlightClass
          )}
        >
          <code>{(node.content || []).map((child) => child.text || "").join("")}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} data-block-id={blockId} className={clsx("my-8 border-border-subtle", highlightClass)} />;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const width = typeof node.attrs?.width === "number" ? node.attrs.width : Number(node.attrs?.width) || undefined;
      const height = typeof node.attrs?.height === "number" ? node.attrs.height : Number(node.attrs?.height) || undefined;

      if (!src) return null;

      return (
        <figure
          key={key}
          data-block-id={blockId}
          className={clsx("mt-5 px-2 py-1", highlightClass)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full rounded-[20px] border border-border-subtle bg-base object-contain"
            style={{
              width: width ? `min(100%, ${width}px)` : "100%",
              aspectRatio: width && height ? `${width} / ${height}` : undefined,
              height: "auto",
            }}
          />
          {alt && alt.toLowerCase() !== "image" ? (
            <figcaption className="px-1 pt-3 text-sm text-muted">{alt}</figcaption>
          ) : null}
        </figure>
      );
    }
    default:
      return (node.content || []).map((child, index) =>
        renderBlockNode(child, `${key}-${index}`, selectedBlockId, context)
      );
  }
}

const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(function MarkdownPreview(
  { title, document, selectedBlockId, className, ...props },
  ref
) {
  const blocks = document?.content || [];

  return (
    <div
      ref={ref}
      className={clsx("h-full overflow-y-auto bg-surface px-5 py-5", className)}
      {...props}
    >
      <div className="mx-auto max-w-4xl pb-12">
        {blocks.length > 0 ? (
          <div className="space-y-1">
            {blocks.map((node, index) => renderBlockNode(node, `preview-${index}`, selectedBlockId))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border-subtle bg-base/60 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-text-base">Nothing here yet</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Start typing in {title.trim() || "the editor"} and the preview will render block-for-block here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default MarkdownPreview;
