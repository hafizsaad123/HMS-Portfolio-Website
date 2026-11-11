/**
 * Case study blocks — the "blog" content model for project pages.
 *
 * A project's page is a JSON array of blocks (stored in Project.contentJson)
 * built from the admin editor. This module is intentionally client-safe
 * (no zod, no server imports): the admin editor, the public renderer and
 * the server-side API validation all share it.
 *
 * Paragraph / quote / list text supports a small inline markup subset:
 *   **bold**   *italic*   [label](https://…)   `code`
 */

// ————————————————————————————————————————————————
// Block types

export type HeadingBlock = {
  id: string;
  type: "heading";
  text: string;
  level: 2 | 3 | 4;
};

export type ParagraphBlock = {
  id: string;
  type: "paragraph";
  text: string;
};

export type ImageBlock = {
  id: string;
  type: "image";
  src: string;
  alt: string;
  caption: string;
  width: "wide" | "full";
};

export type VideoBlock = {
  id: string;
  type: "video";
  /** YouTube / Vimeo link, uploaded /api/media file or direct video URL. */
  src: string;
  caption: string;
};

export type ButtonBlock = {
  id: string;
  type: "button";
  label: string;
  url: string;
  variant: "solid" | "outline";
};

export type QuoteBlock = {
  id: string;
  type: "quote";
  text: string;
  attribution: string;
};

export type ListBlock = {
  id: string;
  type: "list";
  style: "bullet" | "number";
  items: string[];
};

export type DividerBlock = {
  id: string;
  type: "divider";
};

export type CaseStudyBlock =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | VideoBlock
  | ButtonBlock
  | QuoteBlock
  | ListBlock
  | DividerBlock;

export type BlockType = CaseStudyBlock["type"];

/** Editor labels + icons keys (icons live in the editor component). */
export const BLOCK_TYPES: Array<{ type: BlockType; label: string; hint: string }> = [
  { type: "heading", label: "Heading", hint: "Section title" },
  { type: "paragraph", label: "Text", hint: "Rich paragraph — bold, links…" },
  { type: "image", label: "Image", hint: "Upload or pick from the library" },
  { type: "video", label: "Video", hint: "YouTube, Vimeo or uploaded file" },
  { type: "button", label: "Button", hint: "Call-to-action link" },
  { type: "quote", label: "Quote", hint: "Highlight a statement" },
  { type: "list", label: "List", hint: "Bullet or numbered items" },
  { type: "divider", label: "Divider", hint: "A thin separator line" },
];

/** Hard limits — keeps stored JSON small and pages fast. */
export const BLOCK_LIMITS = {
  maxBlocks: 100,
  headingText: 300,
  paragraphText: 10_000,
  listItems: 60,
  listItemText: 500,
  quoteText: 2_000,
  captionText: 300,
  labelText: 120,
  urlText: 1_000,
};

// ————————————————————————————————————————————————
// Ids & defaults (editor helpers)

/** Collision-safe enough for client-side block ids. */
export function makeBlockId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultBlock(type: BlockType): CaseStudyBlock {
  switch (type) {
    case "heading":
      return { id: makeBlockId(), type, text: "", level: 2 };
    case "paragraph":
      return { id: makeBlockId(), type, text: "" };
    case "image":
      return { id: makeBlockId(), type, src: "", alt: "", caption: "", width: "wide" };
    case "video":
      return { id: makeBlockId(), type, src: "", caption: "" };
    case "button":
      return { id: makeBlockId(), type, label: "", url: "", variant: "solid" };
    case "quote":
      return { id: makeBlockId(), type, text: "", attribution: "" };
    case "list":
      return { id: makeBlockId(), type, style: "bullet", items: [""] };
    case "divider":
      return { id: makeBlockId(), type };
  }
}

// ————————————————————————————————————————————————
// Validation (plain TS — used by the API and the content layer)

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const capped = (v: string, max: number): string => (v.length > max ? v.slice(0, max) : v);

/** Safe link targets — http(s), mailto and site-relative paths only. */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  try {
    if (url.startsWith("/") && !url.startsWith("//")) return true;
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}

function coerceBlock(raw: unknown): CaseStudyBlock | null {
  if (!isPlainObject(raw)) return null;
  const id = str(raw.id).slice(0, 40) || makeBlockId();

  switch (raw.type) {
    case "heading": {
      const level = raw.level === 3 || raw.level === 4 ? raw.level : 2;
      return { id, type: "heading", text: capped(str(raw.text), BLOCK_LIMITS.headingText), level };
    }
    case "paragraph":
      return { id, type: "paragraph", text: capped(str(raw.text), BLOCK_LIMITS.paragraphText) };
    case "image": {
      const width = raw.width === "full" ? "full" : "wide";
      return {
        id,
        type: "image",
        src: capped(str(raw.src), BLOCK_LIMITS.urlText),
        alt: capped(str(raw.alt), BLOCK_LIMITS.captionText),
        caption: capped(str(raw.caption), BLOCK_LIMITS.captionText),
        width,
      };
    }
    case "video":
      return {
        id,
        type: "video",
        src: capped(str(raw.src), BLOCK_LIMITS.urlText),
        caption: capped(str(raw.caption), BLOCK_LIMITS.captionText),
      };
    case "button": {
      const variant = raw.variant === "outline" ? "outline" : "solid";
      return {
        id,
        type: "button",
        label: capped(str(raw.label), BLOCK_LIMITS.labelText),
        url: capped(str(raw.url), BLOCK_LIMITS.urlText),
        variant,
      };
    }
    case "quote":
      return {
        id,
        type: "quote",
        text: capped(str(raw.text), BLOCK_LIMITS.quoteText),
        attribution: capped(str(raw.attribution), BLOCK_LIMITS.captionText),
      };
    case "list": {
      const style = raw.style === "number" ? "number" : "bullet";
      const items = Array.isArray(raw.items)
        ? raw.items
            .filter((i): i is string => typeof i === "string")
            .slice(0, BLOCK_LIMITS.listItems)
            .map((i) => capped(i, BLOCK_LIMITS.listItemText))
        : [];
      return { id, type: "list", style, items };
    }
    case "divider":
      return { id, type: "divider" };
    default:
      return null;
  }
}

/**
 * Coerce an unknown value into a clean block list: unknown shapes become
 * well-formed blocks, junk is dropped, limits are enforced. Never throws.
 */
export function sanitizeBlocks(value: unknown): CaseStudyBlock[] {
  if (!Array.isArray(value)) return [];
  const out: CaseStudyBlock[] = [];
  for (const raw of value) {
    const block = coerceBlock(raw);
    if (block) out.push(block);
    if (out.length >= BLOCK_LIMITS.maxBlocks) break;
  }
  return out;
}

/** True when the input is *exactly* a valid block list (API validation). */
export function isValidBlockList(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length <= BLOCK_LIMITS.maxBlocks;
}

/** Parse a stored contentJson string — never throws, [] on junk. */
export function parseBlocksJson(json: string | null | undefined): CaseStudyBlock[] {
  if (!json) return [];
  try {
    return sanitizeBlocks(JSON.parse(json));
  } catch {
    return [];
  }
}

/** Serialize blocks for storage. */
export function serializeBlocks(blocks: CaseStudyBlock[]): string {
  return JSON.stringify(sanitizeBlocks(blocks));
}

// ————————————————————————————————————————————————
// Video URL helpers

export type ParsedVideo =
  | { kind: "youtube"; embedSrc: string }
  | { kind: "vimeo"; embedSrc: string }
  | { kind: "file"; src: string }
  | null;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** Turn a YouTube / Vimeo / direct-file link into something renderable. */
export function parseVideoUrl(url: string): ParsedVideo {
  const value = url.trim();
  if (!value) return null;

  // uploaded file or relative path
  if (value.startsWith("/")) return { kind: "file", src: value };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube — watch, youtu.be, /embed/, /shorts/
  if (host === "youtu.be" && parsed.pathname.length > 1) {
    const id = parsed.pathname.slice(1).split("/")[0];
    if (YOUTUBE_ID.test(id)) return { kind: "youtube", embedSrc: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const id = parsed.searchParams.get("v");
    if (id && YOUTUBE_ID.test(id)) {
      return { kind: "youtube", embedSrc: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
    }
    const embed = /^\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{6,20})/.exec(parsed.pathname);
    if (embed) {
      return { kind: "youtube", embedSrc: `https://www.youtube-nocookie.com/embed/${embed[2]}?rel=0` };
    }
  }

  // Vimeo — vimeo.com/123456789 (and player.vimeo.com/video/…)
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = /(\d{6,12})/.exec(parsed.pathname);
    if (id) return { kind: "vimeo", embedSrc: `https://player.vimeo.com/video/${id[1]}` };
  }

  // direct video file
  if (/\.(mp4|webm|ogv|ogg|mov)(\?|#|$)/i.test(parsed.pathname)) {
    return { kind: "file", src: value };
  }

  return null;
}

// ————————————————————————————————————————————————
// Inline markup tokens (paragraph / quote / list items)
//
// Subset: **bold** · *italic* · [label](url) · `code`
// The renderer builds React elements from these — never raw HTML.

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; url: string };

const INLINE_RE = /(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|mailto:[^\s)]+)\))/g;

/** Tokenize a string with the inline markup subset (unmatched text = text). */
export function tokenizeInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  for (const match of input.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ kind: "text", text: input.slice(lastIndex, index) });
    if (match[2] !== undefined) tokens.push({ kind: "bold", text: match[2] });
    else if (match[4] !== undefined) tokens.push({ kind: "italic", text: match[4] });
    else if (match[6] !== undefined) tokens.push({ kind: "code", text: match[6] });
    else if (match[8] !== undefined && match[9] !== undefined) {
      tokens.push({ kind: "link", text: match[8], url: match[9] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < input.length) tokens.push({ kind: "text", text: input.slice(lastIndex) });
  return tokens;
}
