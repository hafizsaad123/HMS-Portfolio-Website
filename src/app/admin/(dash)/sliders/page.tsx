"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Columns3,
  Loader2,
  Plus,
  Square as SquareIcon,
  RectangleHorizontal,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Eye,
  Trash2,
  RefreshCcw,
  ImagePlus,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { api } from "@/lib/admin/client";

/**
 * Home Sliders — full control over the images that scroll through the
 * homepage columns:
 *   • ADD new slides (image + title + tile shape),
 *   • EDIT a slide (replace the image, flip square/wide, rename),
 *   • REORDER slides (moves them within the moving columns),
 *   • REMOVE a slide from the homepage (the Work page card is kept) or
 *     DELETE the project entirely (everywhere — restorable from History).
 */

interface SliderProject {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  cover: string;
  homeTile: "square" | "landscape";
  showOnHome: boolean;
  order: number;
}

const EMPTY_FORM = { title: "", shortDescription: "", cover: "", homeTile: "square" as "square" | "landscape" };

export default function AdminSlidersPage() {
  const [items, setItems] = useState<SliderProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SliderProject | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SliderProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const active = items.filter((p) => p.showOnHome);
  const hidden = items.filter((p) => !p.showOnHome);

  async function load() {
    try {
      const data = await api<{ items: SliderProject[] }>("/api/admin/projects");
      setItems(data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load the homepage images.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(project: SliderProject, data: Partial<SliderProject>, label: string) {
    setBusyId(project.id);
    try {
      await api(`/api/admin/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setItems((prev) => prev.map((p) => (p.id === project.id ? { ...p, ...data } : p)));
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  /** Move a slide within the homepage columns (keeps hidden projects at the end). */
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= active.length) return;
    const nextActive = [...active];
    const [moved] = nextActive.splice(index, 1);
    nextActive.splice(target, 0, moved);
    const nextIds = [...nextActive, ...hidden].map((p) => p.id);
    const movedItem = active[index];
    setBusyId(movedItem.id);
    setItems((prev) => {
      const orderMap = new Map(nextIds.map((id, i) => [id, i + 1]));
      return prev
        .map((p) => (orderMap.has(p.id) ? { ...p, order: orderMap.get(p.id)! } : p))
        .sort((a, b) => a.order - b.order);
    });
    try {
      await api("/api/admin/projects/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: nextIds }),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEdit(project: SliderProject) {
    setEditing(project);
    setForm({
      title: project.title,
      shortDescription: project.shortDescription ?? "",
      cover: project.cover,
      homeTile: project.homeTile,
    });
    setEditorOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("Give the slide a title (it doubles as the image alt text).");
      return;
    }
    if (!form.cover) {
      toast.error("Choose or upload an image for the slide.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/admin/projects/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: form.title.trim(),
            shortDescription: form.shortDescription.trim(),
            cover: form.cover,
            homeTile: form.homeTile,
          }),
        });
        toast.success(`Slide “${form.title.trim()}” updated.`);
      } else {
        await api("/api/admin/projects", {
          method: "POST",
          body: JSON.stringify({
            title: form.title.trim(),
            shortDescription: form.shortDescription.trim(),
            cover: form.cover,
            homeTile: form.homeTile,
            showOnHome: true,
          }),
        });
        toast.success(`Slide “${form.title.trim()}” added to the homepage.`);
      }
      setEditorOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/admin/projects/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`“${deleteTarget.title}” deleted everywhere. (Restorable from Settings → History.)`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Home Sliders</h1>
          <p className="mt-1 text-sm text-body">
            Add, edit, reorder and remove the images scrolling through the homepage columns.
          </p>
        </div>
        <Button onClick={openAdd} className="h-10 gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Slide
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-2 p-5">
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-body">
            <Columns3 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              The homepage shows four continuously moving columns built from these images. Every change
              is saved instantly and snapshotted (restorable from Settings).
            </span>
          </p>
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-body">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-ink">Remove from homepage</strong> takes the image
              off the sliders but keeps the project on the Work page.{" "}
              <strong className="font-semibold text-ink">Delete</strong> removes it everywhere
              (restorable from Settings → History).
            </span>
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-soft" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading homepage images…</span>
        </div>
      ) : (
        <>
          {active.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-soft">
                <ImagePlus className="h-7 w-7" aria-hidden="true" />
                No images on the homepage yet — add your first slide.
                <Button onClick={openAdd} variant="outline" className="mt-1 h-9 gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add Slide
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((project, index) => (
                <Card key={project.id} className="rounded-2xl">
                  <CardContent className="flex flex-col gap-4 p-4">
                    {/* tile preview — mirrors the homepage tile ratio */}
                    <div
                      className={`relative w-full overflow-hidden rounded-xl border border-line bg-tile ${
                        project.homeTile === "landscape" ? "aspect-[2/1]" : "aspect-square"
                      }`}
                    >
                      {project.cover ? (
                        <Image
                          src={project.cover}
                          alt={`${project.title} homepage tile`}
                          fill
                          sizes="(min-width: 1280px) 26vw, (min-width: 640px) 42vw, 88vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-xs text-soft">
                          No image set
                        </span>
                      )}
                      {busyId === project.id ? (
                        <span className="absolute inset-0 grid place-items-center bg-white/70">
                          <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" />
                        </span>
                      ) : null}
                      <span className="absolute left-2 top-2">
                        <Badge variant="secondary" className="bg-white/90 text-[11px] text-ink shadow-sm">
                          #{index + 1}
                        </Badge>
                      </span>
                    </div>

                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{project.title}</p>
                        {project.category ? (
                          <p className="truncate text-xs text-soft">{project.category}</p>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit details of ${project.title}`}
                        className="h-8 w-8 shrink-0"
                        disabled={busyId === project.id}
                        onClick={() => openEdit(project)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <MediaPicker
                        current={project.cover}
                        label="Replace Image"
                        onChange={(url) => patch(project, { cover: url }, `Image replaced for “${project.title}”.`)}
                      />

                      {/* tile shape — mirrors the homepage tile ratio toggle */}
                      <div className="flex items-center gap-1 rounded-lg border border-line p-1" role="group" aria-label={`Tile shape for ${project.title}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-pressed={project.homeTile === "square"}
                          title="Square tile"
                          disabled={busyId === project.id}
                          onClick={() =>
                            project.homeTile !== "square" &&
                            patch(project, { homeTile: "square" }, `“${project.title}” is now a square tile.`)
                          }
                          className={`h-8 gap-1.5 px-2.5 text-xs ${
                            project.homeTile === "square" ? "bg-brand text-white hover:bg-brand hover:text-white" : "text-body"
                          }`}
                        >
                          <SquareIcon className="h-3.5 w-3.5" aria-hidden="true" /> Square
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-pressed={project.homeTile === "landscape"}
                          title="Landscape (2:1) tile"
                          disabled={busyId === project.id}
                          onClick={() =>
                            project.homeTile !== "landscape" &&
                            patch(project, { homeTile: "landscape" }, `“${project.title}” is now a landscape tile.`)
                          }
                          className={`h-8 gap-1.5 px-2.5 text-xs ${
                            project.homeTile === "landscape" ? "bg-brand text-white hover:bg-brand hover:text-white" : "text-body"
                          }`}
                        >
                          <RectangleHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Wide
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Move ${project.title} up`}
                          title="Move up in the columns"
                          className="h-8 w-8"
                          disabled={index === 0 || busyId === project.id}
                          onClick={() => move(index, -1)}
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Move ${project.title} down`}
                          title="Move down in the columns"
                          className="h-8 w-8"
                          disabled={index === active.length - 1 || busyId === project.id}
                          onClick={() => move(index, 1)}
                        >
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${project.title} from the homepage`}
                          title="Take it off the homepage sliders (Work page keeps it)"
                          className="h-8 gap-1.5 px-2.5 text-xs text-body"
                          disabled={busyId === project.id}
                          onClick={() =>
                            patch(
                              project,
                              { showOnHome: false },
                              `“${project.title}” removed from the homepage (still on the Work page).`,
                            )
                          }
                        >
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Remove from Home
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${project.title} permanently`}
                          title="Delete everywhere (restorable)"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          disabled={busyId === project.id}
                          onClick={() => setDeleteTarget(project)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {hidden.length > 0 ? (
            <section aria-labelledby="hidden-heading" className="flex flex-col gap-3">
              <h2 id="hidden-heading" className="text-sm font-semibold tracking-wide text-soft uppercase">
                Not on the homepage ({hidden.length})
              </h2>
              <ul className="grid gap-3">
                {hidden.map((project) => (
                  <li key={project.id}>
                    <Card className="rounded-2xl">
                      <CardContent className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-tile">
                          {project.cover ? (
                            <Image src={project.cover} alt="" fill sizes="44px" className="object-cover" unoptimized />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{project.title}</p>
                          <p className="truncate text-xs text-soft">On the Work page only</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 px-2.5 text-xs"
                          disabled={busyId === project.id}
                          onClick={() =>
                            patch(project, { showOnHome: true }, `“${project.title}” is back on the homepage.`)
                          }
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Add to homepage
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${project.title} permanently`}
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          disabled={busyId === project.id}
                          onClick={() => setDeleteTarget(project)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-soft">
        <RefreshCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Changes go live instantly — open the homepage to watch the new images scroll.
      </p>

      {/* ——— add / edit slide dialog ——— */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg text-ink">
              {editing ? "Edit Slide" : "Add Slide"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the image, title or tile shape — live as soon as you save."
                : "New slides start scrolling on the homepage right away. They also appear as a Work page card you can flesh out later on the Projects page."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* image picker */}
            <div className="flex items-center gap-4 rounded-xl border border-line bg-badge/40 p-3">
              <div
                className={`relative shrink-0 overflow-hidden rounded-xl border border-line bg-white ${
                  form.homeTile === "landscape" ? "h-14 w-28" : "h-20 w-20"
                }`}
              >
                {form.cover ? (
                  <Image src={form.cover} alt="" fill sizes="112px" className="object-cover" unoptimized />
                ) : (
                  <span className="grid h-full w-full place-items-center text-soft">
                    <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">Slide image *</p>
                <p className="mb-2 truncate text-xs text-soft">{form.cover || "No image chosen yet"}</p>
                <MediaPicker
                  current={form.cover}
                  onChange={(url) => setForm((f) => ({ ...f, cover: url }))}
                  label={form.cover ? "Change image" : "Choose image"}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="s-title">Title *</Label>
              <Input
                id="s-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Brand Identity — Count3"
              />
              <p className="text-xs text-soft">Used as the image alt text and the Work card title.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="s-desc">Short description</Label>
              <Textarea
                id="s-desc"
                value={form.shortDescription}
                onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                placeholder="Optional one-liner shown on the Work page card."
                className="min-h-[64px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tile shape</Label>
              <div className="flex items-center gap-1 rounded-lg border border-line p-1" role="group" aria-label="Tile shape">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={form.homeTile === "square"}
                  onClick={() => setForm((f) => ({ ...f, homeTile: "square" }))}
                  className={`h-8 flex-1 gap-1.5 px-2.5 text-xs ${
                    form.homeTile === "square" ? "bg-brand text-white hover:bg-brand hover:text-white" : "text-body"
                  }`}
                >
                  <SquareIcon className="h-3.5 w-3.5" aria-hidden="true" /> Square
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={form.homeTile === "landscape"}
                  onClick={() => setForm((f) => ({ ...f, homeTile: "landscape" }))}
                  className={`h-8 flex-1 gap-1.5 px-2.5 text-xs ${
                    form.homeTile === "landscape" ? "bg-brand text-white hover:bg-brand hover:text-white" : "text-body"
                  }`}
                >
                  <RectangleHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Wide (2:1)
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : editing ? (
                "Save Changes"
              ) : (
                "Add Slide"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ——— delete confirm ——— */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the homepage sliders AND the Work page. The change is snapshotted —
              restore any time from Settings → History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
            >
              {deleting ? "Deleting…" : "Delete Everywhere"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
