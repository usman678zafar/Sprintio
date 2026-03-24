import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import MarkdownIt from "markdown-it";

const markdownRenderer = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
});

const BLOCK_ID_NODE_TYPES = ["paragraph", "heading", "codeBlock", "image", "horizontalRule"] as const;
const blockIdNodeTypeSet = new Set<string>(BLOCK_ID_NODE_TYPES);

type WikiMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

function createWikiBlockId() {
  return `wiki_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function escapeMarkdownText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/([*_`~[\]])/g, "\\$1");
}

function escapeCodeText(value: string) {
  return value.replace(/`/g, "\\`");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeDimension(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const numericValue = Math.round(Number(value));
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function serializeTextNode(node: JSONContent) {
  const sourceText = typeof node.text === "string" ? node.text : "";
  const marks = ((node.marks || []) as WikiMark[]).slice();

  if (marks.some((mark) => mark.type === "code")) {
    return `\`${escapeCodeText(sourceText)}\``;
  }

  let rendered = escapeMarkdownText(sourceText);
  const orderedMarks = marks
    .filter((mark) => mark.type !== "code")
    .sort((left, right) => {
      const priority: Record<string, number> = {
        bold: 1,
        italic: 2,
        strike: 3,
        link: 4,
      };

      return (priority[left.type] || 99) - (priority[right.type] || 99);
    });

  orderedMarks.forEach((mark) => {
    if (mark.type === "bold") {
      rendered = `**${rendered}**`;
      return;
    }

    if (mark.type === "italic") {
      rendered = `*${rendered}*`;
      return;
    }

    if (mark.type === "strike") {
      rendered = `~~${rendered}~~`;
      return;
    }

    if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
      rendered = href ? `[${rendered}](${href})` : rendered;
    }
  });

  return rendered;
}

function serializeInlineContent(content: JSONContent[] | undefined): string {
  if (!content?.length) return "";

  return content
    .map((node) => {
      if (node.type === "text") {
        return serializeTextNode(node);
      }

      if (node.type === "hardBreak") {
        return "  \n";
      }

      return serializeInlineContent(node.content);
    })
    .join("");
}

function prefixMarkdownBlock(value: string, prefix: string) {
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`.trimEnd())
    .join("\n");
}

function serializeListItem(node: JSONContent, depth: number, ordered: boolean, index: number) {
  const indent = "  ".repeat(depth);
  const marker = ordered ? `${index + 1}. ` : "- ";
  const childNodes = node.content || [];
  const lines: string[] = [];
  let hasPrimaryLine = false;

  childNodes.forEach((child) => {
    if (child.type === "paragraph") {
      const line = serializeInlineContent(child.content).trim();
      if (!hasPrimaryLine) {
        lines.push(`${indent}${marker}${line}`.trimEnd());
        hasPrimaryLine = true;
        return;
      }

      if (line) {
        lines.push(`${indent}  ${line}`);
      }
      return;
    }

    if (child.type === "bulletList" || child.type === "orderedList") {
      const nestedList = serializeBlockNode(child, depth + 1);
      if (nestedList) {
        lines.push(nestedList);
      }
      return;
    }

    const renderedChild = serializeBlockNode(child, depth + 1);
    if (!renderedChild) return;

    if (!hasPrimaryLine) {
      lines.push(`${indent}${marker}${renderedChild}`);
      hasPrimaryLine = true;
      return;
    }

    lines.push(`${indent}  ${renderedChild}`);
  });

  if (!hasPrimaryLine) {
    lines.push(`${indent}${marker}`.trimEnd());
  }

  return lines.join("\n");
}

function serializeList(node: JSONContent, depth: number, ordered: boolean) {
  return (node.content || [])
    .map((child, index) => serializeListItem(child, depth, ordered, index))
    .filter(Boolean)
    .join("\n");
}

function serializeBlockNode(node: JSONContent, depth = 0): string {
  if (!node.type) {
    return serializeInlineContent(node.content);
  }

  switch (node.type) {
    case "paragraph":
      return serializeInlineContent(node.content).trimEnd();
    case "heading": {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 1));
      return `${"#".repeat(level)} ${serializeInlineContent(node.content).trim()}`.trimEnd();
    }
    case "bulletList":
      return serializeList(node, depth, false);
    case "orderedList":
      return serializeList(node, depth, true);
    case "blockquote": {
      const body = (node.content || [])
        .map((child) => serializeBlockNode(child, depth))
        .filter(Boolean)
        .join("\n\n");

      return prefixMarkdownBlock(body, "> ");
    }
    case "codeBlock": {
      const language = typeof node.attrs?.language === "string" ? node.attrs.language.trim() : "";
      const code = (node.content || [])
        .map((child) => (typeof child.text === "string" ? child.text : serializeInlineContent(child.content)))
        .join("");

      return `\`\`\`${language}\n${code}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      if (!src) return "";

      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const width = sanitizeDimension(node.attrs?.width);
      const height = sanitizeDimension(node.attrs?.height);

      const attributes = [
        `src="${escapeHtmlAttribute(src)}"`,
        `alt="${escapeHtmlAttribute(alt)}"`,
        width ? `width="${width}"` : null,
        height ? `height="${height}"` : null,
      ]
        .filter(Boolean)
        .join(" ");

      return `<img ${attributes} />`;
    }
    default:
      return serializeInlineContent(node.content);
  }
}

export const WikiBlockIdExtension = Extension.create({
  name: "wikiBlockId",

  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_ID_NODE_TYPES],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute("data-block-id"),
            renderHTML: (attributes: Record<string, unknown>) => {
              const blockId = typeof attributes.blockId === "string" ? attributes.blockId : "";

              return blockId ? { "data-block-id": blockId } : {};
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          let transaction = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (!blockIdNodeTypeSet.has(node.type.name)) {
              return;
            }

            if (typeof node.attrs.blockId === "string" && node.attrs.blockId) {
              return;
            }

            transaction = transaction.setNodeMarkup(
              pos,
              node.type,
              { ...node.attrs, blockId: createWikiBlockId() },
              node.marks
            );
            modified = true;
          });

          return modified ? transaction : null;
        },
      }),
    ];
  },
});

export function renderMarkdownToHtml(markdown: string) {
  return markdownRenderer.render(markdown || "");
}

export function serializeWikiDocumentToMarkdown(document: JSONContent | null) {
  if (!document?.content?.length) return "";

  return document.content
    .map((node) => serializeBlockNode(node))
    .filter((block) => block.length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getSelectedBlockId(editor: Editor | null) {
  if (!editor) return null;

  const selection = editor.state.selection;
  const $anchor = selection.$anchor;

  for (let depth = $anchor.depth; depth > 0; depth -= 1) {
    const node = $anchor.node(depth);
    const blockId = node.attrs?.blockId;

    if (typeof blockId === "string" && blockId) {
      return blockId;
    }
  }

  const firstNode = editor.state.doc.firstChild;
  const firstBlockId = firstNode?.attrs?.blockId;
  return typeof firstBlockId === "string" && firstBlockId ? firstBlockId : null;
}
