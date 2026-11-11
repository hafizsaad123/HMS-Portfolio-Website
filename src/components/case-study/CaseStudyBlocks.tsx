import { Fragment } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  isSafeUrl,
  parseVideoUrl,
  tokenizeInline,
  type CaseStudyBlock,
  type InlineToken,
} from "@/lib/blocks";

/**
 * Case study body renderer — turns the admin editor's block list into the
 * public /work/<slug> page. Pure server component: no state, no effects.
 *
 * Layout rhythm:
 *  - text blocks (headings, paragraphs, quotes, lists, buttons) sit in a
 *    readable ~50rem column;
 *  - "wide" images share that column, "full" images span the whole main
 *    column — a classic editorial case-study layout.
 */

/** Render the inline markup subset (**bold**, *italic*, `code`, [text](url)). */
function Inline({ text }: { text: string }) {
  const tokens = tokenizeInline(text);
  return (
    <>
      {tokens.map((token, i) => (
        <InlineTokenView key={i} token={token} />
      ))}
    </>
  );
}

function InlineTokenView({ token }: { token: InlineToken }) {
  switch (token.kind) {
    case "bold":
      return <strong className="font-semibold text-ink">{token.text}</strong>;
    case "italic":
      return <em>{token.text}</em>;
    case "code":
      return (
        <code className="rounded bg-badge px-1.5 py-0.5 text-[0.85em] text-brand-deep">{token.text}</code>
      );
    case "link": {
      const external = /^https?:\/\//.test(token.url);
      if (!isSafeUrl(token.url)) return <>{token.text}</>;
      return (
        <a
          href={token.url}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          {token.text}
        </a>
      );
    }
    default:
      return <>{token.text}</>;
  }
}

function ImageFigure({ block }: { block: Extract<CaseStudyBlock, { type: "image" }> }) {
  if (!block.src) return null;
  return (
    <figure className={block.width === "full" ? "w-full" : "mx-auto w-full max-w-[50rem]"}>
      {/* Uploaded images have unknown aspect ratios — plain img keeps them uncropped. */}
      <img
        src={block.src}
        alt={block.alt || block.caption || ""}
        loading="lazy"
        decoding="async"
        className="w-full rounded-xl border border-line bg-badge object-contain"
      />
      {block.caption ? (
        <figcaption className="mt-2.5 text-center text-[13px] text-soft">{block.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function VideoFigure({ block }: { block: Extract<CaseStudyBlock, { type: "video" }> }) {
  const parsed = parseVideoUrl(block.src);
  if (!parsed) return null;

  return (
    <figure className="mx-auto w-full max-w-[50rem]">
      <div className="overflow-hidden rounded-xl border border-line bg-black">
        {parsed.kind === "file" ? (
          <video src={parsed.src} controls preload="metadata" playsInline className="aspect-video w-full" />
        ) : (
          <iframe
            src={parsed.embedSrc}
            title={block.caption || "Embedded video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full"
          />
        )}
      </div>
      {block.caption ? (
        <figcaption className="mt-2.5 text-center text-[13px] text-soft">{block.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function BlockView({ block }: { block: CaseStudyBlock }) {
  switch (block.type) {
    case "heading": {
      if (!block.text) return null;
      const sizes = { 2: "text-2xl sm:text-[1.7rem]", 3: "text-xl sm:text-[1.3rem]", 4: "text-lg" } as const;
      const Tag = `h${block.level}` as "h2" | "h3" | "h4";
      return (
        <Tag className={`mt-14 font-bold tracking-tight text-ink first:mt-0 ${sizes[block.level]}`}>
          {block.text}
        </Tag>
      );
    }
    case "paragraph":
      if (!block.text) return null;
      return (
        <p className="text-[15.5px] leading-[1.85] text-body">
          <Inline text={block.text} />
        </p>
      );
    case "image":
      return <ImageFigure block={block} />;
    case "video":
      return <VideoFigure block={block} />;
    case "button": {
      if (!block.label || !isSafeUrl(block.url)) return null;
      const external = /^https?:\/\//.test(block.url);
      const cls =
        block.variant === "solid"
          ? "bg-brand text-white hover:bg-brand-deep"
          : "border border-line bg-white text-ink hover:border-brand hover:text-brand";
      return (
        <p className="pt-1">
          <a
            href={block.url}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${cls}`}
          >
            {block.label}
            {external ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
          </a>
        </p>
      );
    }
    case "quote":
      if (!block.text) return null;
      return (
        <blockquote className="relative rounded-2xl border border-line bg-badge/60 p-6 sm:p-7">
          <span aria-hidden="true" className="absolute left-0 top-6 h-[calc(100%-3rem)] w-1 rounded-full bg-brand" />
          <p className="text-[16.5px] leading-relaxed font-medium text-ink">
            <Inline text={block.text} />
          </p>
          {block.attribution ? (
            <footer className="mt-3 text-[13px] text-soft">— {block.attribution}</footer>
          ) : null}
        </blockquote>
      );
    case "list": {
      const items = block.items.filter(Boolean);
      if (items.length === 0) return null;
      const Tag = block.style === "number" ? "ol" : "ul";
      return (
        <Tag className="flex flex-col gap-2.5 pl-0 text-[15.5px] leading-relaxed text-body">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              {block.style === "number" ? (
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[12px] font-semibold text-brand"
                >
                  {i + 1}
                </span>
              ) : (
                <span aria-hidden="true" className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-[2px] bg-brand" />
              )}
              <span>
                <Inline text={item} />
              </span>
            </li>
          ))}
        </Tag>
      );
    }
    case "divider":
      return <hr className="border-line" />;
    default:
      return null;
  }
}

/** Gap between blocks; media sits closer to its neighbors. */
function wrapperClass(block: CaseStudyBlock): string {
  if (block.type === "heading") return "mt-14";
  if (block.type === "image" || block.type === "video") return "mt-10";
  if (block.type === "divider") return "my-10";
  return "mt-6";
}

export function CaseStudyBlocks({ blocks }: { blocks: CaseStudyBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col">
      {blocks.map((block) => (
        <div key={block.id} className={wrapperClass(block)}>
          <BlockView block={block} />
        </div>
      ))}
    </div>
  );
}
