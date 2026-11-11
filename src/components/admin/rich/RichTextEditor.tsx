"use client";

/**
 * Case study WYSIWYG editor — a Google Docs / MS Word style writing surface
 * for each project's /work/<slug> page.
 *
 *  - Ribbon toolbar: block styles, inline formatting, colors, alignment,
 *    lists, quotes, code, links, tables, undo/redo
 *  - Insert menu: images (upload/library), videos (YouTube/Vimeo/upload),
 *    CTA buttons, dividers, tables, code blocks
 *  - A white "page" canvas so the content looks exactly like the public page
 *  - Floating bubble toolbar on text selection
 *  - Status bar: words · characters · save state
 *
 * Content is stored as the editor's JSON document (Project.contentDoc) and
 * rendered by components/case-study/RichDocRenderer — the exact same
 * stylesheet drives both surfaces.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import {
  Bold, Italic, Underline, Strikethrough, Code, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Minus, Link2, Link2Off, Highlighter, Palette, ArrowLeft, ArrowUpRight,
  Check, Loader2, Image as ImageIcon, Video as VideoIcon, MousePointerClick, Table as TableIcon,
  Code2, Pilcrow, Heading2, ChevronDown, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "@/lib/admin/client";
import { CaseImage, CaseVideo, CaseCta } from "@/components/admin/rich/nodes";
import type { RichDoc } from "@/lib/rich";

// ————————————————————————————————————————————————
// Palettes

const TEXT_COLORS = [
  { label: "Ink", value: "#111827" },
  { label: "Gray", value: "#6b7280" },
  { label: "Purple", value: "#8750f6" },
  { label: "Deep violet", value: "#170146" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#059669" },
  { label: "Teal", value: "#0f766e" },
  { label: "Pink", value: "#db2777" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Mint", value: "#bbf7d0" },
  { label: "Lilac", value: "#e9d5ff" },
  { label: "Rose", value: "#fbcfe8" },
  { label: "Peach", value: "#fed7aa" },
  { label: "Silver", value: "#e5e7eb" },
];

// ————————————————————————————————————————————————
// Small UI helpers

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 border-line pr-1.5 [border-right-width:1px] last:border-r-0 last:pr-0">
      {children}
    </div>
  );
}

function ToolButton({
  onClick, active, disabled, label, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        active ? "bg-brand/12 text-brand" : "text-body hover:bg-badge hover:text-ink",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      {children}
    </button>
  );
}

function Swatches({
  colors, onPick, onReset, kind,
}: {
  colors: Array<{ label: string; value: string }>;
  onPick: (color: string) => void;
  onReset?: () => void;
  kind: "text color" | "highlight";
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {colors.map((color) => (
        <button
          key={color.value}
          type="button"
          title={color.label}
          aria-label={`${color.label} ${kind}`}
          onClick={() => onPick(color.value)}
          className="h-8 w-8 rounded-lg border border-black/10 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          style={{ backgroundColor: color.value }}
        />
      ))}
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="col-span-full mt-1 h-8 rounded-lg text-[12.5px] font-medium text-body transition-colors hover:bg-badge hover:text-ink"
        >
          Reset to default
        </button>
      ) : null}
    </div>
  );
}

// ————————————————————————————————————————————————
// The editor

interface RichTextEditorProps {
  projectId: string;
  title: string;
  slug: string;
  initialDoc: RichDoc;
}

export function RichTextEditor({ projectId, title, slug, initialDoc }: RichTextEditorProps) {
  const [doc, setDoc] = useState(() => JSON.stringify(initialDoc));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialDoc));
  const [saving, setSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: null, target: null },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: false, lastColumnResizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Section heading…"
            : node.type.name === "codeBlock"
              ? "Write code…"
              : "Write your case study — this page is exactly how it will look live…",
      }),
      CharacterCount,
      CaseImage,
      CaseVideo,
      CaseCta,
    ],
    content: initialDoc,
    onUpdate: ({ editor }) => {
      setDoc(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "rich-surface",
        spellcheck: "true",
      },
    },
  });

  const st = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      const counts = editor.storage.characterCount as { words?: () => number; characters?: () => number } | undefined;
      const linkAttrs = editor.getAttributes("link") as { href?: unknown };
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        code: editor.isActive("code"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        blockquote: editor.isActive("blockquote"),
        codeBlock: editor.isActive("codeBlock"),
        inTable: editor.isActive("table"),
        headerRow: editor.isActive("tableHeader"),
        heading: editor.isActive("heading", { level: 2 })
          ? 2
          : editor.isActive("heading", { level: 3 })
            ? 3
            : editor.isActive("heading", { level: 4 })
              ? 4
              : 0,
        align: editor.isActive({ textAlign: "center" })
          ? "center"
          : editor.isActive({ textAlign: "right" })
            ? "right"
            : "left",
        linkActive: editor.isActive("link"),
        linkHref: typeof linkAttrs.href === "string" ? linkAttrs.href : "",
        words: counts?.words?.() ?? 0,
        characters: counts?.characters?.() ?? 0,
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      };
    },
  });

  const dirty = doc !== baseline;

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ——— helpers over the editor ———

  const chain = () => editor?.chain().focus();

  function setBlockType(value: string) {
    if (!editor) return;
    if (value === "p") editor.chain().focus().setParagraph().run();
    else {
      // option values are "h2" | "h3" | "h4" — strip the leading "h"
      const level = Number(value.slice(1)) as 2 | 3 | 4;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  function applyLink() {
    const url = linkDraft.trim();
    if (!url || !editor) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkOpen(false);
  }

  function removeLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  async function save() {
    if (!editor || saving) return;
    setSaving(true);
    try {
      const payload = JSON.stringify(editor.getJSON());
      await api(`/api/admin/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ contentDoc: payload }),
      });
      setBaseline(payload);
      setDoc(payload);
      toast.success(`Case study saved — live at /work/${slug}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const blockValue = st?.heading ? `h${st.heading}` : "p";

  return (
    <div className="flex flex-col gap-5">
      {/* ——— header ——— */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm text-body transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Projects
          </Link>
          <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">
            {title} — Case Study
          </h1>
          <p className="mt-1 text-sm text-body">
            Write the {"/work/" + slug} page like a document — format text, drop in images, videos,
            buttons and tables. What you see here is exactly what goes live.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" className="h-10 gap-2" asChild>
            <a href={`/work/${slug}`} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> View live
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

      {/* ——— ribbon toolbar ——— */}
      <div className="sticky top-2 z-20 rounded-xl border border-line bg-white/95 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarGroup>
            <ToolButton label="Undo (Ctrl+Z)" disabled={!st?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!st?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
          </ToolbarGroup>

          {/* block style */}
          <ToolbarGroup>
            <div className="flex items-center">
              <div className="grid h-9 w-9 place-items-center text-body" aria-hidden="true">
                {blockValue === "p" ? <Pilcrow className="h-4 w-4" /> : <Heading2 className="h-4 w-4" />}
              </div>
              <select
                aria-label="Paragraph style"
                value={blockValue}
                onChange={(e) => setBlockType(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="h-9 cursor-pointer rounded-lg border-0 bg-transparent pr-1.5 text-[13px] font-medium text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="p">Normal text</option>
                <option value="h2">Heading · big</option>
                <option value="h3">Heading · medium</option>
                <option value="h4">Heading · small</option>
              </select>
            </div>
          </ToolbarGroup>

          {/* inline formatting */}
          <ToolbarGroup>
            <ToolButton label="Bold (Ctrl+B)" active={st?.bold} onClick={() => chain()?.toggleBold().run()}>
              <Bold className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Italic (Ctrl+I)" active={st?.italic} onClick={() => chain()?.toggleItalic().run()}>
              <Italic className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Underline (Ctrl+U)" active={st?.underline} onClick={() => chain()?.toggleUnderline().run()}>
              <Underline className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Strikethrough" active={st?.strike} onClick={() => chain()?.toggleStrike().run()}>
              <Strikethrough className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Inline code" active={st?.code} onClick={() => chain()?.toggleCode().run()}>
              <Code className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
          </ToolbarGroup>

          {/* colors */}
          <ToolbarGroup>
            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Text color"
                  aria-label="Text color"
                  className={cn(
                    "flex h-9 items-center gap-1 rounded-lg px-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                    st?.heading || st?.bold ? "text-brand" : "text-body",
                  )}
                >
                  <Palette className="h-4 w-4" aria-hidden="true" />
                  <span className="h-3.5 w-3.5 rounded-full border border-black/15 bg-[#111827]" aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-56 rounded-xl p-3">
                <p className="mb-2.5 text-[12.5px] font-semibold text-ink">Text color</p>
                <Swatches
                  colors={TEXT_COLORS}
                  kind="text color"
                  onPick={(color) => {
                    chain()?.setColor(color).run();
                    setColorOpen(false);
                  }}
                  onReset={() => {
                    chain()?.unsetColor().run();
                    setColorOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Popover open={highlightOpen} onOpenChange={setHighlightOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Highlight"
                  aria-label="Highlight text"
                  className="grid h-9 w-9 place-items-center rounded-lg text-body transition-colors hover:bg-badge hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <Highlighter className="h-4 w-4" aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-56 rounded-xl p-3">
                <p className="mb-2.5 text-[12.5px] font-semibold text-ink">Highlight</p>
                <Swatches
                  colors={HIGHLIGHT_COLORS}
                  kind="highlight"
                  onPick={(color) => {
                    chain()?.setHighlight({ color }).run();
                    setHighlightOpen(false);
                  }}
                  onReset={() => {
                    chain()?.unsetHighlight().run();
                    setHighlightOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </ToolbarGroup>

          {/* alignment */}
          <ToolbarGroup>
            <ToolButton label="Align left" active={st?.align === "left"} onClick={() => chain()?.setTextAlign("left").run()}>
              <AlignLeft className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Align center" active={st?.align === "center"} onClick={() => chain()?.setTextAlign("center").run()}>
              <AlignCenter className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Align right" active={st?.align === "right"} onClick={() => chain()?.setTextAlign("right").run()}>
              <AlignRight className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
          </ToolbarGroup>

          {/* lists & blocks */}
          <ToolbarGroup>
            <ToolButton label="Bullet list" active={st?.bulletList} onClick={() => chain()?.toggleBulletList().run()}>
              <List className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Numbered list" active={st?.orderedList} onClick={() => chain()?.toggleOrderedList().run()}>
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Quote block" active={st?.blockquote} onClick={() => chain()?.toggleBlockquote().run()}>
              <Quote className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Code block" active={st?.codeBlock} onClick={() => chain()?.toggleCodeBlock().run()}>
              <Code2 className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Divider" onClick={() => chain()?.setHorizontalRule().run()}>
              <Minus className="h-4 w-4" aria-hidden="true" />
            </ToolButton>
          </ToolbarGroup>

          {/* link */}
          <ToolbarGroup>
            <Popover
              open={linkOpen}
              onOpenChange={(open) => {
                setLinkOpen(open);
                if (open) setLinkDraft(st?.linkHref ?? "");
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Link (select text first)"
                  aria-label="Add or edit link"
                  aria-pressed={st?.linkActive}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                    st?.linkActive ? "bg-brand/12 text-brand" : "text-body hover:bg-badge hover:text-ink",
                  )}
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-80 rounded-xl p-3">
                <p className="mb-2.5 text-[12.5px] font-semibold text-ink">
                  {st?.linkActive ? "Edit link" : "Add a link"}
                </p>
                <Input
                  autoFocus
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                  placeholder="https://… or /work/…"
                  className="h-9 text-[13px]"
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  {st?.linkActive ? (
                    <Button type="button" variant="outline" className="h-8 gap-1.5 text-[12.5px]" onClick={removeLink}>
                      <Link2Off className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                    </Button>
                  ) : (
                    <p className="text-[11.5px] text-soft">Tip: select the text first</p>
                  )}
                  <Button type="button" className="h-8 text-[12.5px]" disabled={!linkDraft.trim()} onClick={applyLink}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </ToolbarGroup>

          {/* insert */}
          <ToolbarGroup>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-body transition-colors hover:bg-badge hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  Insert
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-xl">
                <DropdownMenuLabel>Add to the page</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => chain()?.insertContent({ type: "caseImage", attrs: { src: "", alt: "", caption: "", width: "wide" } }).run()}>
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-ink">Image</span>
                    <span className="truncate text-xs text-soft">Upload or pick from your library</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => chain()?.insertContent({ type: "caseVideo", attrs: { src: "", caption: "" } }).run()}>
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <VideoIcon className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-ink">Video</span>
                    <span className="truncate text-xs text-soft">YouTube, Vimeo or uploaded file</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => chain()?.insertContent({ type: "caseCta", attrs: { label: "View the live project", href: "", variant: "solid" } }).run()}>
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <MousePointerClick className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-ink">Button</span>
                    <span className="truncate text-xs text-soft">A call-to-action link</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => chain()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <TableIcon className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-ink">Table</span>
                    <span className="truncate text-xs text-soft">3 × 3 with a header row</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => chain()?.setHorizontalRule().run()}>
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <Minus className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-ink">Divider</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 py-2.5" onClick={() => chain()?.setCodeBlock().run()}>
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <Code2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-ink">Code block</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ToolbarGroup>

          {/* table controls — contextual */}
          {st?.inTable ? (
            <ToolbarGroup>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
                      "bg-brand/12 text-brand hover:bg-brand/20",
                    )}
                  >
                    <TableIcon className="h-4 w-4" aria-hidden="true" />
                    Table
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 rounded-xl">
                  <DropdownMenuItem onClick={() => chain()?.addRowBefore().run()}>Add row above</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => chain()?.addRowAfter().run()}>Add row below</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => chain()?.addColumnBefore().run()}>Add column left</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => chain()?.addColumnAfter().run()}>Add column right</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => chain()?.toggleHeaderRow().run()}>
                    {st?.headerRow ? "Remove header row" : "Toggle header row"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => chain()?.deleteRow().run()}>Delete row</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => chain()?.deleteColumn().run()}>Delete column</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500 focus:text-red-600" onClick={() => chain()?.deleteTable().run()}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete table
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ToolbarGroup>
          ) : null}
        </div>
      </div>

      {/* ——— the page ——— */}
      <div className="rounded-2xl bg-[#efeff2] p-3 sm:p-6">
        <div className="mx-auto w-full max-w-[46.5rem] rounded-md bg-white shadow-[0_3px_16px_rgba(17,24,39,0.09)]">
          <EditorContent editor={editor} className="rich-edit px-6 py-10 sm:px-14 sm:py-14" />
        </div>
      </div>

      {/* ——— status bar ——— */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12.5px] text-soft">
        <p>
          {st ? `${st.words.toLocaleString()} word${st.words === 1 ? "" : "s"} · ${st.characters.toLocaleString()} characters` : "…"}
        </p>
        <p className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("h-2 w-2 rounded-full", dirty ? "bg-amber-500" : "bg-emerald-500")}
          />
          {dirty ? "Unsaved changes — remember to save" : "All changes saved"}
        </p>
      </div>

      {/* ——— floating selection toolbar ——— */}
      {editor ? (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top", offset: 8 }}
          className="flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lg"
        >
          <ToolButton label="Bold" active={st?.bold} onClick={() => chain()?.toggleBold().run()}>
            <Bold className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Italic" active={st?.italic} onClick={() => chain()?.toggleItalic().run()}>
            <Italic className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Underline" active={st?.underline} onClick={() => chain()?.toggleUnderline().run()}>
            <Underline className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Strikethrough" active={st?.strike} onClick={() => chain()?.toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Highlight" onClick={() => chain()?.toggleHighlight().run()}>
            <Highlighter className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Link"
            active={st?.linkActive}
            onClick={() => {
              setLinkDraft(st?.linkHref ?? "");
              if (st?.linkActive) {
                chain()?.extendMarkRange("link").unsetLink().run();
              } else {
                setLinkOpen(true);
              }
            }}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
        </BubbleMenu>
      ) : null}
    </div>
  );
}
