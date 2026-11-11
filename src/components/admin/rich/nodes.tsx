"use client";

/**
 * Custom TipTap nodes for the case study WYSIWYG editor.
 *
 *  - caseImage — figure with alt/caption + column/full width
 *  - caseVideo — YouTube / Vimeo / uploaded video with caption
 *  - caseCta   — call-to-action button (solid/outline)
 *
 * Each renders through a React NodeView: the block previews exactly like the
 * public page, with editing controls that appear while the node is selected.
 * The public renderer (components/case-study/RichDocRenderer) understands the
 * same node names and attributes.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Image as ImageIcon, Upload, Trash2, ExternalLink, MousePointerClick, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { uploadMedia, friendlyUploadError } from "@/lib/admin/upload";
import { parseVideoUrl } from "@/lib/blocks";

/** Stop editor key handling while typing in a node's inputs. */
const inputHandlers = {
  onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
  onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
};

// ————————————————————————————————————————————————
// Schema definitions

export const CaseImage = Node.create({
  name: "caseImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      width: { default: "wide" }, // "wide" (text column) | "full"
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-case-image]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-case-image": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CaseImageView);
  },
});

export const CaseVideo = Node.create({
  name: "caseVideo",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-case-video]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-case-video": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CaseVideoView);
  },
});

export const CaseCta = Node.create({
  name: "caseCta",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: "" },
      href: { default: "" },
      variant: { default: "solid" }, // "solid" | "outline"
    };
  },

  parseHTML() {
    return [{ tag: "div[data-case-cta]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-case-cta": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CaseCtaView);
  },
});

// ————————————————————————————————————————————————
// Shared chrome

/** Floating control bar shown while a media node is selected. */
function NodeToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div
      contentEditable={false}
      className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-sm"
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function CaptionInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div contentEditable={false} className="mt-2.5" onMouseDown={(e) => e.stopPropagation()}>
      <label className="sr-only" htmlFor="caption-input">Caption</label>
      <input
        {...inputHandlers}
        id="caption-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Caption (optional) — shown under the media"
        className="w-full rounded-lg border-0 bg-transparent px-1 py-1 text-center text-[13px] text-soft placeholder:text-soft/70 focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}

// ————————————————————————————————————————————————
// caseImage — figure view

function CaseImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const src: string = (node.attrs.src as string) || "";
  const alt: string = (node.attrs.alt as string) || "";
  const caption: string = (node.attrs.caption as string) || "";
  const width: string = (node.attrs.width as string) === "full" ? "full" : "wide";

  return (
    <NodeViewWrapper
      as="figure"
      className={cn(
        "media-figure relative",
        width === "full" ? "w-full" : "mx-auto w-full",
        selected && "node-selected",
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt || caption || ""}
          draggable={false}
          className="w-full cursor-grab rounded-xl border border-line bg-badge object-contain"
        />
      ) : (
        <div
          contentEditable={false}
          className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-badge/50 text-soft"
        >
          <ImageIcon className="h-7 w-7 text-brand" aria-hidden="true" />
          <span className="text-sm">Pick an image to place it here</span>
          <MediaPicker
            current={src}
            onChange={(url) => updateAttributes({ src: url })}
            label="Choose image"
          />
        </div>
      )}

      {src ? <CaptionInput value={caption} onChange={(v) => updateAttributes({ caption: v })} /> : null}

      {src && selected ? (
        <NodeToolbar>
          <div className="flex items-center overflow-hidden rounded-lg border border-line">
            <button
              type="button"
              onClick={() => updateAttributes({ width: "wide" })}
              className={cn(
                "h-8 px-3 text-[12.5px] font-medium transition-colors",
                width !== "full" ? "bg-brand text-white" : "bg-white text-body hover:bg-badge",
              )}
            >
              In column
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ width: "full" })}
              className={cn(
                "h-8 px-3 text-[12.5px] font-medium transition-colors",
                width === "full" ? "bg-brand text-white" : "bg-white text-body hover:bg-badge",
              )}
            >
              Full width
            </button>
          </div>
          <MediaPicker current={src} onChange={(url) => updateAttributes({ src: url })} label="Replace" />
          <div className="flex min-w-40 flex-1 items-center gap-1.5">
            <label htmlFor="alt-input" className="text-[12px] font-medium text-soft">Alt</label>
            <Input
              {...inputHandlers}
              id="alt-input"
              value={alt}
              onChange={(e) => updateAttributes({ alt: e.target.value })}
              placeholder="Describe the image (accessibility)"
              className="h-8 flex-1 text-[12.5px]"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete image"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            onClick={deleteNode}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </NodeToolbar>
      ) : null}
    </NodeViewWrapper>
  );
}

// ————————————————————————————————————————————————
// caseVideo — YouTube / Vimeo / uploaded file

function CaseVideoView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const src: string = (node.attrs.src as string) || "";
  const caption: string = (node.attrs.caption as string) || "";
  const parsed = src ? parseVideoUrl(src) : null;
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 64 * 1024 * 1024) {
      toast.error("Videos must be 64 MB or smaller — for longer clips, paste a YouTube link instead.");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadMedia(file); // straight to Supabase Storage
      updateAttributes({ src: res.url });
      toast.success("Video uploaded.");
    } catch (e) {
      toast.error(friendlyUploadError(e, "Video upload"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <NodeViewWrapper as="figure" className={cn("media-figure relative", selected && "node-selected")}>
      {parsed ? (
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
      ) : (
        <div
          contentEditable={false}
          className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-badge/50 text-soft"
        >
          {src ? (
            <p className="px-6 text-center text-[13px] text-red-500">
              Link not recognized — use a YouTube or Vimeo link, a direct .mp4/.webm URL, or upload a file.
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-body">Video</p>
              <p className="text-[12.5px]">YouTube · Vimeo · uploaded MP4/WebM</p>
            </>
          )}
        </div>
      )}

      {src ? <CaptionInput value={caption} onChange={(v) => updateAttributes({ caption: v })} /> : null}

      {selected || !src || !parsed ? (
        <NodeToolbar>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <label htmlFor="video-url" className="text-[12px] font-medium text-soft">
              Link
            </label>
            <Input
              {...inputHandlers}
              id="video-url"
              value={urlDraft !== "" ? urlDraft : src}
              onChange={(e) => setUrlDraft(e.target.value)}
              onBlur={() => urlDraft.trim() && updateAttributes({ src: urlDraft.trim() })}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (urlDraft.trim()) updateAttributes({ src: urlDraft.trim() });
                }
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              className="h-8 min-w-40 flex-1 text-[12.5px]"
            />
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={!urlDraft.trim()}
              onClick={() => urlDraft.trim() && updateAttributes({ src: urlDraft.trim() })}
            >
              Embed
            </Button>
          </div>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-body transition-colors hover:bg-badge">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
            {uploading ? "Uploading…" : "Upload file"}
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              className="sr-only"
              onChange={(e) => upload(e.target.files)}
            />
          </label>
          {src ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete video"
              className="h-8 w-8 text-red-500 hover:text-red-600"
              onClick={deleteNode}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </NodeToolbar>
      ) : null}
    </NodeViewWrapper>
  );
}

// ————————————————————————————————————————————————
// caseCta — call-to-action button

function CaseCtaView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const label: string = (node.attrs.label as string) || "";
  const href: string = (node.attrs.href as string) || "";
  const variant: string = (node.attrs.variant as string) === "outline" ? "outline" : "solid";

  return (
    <NodeViewWrapper className={cn("relative py-1", selected && "node-selected")}>
      <div className="flex justify-center">
        <a
          href={href || undefined}
          onClick={(e) => e.preventDefault()}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors",
            variant === "solid"
              ? "bg-brand text-white hover:bg-brand-deep"
              : "border border-line bg-white text-ink hover:border-brand hover:text-brand",
          )}
        >
          {label || "Button"}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {selected ? (
        <NodeToolbar>
          <div className="flex min-w-36 flex-1 items-center gap-1.5">
            <label htmlFor="cta-label" className="text-[12px] font-medium text-soft">Label</label>
            <Input
              {...inputHandlers}
              id="cta-label"
              value={label}
              onChange={(e) => updateAttributes({ label: e.target.value })}
              placeholder="View the live site"
              className="h-8 flex-1 text-[12.5px]"
            />
          </div>
          <div className="flex min-w-40 flex-1 items-center gap-1.5">
            <label htmlFor="cta-href" className="text-[12px] font-medium text-soft">Link</label>
            <Input
              {...inputHandlers}
              id="cta-href"
              value={href}
              onChange={(e) => updateAttributes({ href: e.target.value })}
              placeholder="https://… or /work/…"
              className="h-8 flex-1 text-[12.5px]"
            />
          </div>
          <div className="flex items-center overflow-hidden rounded-lg border border-line">
            <button
              type="button"
              onClick={() => updateAttributes({ variant: "solid" })}
              className={cn(
                "h-8 px-3 text-[12.5px] font-medium transition-colors",
                variant === "solid" ? "bg-brand text-white" : "bg-white text-body hover:bg-badge",
              )}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ variant: "outline" })}
              className={cn(
                "h-8 px-3 text-[12.5px] font-medium transition-colors",
                variant === "outline" ? "bg-brand text-white" : "bg-white text-body hover:bg-badge",
              )}
            >
              Outline
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete button"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            onClick={deleteNode}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </NodeToolbar>
      ) : (
        <p className="mt-1 flex items-center justify-center gap-1 text-center text-[11px] text-soft" contentEditable={false}>
          <MousePointerClick className="h-3 w-3" aria-hidden="true" />
          Click the button to edit its label, link and style
        </p>
      )}
    </NodeViewWrapper>
  );
}
