"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  BriefcaseBusiness,
} from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/admin/client";

/**
 * Experience manager — the About-page work-experience grid and the
 * sidebar's experience pills (company, role, period, geometric mark).
 */

interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  markId: string;
  url: string | null;
  order: number;
}

const MARKS = [
  { value: "ai-matterz", label: "AI Matterz mark" },
  { value: "uplynk-pk", label: "Uplynk.pk mark" },
  { value: "surplus-pakistan", label: "Surplus Pakistan mark" },
  { value: "novelops", label: "NovelOPS mark" },
  { value: "count3", label: "Count3 mark" },
  { value: "simulationsx", label: "SimulationsX mark" },
] as const;

const EMPTY_FORM = { company: "", role: "", period: "", markId: "novelops", url: "" };

export default function AdminExperiencePage() {
  const [items, setItems] = useState<ExperienceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ExperienceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const data = await api<{ items: ExperienceItem[] }>("/api/admin/experience");
      setItems(data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load experience.");
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
    setEditorOpen(true);
  }

  function openEdit(item: ExperienceItem) {
    setEditingId(item.id);
    setForm({ company: item.company, role: item.role, period: item.period, markId: item.markId, url: item.url ?? "" });
    setEditorOpen(true);
  }

  async function save() {
    if (!form.company.trim() || !form.role.trim() || !form.period.trim()) {
      toast.error("Company, role and period are all required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        company: form.company.trim(),
        role: form.role.trim(),
        period: form.period.trim(),
        url: form.url.trim() || null,
      };
      if (editingId) {
        await api(`/api/admin/experience/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success(`Experience at ${payload.company} updated.`);
      } else {
        await api("/api/admin/experience", { method: "POST", body: JSON.stringify(payload) });
        toast.success(`Experience at ${payload.company} added.`);
      }
      setEditorOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ExperienceItem) {
    setDeleting(true);
    try {
      await api(`/api/admin/experience/${item.id}`, { method: "DELETE" });
      toast.success(`Experience at ${item.company} deleted. (Restorable from Settings → History.)`);
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
      await api("/api/admin/experience/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: next.map((i) => i.id) }),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Experience</h1>
          <p className="mt-1 text-sm text-body">
            The About-page work-experience cards and the sidebar pills.
          </p>
        </div>
        <Button onClick={openCreate} className="h-10 gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Experience
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-soft" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading experience…</span>
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-soft">
            <BriefcaseBusiness className="h-7 w-7" aria-hidden="true" />
            No experience entries yet — add your first one.
            <Button onClick={openCreate} variant="outline" className="mt-1 h-9 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Experience
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <Card className="min-w-0 rounded-2xl transition-shadow hover:shadow-[0_14px_35px_-26px_rgba(17,24,39,0.5)]">
                <CardContent className="flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink">{item.company}</p>
                      <Badge variant="outline" className="font-normal text-body">
                        {item.markId}
                      </Badge>
                      {item.url ? (
                        <Badge variant="outline" className="max-w-[220px] truncate font-normal text-brand">
                          {item.url.replace(/^https?:\/\/(www\.)?/, "")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-body">{item.role}</p>
                    <p className="text-xs text-soft">{item.period}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <div className="mr-1 flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${item.company} up`}
                        className="h-7 w-7"
                        disabled={index === 0 || busy === item.id}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${item.company} down`}
                        className="h-7 w-7"
                        disabled={index === items.length - 1 || busy === item.id}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${item.company}`}
                      className="h-10 w-10"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4.5 w-4.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${item.company}`}
                      className="h-10 w-10 text-red-500 hover:text-red-600"
                      onClick={() => setDeleteTarget(item)}
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
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg text-ink">
              {editingId ? "Edit Experience" : "Add Experience"}
            </DialogTitle>
            <DialogDescription>Shown on the About page grid and the sidebar pills.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-company">Company *</Label>
              <Input
                id="e-company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="e.g. AI Matterz"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-role">Role *</Label>
              <Input
                id="e-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Founding Designer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-url">Company website</Label>
              <Input
                id="e-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com/"
              />
              <p className="text-xs text-soft">
                Optional — makes the company name a link on the About page and in the sidebar pill.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="e-period">Period *</Label>
                <Input
                  id="e-period"
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  placeholder="Dec 2025 - Present"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Company mark</Label>
                <Select value={form.markId} onValueChange={(value) => setForm((f) => ({ ...f, markId: value }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKS.map((mark) => (
                      <SelectItem key={mark.value} value={mark.value}>
                        {mark.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              ) : editingId ? (
                "Save Changes"
              ) : (
                "Add Experience"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ——— delete confirm ——— */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.company}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry from the About grid and the sidebar pills. The change is
              snapshotted — restore any time from Settings → History.
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
              {deleting ? "Deleting…" : "Delete Entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
