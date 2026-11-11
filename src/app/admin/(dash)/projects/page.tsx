"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Star,
  StarOff,
  LayoutGrid,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { api } from "@/lib/admin/client";
import type { CaseStudyBlock } from "@/lib/blocks";

/**
 * Projects manager — the full CRUD for work projects: create, edit,
 * reorder, feature, delete. Every change is snapshotted automatically
 * (restorable from Settings).
 */

interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  role: string;
  category: string;
  cover: string;
  period: string;
  start: string;
  end: string | null;
  services: string[];
  url: string | null;
  featured: boolean;
  order: number;
  homeTile: "square" | "landscape";
  content: CaseStudyBlock[];
  contentDoc: string;
}

interface ProjectForm {
  title: string;
  slug: string;
  shortDescription: string;
  role: string;
  category: string;
  cover: string;
  period: string;
  start: string;
  end: string;
  services: string;
  url: string;
  featured: boolean;
  homeTile: "square" | "landscape";
}

const EMPTY_FORM: ProjectForm = {
  title: "",
  slug: "",
  shortDescription: "",
  role: "",
  category: "",
  cover: "",
  period: "",
  start: "2025-01",
  end: "",
  services: "",
  url: "",
  featured: false,
  homeTile: "square",
};

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // editor dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = creating
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // delete state
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const data = await api<{ items: ProjectItem[] }>("/api/admin/projects");
      setItems(data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setEditorOpen(true);
  }

  function openEdit(project: ProjectItem) {
    setEditingId(project.id);
    setSlugTouched(true);
    setForm({
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription,
      role: project.role,
      category: project.category,
      cover: project.cover,
      period: project.period,
      start: project.start,
      end: project.end ?? "",
      services: project.services.join(", "),
      url: project.url ?? "",
      featured: project.featured,
      homeTile: project.homeTile,
    });
    setEditorOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("Give the project a title first.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        shortDescription: form.shortDescription.trim(),
        role: form.role.trim(),
        category: form.category.trim(),
        cover: form.cover.trim(),
        period: form.period.trim(),
        start: form.start,
        end: form.end ? form.end : null,
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        url: form.url.trim() || null,
        featured: form.featured,
        homeTile: form.homeTile,
      };
      if (editingId) {
        await api(`/api/admin/projects/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success(`Project “${payload.title}” updated.`);
      } else {
        await api("/api/admin/projects", { method: "POST", body: JSON.stringify(payload) });
        toast.success(`Project “${payload.title}” added.`);
      }
      setEditorOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(project: ProjectItem) {
    setDeleting(true);
    try {
      await api(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      toast.success(`Project “${project.title}” deleted. (Restorable from Settings → History.)`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setItems(next);
    setBusy(items[index].id);
    try {
      await api("/api/admin/projects/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: next.map((p) => p.id) }),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function toggleFeatured(project: ProjectItem) {
    setBusy(project.id);
    try {
      await api(`/api/admin/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({ featured: !project.featured }),
      });
      setItems((prev) => prev.map((p) => (p.id === project.id ? { ...p, featured: !p.featured } : p)));
      toast.success(!project.featured ? `“${project.title}” featured.` : `“${project.title}” unfeatured.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  const effectiveSlug = useMemo(
    () => (slugTouched && form.slug ? slugify(form.slug) : slugify(form.title)),
    [form.slug, form.title, slugTouched],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-body">
            The cards on your Home gallery and Work page — reorder, edit, feature or delete.
            Every project also has its own case study page you can write like a blog.
          </p>
        </div>
        <Button onClick={openCreate} className="h-10 gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Project
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-soft" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading projects…</span>
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-soft">
            <LayoutGrid className="h-7 w-7" aria-hidden="true" />
            No projects yet — add your first one.
            <Button onClick={openCreate} variant="outline" className="mt-1 h-9 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {items.map((project, index) => (
            <li key={project.id}>
              <Card className="min-w-0 rounded-2xl transition-shadow hover:shadow-[0_14px_35px_-26px_rgba(17,24,39,0.5)]">
                <CardContent className="flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap">
                  {/* cover */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-badge">
                    {project.cover ? (
                      <Image src={project.cover} alt="" fill sizes="64px" className="object-cover" unoptimized />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-soft">
                        <LayoutGrid className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </div>

                  {/* info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink">{project.title}</p>
                      {project.featured ? (
                        <Badge className="gap-1 border-brand bg-brand/10 text-brand">
                          <Star className="h-3 w-3" aria-hidden="true" /> Featured
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="gap-1 font-normal text-body">
                        {project.homeTile === "landscape" ? (
                          <RectangleHorizontal className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Square className="h-3 w-3" aria-hidden="true" />
                        )}
                        {project.homeTile} tile
                      </Badge>
                      {project.contentDoc || (project.content && project.content.length > 0) ? (
                        <Badge className="gap-1 border-brand bg-brand/10 text-brand">
                          <FileText className="h-3 w-3" aria-hidden="true" /> Case study
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-body">{project.category || "No category"}</p>
                    <p className="text-xs text-soft">{project.period || "No period set"}</p>
                  </div>

                  {/* controls */}
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="mr-1 flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${project.title} up`}
                        className="h-7 w-7"
                        disabled={index === 0 || busy === project.id}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${project.title} down`}
                        className="h-7 w-7"
                        disabled={index === items.length - 1 || busy === project.id}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={project.featured ? `Unfeature ${project.title}` : `Feature ${project.title}`}
                      className="h-10 w-10 text-brand hover:text-brand-deep"
                      disabled={busy === project.id}
                      onClick={() => toggleFeatured(project)}
                    >
                      {project.featured ? (
                        <StarOff className="h-4.5 w-4.5" aria-hidden="true" />
                      ) : (
                        <Star className="h-4.5 w-4.5" aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Write ${project.title} case study page`}
                      className="h-10 w-10 text-brand hover:text-brand-deep"
                      onClick={() => router.push(`/admin/projects/${project.id}`)}
                    >
                      <FileText className="h-4.5 w-4.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${project.title}`}
                      className="h-10 w-10"
                      onClick={() => openEdit(project)}
                    >
                      <Pencil className="h-4.5 w-4.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${project.title}`}
                      className="h-10 w-10 text-red-500 hover:text-red-600"
                      onClick={() => setDeleteTarget(project)}
                    >
                      <Trash2 className="h-4.5 w-4.5" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* ——— create / edit dialog ——— */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg text-ink">
              {editingId ? "Edit Project" : "Add Project"}
            </DialogTitle>
            <DialogDescription>
              Changes go live on the site as soon as you save — and every save is snapshotted.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[62vh] pr-3">
            <div className="grid gap-4">
              {/* cover picker */}
              <div className="flex items-center gap-4 rounded-xl border border-line bg-badge/40 p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                  {form.cover ? (
                    <Image src={form.cover} alt="" fill sizes="80px" className="object-contain" unoptimized />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-soft">
                      <RectangleVertical className="h-6 w-6" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">Cover image</p>
                  <p className="mb-2 truncate text-xs text-soft">{form.cover || "No image chosen yet"}</p>
                  <MediaPicker
                    current={form.cover}
                    onChange={(url) => setForm((f) => ({ ...f, cover: url }))}
                    label={form.cover ? "Change cover" : "Choose cover"}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-title">Title *</Label>
                  <Input
                    id="p-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. AI Matterz"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-slug">Slug</Label>
                  <Input
                    id="p-slug"
                    value={slugTouched ? form.slug : effectiveSlug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: e.target.value }));
                    }}
                    placeholder="auto-generated-from-title"
                  />
                  <p className="text-[11px] text-soft">URL-friendly id · {effectiveSlug || "—"}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="p-short">One-line description (Work card)</Label>
                <Input
                  id="p-short"
                  value={form.shortDescription}
                  onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  placeholder="e.g. Founding designer — brand identity & digital product design"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-role">Role</Label>
                  <Input
                    id="p-role"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="e.g. Founding Designer"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-category">Category</Label>
                  <Input
                    id="p-category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Brand & Product Design"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-period">Period (display)</Label>
                  <Input
                    id="p-period"
                    value={form.period}
                    onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                    placeholder="Dec 2025 - Present"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-start">Started *</Label>
                  <Input
                    id="p-start"
                    type="month"
                    value={form.start}
                    onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-end">Ended</Label>
                  <Input
                    id="p-end"
                    type="month"
                    value={form.end}
                    onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                  />
                  <p className="text-[11px] text-soft">Leave empty for “Present”</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="p-services">Services (comma-separated)</Label>
                <Textarea
                  id="p-services"
                  value={form.services}
                  onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))}
                  placeholder="Brand Identity Design, UI/UX Design"
                  className="min-h-[64px]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-url">External link (optional)</Label>
                  <Input
                    id="p-url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://… (empty opens the in-page viewer)"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Home gallery tile</Label>
                  <Select
                    value={form.homeTile}
                    onValueChange={(value) => setForm((f) => ({ ...f, homeTile: value as ProjectForm["homeTile"] }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <div>
                  <Label htmlFor="p-featured" className="text-sm font-medium text-ink">
                    Featured
                  </Label>
                  <p className="text-xs text-soft">Featured projects lead the Work grid</p>
                </div>
                <Switch
                  id="p-featured"
                  checked={form.featured}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, featured: checked }))}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : editingId ? (
                "Save Changes"
              ) : (
                "Add Project"
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
              This removes the project from the site. Nothing is lost — the change is snapshotted and
              you can restore it any time from Settings → History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) remove(deleteTarget);
              }}
            >
              {deleting ? "Deleting…" : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
