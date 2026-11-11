"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Heading as HeadingIcon,
  AlignLeft,
  Image as ImageIcon,
  Video as VideoIcon,
  MousePointerClick,
  Quote as QuoteIcon,
  List as ListIcon,
  Minus,
  Upload,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { api } from "@/lib/admin/client";
import { uploadMedia, friendlyUploadError } from "@/lib/admin/upload";
import {
  BLOCK_TYPES,
  defaultBlock,
  makeBlockId,
  parseVideoUrl,
  type BlockType,
  type CaseStudyBlock,
} from "@/lib/blocks";

/**
 * Case study page editor — a blog-style block builder for /work/<slug>.
 * Headings, rich paragraphs, images, videos, buttons, quotes, lists and
 * dividers; reorder, duplicate, delete; save is snapshotted like every
 * other admin change.
 */

const BLOCK_ICONS: Record<BlockType, typeof HeadingIcon> = {
  heading: HeadingIcon,
  paragraph: AlignLeft,
  image: ImageIcon,
  video: VideoIcon,
  button: MousePointerClick,
  quote: QuoteIcon,
  list: ListIcon,
  divider: Minus,
};

const RICH_HINT = "Rich text: **bold** · *italic* · [link](https://…) · `code`";

interface CaseStudyEditorProps {
  projectId: string;
  title: string;
  slug: string;
  initialContent: CaseStudyBlock[];
}

export function CaseStudyEditor({ projectId, title, slug, initialContent }: CaseStudyEditorProps) {
  const [blocks, setBlocks] = useState<CaseStudyBlock[]>(initialContent);
  const [baseline, setBaseline] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const videoFileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingVideoFor, setUploadingVideoFor] = useState<string | null>(null);

  const dirty = JSON.stringify(blocks) !== JSON.stringify(baseline);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ——— block operations ———

  function addBlock(type: BlockType) {
    if (blocks.length >= 100) {
      toast.error("That's the block limit (100) — pages stay fast.");
      return;
    }
    setBlocks((prev) => [...prev, defaultBlock(type)]);
  }

  function updateBlock(id: string, patch: Partial<CaseStudyBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as CaseStudyBlock) : b)));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setBlocks(next);
  }

  function duplicateBlock(index: number) {
    if (blocks.length >= 100) {
      toast.error("That's the block limit (100).");
      return;
    }
    const clone = { ...blocks[index], id: makeBlockId() } as CaseStudyBlock;
    setBlocks((prev) => [...prev.slice(0, index + 1), clone, ...prev.slice(index + 1)]);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  // ——— video upload ———

  async function uploadVideo(index: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingVideoFor(blocks[index].id);
    try {
      const res = await uploadMedia(file); // straight to Supabase Storage
      updateBlock(blocks[index].id, { src: res.url } as Partial<CaseStudyBlock>);
      toast.success("Video uploaded.");
    } catch (e) {
      toast.error(friendlyUploadError(e, "Video upload"));
    } finally {
      setUploadingVideoFor(null);
      if (videoFileRef.current) videoFileRef.current.value = "";
    }
  }

  // ——— save ———

  async function save() {
    setSaving(true);
    try {
      await api(`/api/admin/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ content: blocks }),
      });
      setBaseline(blocks);
      toast.success(`Case study saved — live at /work/${slug}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ——— header ——— */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-1.5 text-sm text-body transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Projects
          </Link>
          <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">{title} — Case Study</h1>
          <p className="mt-1 text-sm text-body">
            Build the {"/work/" + slug} page like a blog — sections, images, videos, buttons.
            {blocks.length > 0 ? ` ${blocks.length} block${blocks.length === 1 ? "" : "s"}.` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" className="h-10 gap-2" asChild>
            <a href={`/work/${slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> View live
            </a>
          </Button>
          <Button onClick={save} disabled={saving || !dirty} className="h-10 gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> {dirty ? "Save Case Study" : "Saved"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ——— blocks ——— */}
      {blocks.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex h-52 flex-col items-center justify-center gap-3 text-sm text-soft">
            <AlignLeft className="h-7 w-7" aria-hidden="true" />
            The page starts empty — add your first block below.
            <span className="text-xs">A good case study opens with a Heading, then the story.</span>
          </CardContent>
        </Card>
      ) : (
        <ol className="grid gap-4">
          {blocks.map((block, index) => (
            <li key={block.id}>
              <BlockCard
                block={block}
                index={index}
                total={blocks.length}
                uploadingVideo={uploadingVideoFor === block.id}
                videoFileRef={videoFileRef}
                onUploadVideo={uploadVideo}
                onUpdate={(patch) => updateBlock(block.id, patch)}
                onMove={moveBlock}
                onDuplicate={duplicateBlock}
                onRemove={removeBlock}
              />
            </li>
          ))}
        </ol>
      )}

      {/* ——— add block ——— */}
      <div className="sticky bottom-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-11 w-full gap-2 rounded-2xl shadow-lg" aria-label="Add a block">
              <Plus className="h-4.5 w-4.5" aria-hidden="true" /> Add block
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-72 rounded-xl">
            <DropdownMenuLabel>Insert into the page</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {BLOCK_TYPES.map((type) => {
              const Icon = BLOCK_ICONS[type.type];
              return (
                <DropdownMenuItem key={type.type} onClick={() => addBlock(type.type)} className="gap-2.5 py-2.5">
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-ink">{type.label}</span>
                    <span className="truncate text-xs text-soft">{type.hint}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————
// One block card (type-specific fields + controls)

type BlockCardProps = {
  block: CaseStudyBlock;
  index: number;
  total: number;
  uploadingVideo: boolean;
  videoFileRef: React.RefObject<HTMLInputElement | null>;
  onUploadVideo: (index: number, files: FileList | null) => void;
  onUpdate: (patch: Partial<CaseStudyBlock>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
};

function BlockCard(props: BlockCardProps) {
  const { block, index, total } = props;
  const meta = BLOCK_TYPES.find((t) => t.type === block.type)!;
  const Icon = BLOCK_ICONS[block.type];

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-4 py-4">
        {/* header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                <span className="mr-1.5 text-soft">{index + 1}.</span>
                {meta.label}
              </p>
              <p className="truncate text-xs text-soft">{meta.hint}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost" size="icon" aria-label={`Move ${meta.label} block up`}
              className="h-9 w-9" disabled={index === 0}
              onClick={() => props.onMove(index, -1)}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost" size="icon" aria-label={`Move ${meta.label} block down`}
              className="h-9 w-9" disabled={index === total - 1}
              onClick={() => props.onMove(index, 1)}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost" size="icon" aria-label={`Duplicate ${meta.label} block`}
              className="h-9 w-9" onClick={() => props.onDuplicate(index)}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost" size="icon" aria-label={`Delete ${meta.label} block`}
              className="h-9 w-9 text-red-500 hover:text-red-600"
              onClick={() => props.onRemove(index)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* type-specific fields */}
        <BlockFields {...props} />
      </CardContent>
    </Card>
  );
}

function BlockFields({ block, onUpdate, uploadingVideo, videoFileRef, onUploadVideo, index }: BlockCardProps) {
  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`h-${block.id}`} className="sr-only">Heading text</Label>
            <Input
              id={`h-${block.id}`}
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Section heading, e.g. The Challenge"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="sr-only" htmlFor={`hl-${block.id}`}>Heading level</Label>
            <Select value={String(block.level)} onValueChange={(v) => onUpdate({ level: Number(v) as 2 | 3 | 4 })}>
              <SelectTrigger id={`hl-${block.id}`} className="h-10" aria-label="Heading size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Big (H2)</SelectItem>
                <SelectItem value="3">Medium (H3)</SelectItem>
                <SelectItem value="4">Small (H4)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "paragraph":
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`p-${block.id}`} className="sr-only">Paragraph</Label>
          <Textarea
            id={`p-${block.id}`}
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Write the story… **bold**, *italic*, [links](https://…) and `code` work."
            className="min-h-[120px] leading-relaxed"
          />
          <p className="text-[11px] text-soft">{RICH_HINT}</p>
        </div>
      );

    case "image":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-line bg-badge/40 p-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
              {block.src ? (
                <img src={block.src} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="grid h-full w-full place-items-center text-soft">
                  <ImageIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">Image</p>
              <p className="mb-2 truncate text-xs text-soft">{block.src || "No image chosen yet"}</p>
              <MediaPicker
                current={block.src}
                onChange={(url) => onUpdate({ src: url })}
                label={block.src ? "Change image" : "Choose image"}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`ia-${block.id}`}>Alt text (for accessibility)</Label>
              <Input id={`ia-${block.id}`} value={block.alt} onChange={(e) => onUpdate({ alt: e.target.value })} placeholder="Describe the image" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`ic-${block.id}`}>Caption (optional)</Label>
              <Input id={`ic-${block.id}`} value={block.caption} onChange={(e) => onUpdate({ caption: e.target.value })} placeholder="Shown under the image" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`iw-${block.id}`}>Width</Label>
            <Select value={block.width} onValueChange={(v) => onUpdate({ width: v as "wide" | "full" })}>
              <SelectTrigger id={`iw-${block.id}`} className="h-10 sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wide">Wide — text column</SelectItem>
                <SelectItem value="full">Full width — spans the page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "video":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`v-${block.id}`}>Video link (YouTube, Vimeo or direct MP4/WebM)</Label>
            <Input
              id={`v-${block.id}`}
              value={block.src}
              onChange={(e) => onUpdate({ src: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=… or upload below"
            />
            {block.src ? (
              <VideoStatus src={block.src} />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={videoFileRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              className="sr-only"
              onChange={(e) => onUploadVideo(index, e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              disabled={uploadingVideo}
              onClick={() => videoFileRef.current?.click()}
            >
              {uploadingVideo ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              {uploadingVideo ? "Uploading…" : "Or upload a video file"}
            </Button>
            <p className="text-[11px] text-soft">MP4 / WebM / MOV · up to 64 MB</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`vc-${block.id}`}>Caption (optional)</Label>
            <Input id={`vc-${block.id}`} value={block.caption} onChange={(e) => onUpdate({ caption: e.target.value })} placeholder="Shown under the video" />
          </div>
        </div>
      );

    case "button":
      return (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`bl-${block.id}`}>Button label</Label>
              <Input id={`bl-${block.id}`} value={block.label} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="e.g. View the live site" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`bu-${block.id}`}>Link</Label>
              <Input id={`bu-${block.id}`} value={block.url} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://… or /work/…" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`bv-${block.id}`}>Style</Label>
              <Select value={block.variant} onValueChange={(v) => onUpdate({ variant: v as "solid" | "outline" })}>
                <SelectTrigger id={`bv-${block.id}`} className="h-10 sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid (purple)</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 self-end pb-1">
              <span className="text-[11px] text-soft">Preview</span>
              <span
                className={`inline-flex h-11 items-center rounded-full px-6 text-sm font-medium ${
                  block.variant === "solid" ? "bg-brand text-white" : "border border-line bg-white text-ink"
                }`}
              >
                {block.label || "Button"}
              </span>
            </div>
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`qt-${block.id}`}>Quote</Label>
            <Textarea
              id={`qt-${block.id}`}
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="The line worth highlighting…"
              className="min-h-[80px]"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor={`qa-${block.id}`}>Attribution (optional)</Label>
            <Input id={`qa-${block.id}`} value={block.attribution} onChange={(e) => onUpdate({ attribution: e.target.value })} placeholder="Who said it" />
          </div>
        </div>
      );

    case "list":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 sm:w-48">
            <Label htmlFor={`ls-${block.id}`}>List style</Label>
            <Select value={block.style} onValueChange={(v) => onUpdate({ style: v as "bullet" | "number" })}>
              <SelectTrigger id={`ls-${block.id}`} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bullet">Bullets</SelectItem>
                <SelectItem value="number">Numbers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`li-${block.id}`}>Items — one per line</Label>
            <Textarea
              id={`li-${block.id}`}
              value={block.items.join("\n")}
              onChange={(e) => onUpdate({ items: e.target.value.split("\n").slice(0, 60) })}
              placeholder={"First point\nSecond point\n[A linked point](https://…)"}
              className="min-h-[110px]"
            />
            <p className="text-[11px] text-soft">{RICH_HINT} — works in every item.</p>
          </div>
        </div>
      );

    case "divider":
      return <hr className="border-line" />;

    default:
      return null;
  }
}

/** Small helper: is this video link understood? */
function VideoStatus({ src }: { src: string }) {
  const parsed = parseVideoUrl(src);
  if (parsed === null) {
    return (
      <p className="text-[12px] text-red-500">
        Not recognized — use a YouTube or Vimeo link, a direct .mp4/.webm URL, or upload a file.
      </p>
    );
  }
  const label =
    parsed.kind === "youtube" ? "YouTube video ✓" : parsed.kind === "vimeo" ? "Vimeo video ✓" : "Video file ✓";
  return <p className="text-[12px] text-brand">{label}</p>;
}
