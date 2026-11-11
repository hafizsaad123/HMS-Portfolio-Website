"use client";

import { ArrowUpRight } from "lucide-react";
import { isSafeUrl, parseVideoUrl } from "@/lib/blocks";
import type { RichDoc, RichNode } from "@/lib/rich";

/**
 * Rich document renderer — turns the admin WYSIWYG editor's JSON document
 * into the public /work/<slug> body. Pure server component; the JSON is
 * walked and emitted as React elements, so no raw HTML is ever rendered.
 *
 * The container carries the shared `.rich-surface` stylesheet — the exact
 * same one the editor's page canvas uses, which is what makes the editor
 * true WYSIWYG.
 */

const str = (value: unknown): string => (typeof value === "string" ? value : "");

// ————————————————————————————————————————————————
// Inline content — text nodes with marks

function InlineRun({ node }: { node: RichNode }) {
  let element: React.ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "underline":
        element = <u>{element}</u>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "code":
        element = <code>{element}</code>;
        break;
      case "highlight": {
        const color = str(mark.attrs?.color);
        element = <mark style={color ? { backgroundColor: color } : undefined}>{element}</mark>;
        break;
      }
      case "textStyle": {
        const color = str(mark.attrs?.color);
        if (color) element = <span style={{ color }}>{element}</span>;
        break;
      }
      case "link": {
        const href = str(mark.attrs?.href);
        if (isSafeUrl(href)) {
          const external = /^https?:\/\//.test(href);
          element = (
            <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {element}
            </a>
          );
        }
        break;
      }
      default:
        break;
    }
  }

  return <>{element}</>;
}

function Nodes({ nodes }: { nodes: RichNode[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <NodeView key={index} node={node} />
      ))}
    </>
  );
}

// ————————————————————————————————————————————————
// Blocks

function alignStyle(node: RichNode): React.CSSProperties | undefined {
  const align = str(node.attrs?.textAlign);
  return align === "center" || align === "right" ? { textAlign: align } : undefined;
}

/** Plain text of a node tree (code blocks). */
function textOf(nodes: RichNode[]): string {
  return nodes
    .map((node) => (node.type === "text" ? node.text ?? "" : node.content ? textOf(node.content) : ""))
    .join("");
}

function NodeView({ node }: { node: RichNode }) {
  switch (node.type) {
    case "text":
      return <InlineRun node={node} />;

    case "paragraph":
      return (
        <p style={alignStyle(node)}>
          <Nodes nodes={node.content ?? []} />
        </p>
      );

    case "heading": {
      const level = node.attrs?.level === 3 || node.attrs?.level === 4 ? Number(node.attrs.level) : 2;
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return (
        <Tag style={alignStyle(node)}>
          <Nodes nodes={node.content ?? []} />
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul>
          <Nodes nodes={node.content ?? []} />
        </ul>
      );

    case "orderedList":
      return (
        <ol>
          <Nodes nodes={node.content ?? []} />
        </ol>
      );

    case "listItem":
      return (
        <li>
          <Nodes nodes={node.content ?? []} />
        </li>
      );

    case "blockquote":
      return (
        <blockquote>
          <Nodes nodes={node.content ?? []} />
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre>
          <code>{textOf(node.content ?? [])}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr />;

    case "hardBreak":
      return <br />;

    case "caseImage": {
      const src = str(node.attrs?.src);
      if (!src) return null;
      const alt = str(node.attrs?.alt);
      const caption = str(node.attrs?.caption);
      const full = str(node.attrs?.width) === "full";
      return (
        <figure className={`media-figure ${full ? "w-full" : "mx-auto w-full"}`}>
          {/* Uploaded images have unknown aspect ratios — plain img keeps them uncropped. */}
          <img
            src={src}
            alt={alt || caption || ""}
            loading="lazy"
            decoding="async"
            className="w-full rounded-xl border border-line bg-badge object-contain"
          />
          {caption ? (
            <figcaption className="mt-2.5 text-center text-[13px] text-soft">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }

    case "caseVideo": {
      const src = str(node.attrs?.src);
      const caption = str(node.attrs?.caption);
      const parsed = parseVideoUrl(src);
      if (!parsed) return null;
      return (
        <figure className="media-figure mx-auto w-full">
          <div className="overflow-hidden rounded-xl border border-line bg-black">
            {parsed.kind === "file" ? (
              <video src={parsed.src} controls preload="metadata" playsInline className="aspect-video w-full" />
            ) : (
              <iframe
                src={parsed.embedSrc}
                title={caption || "Embedded video"}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="aspect-video w-full"
              />
            )}
          </div>
          {caption ? (
            <figcaption className="mt-2.5 text-center text-[13px] text-soft">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }

    case "caseCta": {
      const label = str(node.attrs?.label);
      const href = str(node.attrs?.href);
      if (!label.trim() || !isSafeUrl(href)) return null;
      const external = /^https?:\/\//.test(href);
      const cls =
        str(node.attrs?.variant) === "outline"
          ? "border border-line bg-white text-ink hover:border-brand hover:text-brand"
          : "bg-brand text-white hover:bg-brand-deep";
      return (
        <p className="pt-1">
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${cls}`}
          >
            {label}
            {external ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
          </a>
        </p>
      );
    }

    case "table":
      return (
        <table>
          <tbody>
            <Nodes nodes={node.content ?? []} />
          </tbody>
        </table>
      );

    case "tableRow":
      return (
        <tr>
          <Nodes nodes={node.content ?? []} />
        </tr>
      );

    case "tableCell":
      return (
        <td>
          <Nodes nodes={node.content ?? []} />
        </td>
      );

    case "tableHeader":
      return (
        <th>
          <Nodes nodes={node.content ?? []} />
        </th>
      );

    default:
      return null;
  }
}

/** Render a case study document (see lib/rich.ts). */
export function RichDocRenderer({ doc }: { doc: RichDoc }) {
  return (
    <div className="rich-surface">
      <Nodes nodes={doc.content} />
    </div>
  );
}
