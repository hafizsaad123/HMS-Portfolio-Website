/**
 * Rich text document model — the WYSIWYG case study editor's storage format.
 *
 * The admin editor is a TipTap (ProseMirror) document; `contentDoc` on the
 * Project row stores the editor's JSON. The public renderer walks that JSON
 * and emits React elements — never raw HTML, so nothing unsafe can render.
 *
 * Node types (must match the editor schema):
 *   doc · paragraph · heading{level} · text (marks: bold, italic, underline,
 *   strike, code, link{href}, textStyle{color}, highlight{color})
 *   bulletList · orderedList · listItem · blockquote · codeBlock
 *   horizontalRule · hardBreak · table · tableRow · tableCell · tableHeader
 *   custom: caseImage{src,alt,caption,width} · caseVideo{src,caption}
 *           caseCta{label,href,variant}
 *
 * This module is client-safe (no server imports) — shared by the editor,
 * the public renderer and the API validation.
 */

import { tokenizeInline, type CaseStudyBlock } from "@/lib/blocks";

// ————————————————————————————————————————————————
// Types

export interface RichMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
}

export interface RichDoc {
  type: "doc";
  content: RichNode[];
}

/** Hard limits — keeps stored docs small and pages fast. */
export const DOC_LIMITS = {
  /** Max serialized JSON length (chars). */
  maxLength: 300_000,
  /** Max total nodes in one doc. */
  maxNodes: 4_000,
};

// ————————————————————————————————————————————————
// Validation (never throws)

function countNodes(nodes: RichNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.content) count += countNodes(node.content);
  }
  return count;
}

function coerceNode(raw: unknown, depth: number): RichNode | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  if (depth > 8) return null;
  const node = raw as Record<string, unknown>;
  if (typeof node.type !== "string" || node.type.length === 0 || node.type.length > 40) return null;

  const out: RichNode = { type: node.type };

  if (node.attrs !== undefined) {
    if (typeof node.attrs !== "object" || node.attrs === null || Array.isArray(node.attrs)) {
      out.attrs = {};
    } else {
      const attrs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node.attrs as Record<string, unknown>)) {
        if (key.length > 40) continue;
        if (typeof value === "string") attrs[key] = value.slice(0, DOC_LIMITS.maxLength);
        else if (typeof value === "number" || typeof value === "boolean" || value === null) attrs[key] = value;
        else if (Array.isArray(value) && value.every((v) => typeof v === "number")) attrs[key] = value.slice(0, 40);
      }
      out.attrs = attrs;
    }
  }

  if (node.marks !== undefined) {
    if (Array.isArray(node.marks)) {
      const marks: RichMark[] = [];
      for (const mark of node.marks.slice(0, 8)) {
        if (typeof mark !== "object" || mark === null) continue;
        const m = mark as Record<string, unknown>;
        if (typeof m.type !== "string" || m.type.length > 40) continue;
        const outMark: RichMark = { type: m.type };
        if (m.attrs !== undefined && typeof m.attrs === "object" && m.attrs !== null) {
          const attrs: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(m.attrs as Record<string, unknown>)) {
            if (typeof value === "string") attrs[key] = value.slice(0, 2_000);
          }
          outMark.attrs = attrs;
        }
        marks.push(outMark);
      }
      if (marks.length > 0) out.marks = marks;
    }
  }

  if (node.text !== undefined) {
    if (typeof node.text !== "string") return null;
    out.text = node.text.slice(0, 10_000);
  }

  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return null;
    const children: RichNode[] = [];
    for (const child of node.content) {
      const coerced = coerceNode(child, depth + 1);
      if (coerced) children.push(coerced);
      if (children.length >= 500) break;
    }
    out.content = children;
  }

  return out;
}

/** Parse a stored contentDoc string → RichDoc, or null when empty/invalid. */
export function parseDocJson(json: string | null | undefined): RichDoc | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const root = parsed as { type?: unknown; content?: unknown };
    if (root.type !== "doc" || !Array.isArray(root.content)) return null;
    const content: RichNode[] = [];
    for (const child of root.content) {
      const coerced = coerceNode(child, 1);
      if (coerced) content.push(coerced);
    }
    if (countNodes(content) > DOC_LIMITS.maxNodes) return null;
    return { type: "doc", content };
  } catch {
    return null;
  }
}

/** Serialize a doc for storage (the caller saves the string as-is). */
export function serializeDoc(doc: RichDoc): string {
  return JSON.stringify(doc);
}

// ————————————————————————————————————————————————
// Emptiness

/** True when the doc has no meaningful content (no text, media or CTA). */
export function docIsEmpty(doc: RichDoc | null): boolean {
  if (!doc) return true;
  return !hasMeaningfulContent(doc.content);
}

function hasMeaningfulContent(nodes: RichNode[]): boolean {
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        if (node.text && node.text.trim().length > 0) return true;
        break;
      case "caseImage":
        if (typeof node.attrs?.src === "string" && node.attrs.src) return true;
        break;
      case "caseVideo":
        if (typeof node.attrs?.src === "string" && node.attrs.src) return true;
        break;
      case "caseCta":
        if (typeof node.attrs?.label === "string" && node.attrs.label.trim()) return true;
        break;
      case "horizontalRule":
        return true;
      default:
        break;
    }
    if (node.content && hasMeaningfulContent(node.content)) return true;
  }
  return false;
}

// ————————————————————————————————————————————————
// Migration — legacy block list (lib/blocks) → rich doc

/** Inline markup subset (**bold** *italic* `code` [label](url)) → text nodes. */
function inlineTextNodes(text: string, extraMarks: RichMark[] = []): RichNode[] {
  const tokens = tokenizeInline(text);
  const nodes: RichNode[] = [];
  const push = (raw: string, marks: RichMark[]) => {
    if (!raw) return;
    nodes.push({ type: "text", text: raw, ...(marks.length > 0 ? { marks } : {}) });
  };
  for (const token of tokens) {
    const marks = [...extraMarks];
    switch (token.kind) {
      case "bold":
        push(token.text, [...marks, { type: "bold" }]);
        break;
      case "italic":
        push(token.text, [...marks, { type: "italic" }]);
        break;
      case "code":
        push(token.text, [...marks, { type: "code" }]);
        break;
      case "link":
        push(token.text, [...marks, { type: "link", attrs: { href: token.url } }]);
        break;
      default:
        push(token.text, marks);
        break;
    }
  }
  return nodes;
}

function paragraphNode(text: string, extraMarks: RichMark[] = []): RichNode {
  const content = inlineTextNodes(text, extraMarks);
  return { type: "paragraph", ...(content.length > 0 ? { content } : {}) };
}

/**
 * Convert the previous generation case study blocks into a rich doc — used
 * when a project still has only legacy content, so nothing is ever lost and
 * the WYSIWYG editor opens with the old content in place.
 */
export function blocksToDoc(blocks: CaseStudyBlock[]): RichDoc {
  const content: RichNode[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        if (!block.text.trim()) continue;
        const level = block.level === 3 || block.level === 4 ? block.level : 2;
        content.push({ type: "heading", attrs: { level }, content: inlineTextNodes(block.text) });
        break;
      }
      case "paragraph": {
        if (!block.text.trim()) continue;
        content.push(paragraphNode(block.text));
        break;
      }
      case "image": {
        if (!block.src) continue;
        content.push({
          type: "caseImage",
          attrs: { src: block.src, alt: block.alt, caption: block.caption, width: block.width },
        });
        break;
      }
      case "video": {
        if (!block.src) continue;
        content.push({ type: "caseVideo", attrs: { src: block.src, caption: block.caption } });
        break;
      }
      case "button": {
        if (!block.label.trim() || !block.url) continue;
        content.push({
          type: "caseCta",
          attrs: { label: block.label, href: block.url, variant: block.variant },
        });
        break;
      }
      case "quote": {
        if (!block.text.trim()) continue;
        const inner: RichNode[] = [paragraphNode(block.text)];
        if (block.attribution.trim()) {
          inner.push(paragraphNode(`— ${block.attribution}`, [{ type: "italic" }]));
        }
        content.push({ type: "blockquote", content: inner });
        break;
      }
      case "list": {
        const items = block.items.filter((i) => i.trim());
        if (items.length === 0) continue;
        const listType = block.style === "number" ? "orderedList" : "bulletList";
        content.push({
          type: listType,
          content: items.map((item) => ({ type: "listItem", content: [paragraphNode(item)] })),
        });
        break;
      }
      case "divider":
        content.push({ type: "horizontalRule" });
        break;
      default:
        break;
    }
  }

  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

// ————————————————————————————————————————————————
// Word / character counting (status bar)

export function countWords(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}
