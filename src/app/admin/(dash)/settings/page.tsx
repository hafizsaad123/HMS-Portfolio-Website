"use client";

import { useEffect, useRef, useState } from "react";
import {
  KeyRound,
  Upload,
  History,
  RotateCcw,
  Loader2,
  ShieldCheck,
  HardDriveDownload,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, timeAgo } from "@/lib/admin/client";
import { friendlyUploadError } from "@/lib/admin/upload";

/**
 * Settings — account credentials, backups and the full change history.
 *
 * No-data-loss guarantees live here:
 *  - every change creates a snapshot (history below)
 *  - JSON backups can be downloaded anytime
 *  - restoring anything takes an automatic safety snapshot first
 */

interface Revision {
  id: number;
  label: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importTarget, setImportTarget] = useState<File | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  // time-dependent strings render only after mount (avoids SSR mismatch)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const history = await api<{ items: Revision[] }>("/api/admin/revisions");
        setRevisions(history.items);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load settings.");
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  async function saveAccount() {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setSavingAccount(true);
    try {
      await api("/api/admin/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function restore(revision: Revision) {
    setRestoring(true);
    try {
      await api(`/api/admin/revisions/${revision.id}/restore`, { method: "POST" });
      toast.success("Content restored — the site is updated.");
      setRestoreTarget(null);
      const history = await api<{ items: Revision[] }>("/api/admin/revisions");
      setRevisions(history.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setRestoring(false);
    }
  }

  async function importBackup() {
    if (!importTarget) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", importTarget);
      const result = await api<{ ok: boolean; files: number; projects: number }>(
        "/api/admin/backup/restore",
        { method: "POST", body: form }
      );
      toast.success(
        result.files > 0
          ? `Everything restored — content + ${result.files} uploaded file${result.files === 1 ? "" : "s"}.`
          : "Content restored from the backup file."
      );
      setImportTarget(null);
      const history = await api<{ items: Revision[] }>("/api/admin/revisions");
      setRevisions(history.items);
    } catch (e) {
      toast.error(friendlyUploadError(e, "Restore"));
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-body">
          Account, backups and the full change history — the no-data-loss control room.
        </p>
      </div>

      {/* account */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-ink">
            <KeyRound className="h-4 w-4 text-brand" aria-hidden="true" /> Admin password
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:max-w-lg">
          <div className="flex flex-col gap-2">
            <Label htmlFor="set-current">Current password *</Label>
            <Input
              id="set-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="set-new">New password *</Label>
            <Input
              id="set-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-10"
            />
          </div>
          <div>
            <Button onClick={saveAccount} disabled={savingAccount || !currentPassword || !newPassword} className="h-10 gap-2">
              {savingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* backups */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-ink">
            <HardDriveDownload className="h-4 w-4 text-brand" aria-hidden="true" /> Backups &amp; data
            safety
          </CardTitle>
          <p className="text-sm text-body">
            Your content lives in the Supabase database and your uploaded files (pictures, CV,
            videos) in Supabase Storage — a full backup packs{" "}
            <span className="font-medium text-ink">both</span> into one .zip you can keep anywhere.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
              <p className="text-sm font-medium text-ink">Download a full backup (.zip)</p>
              <p className="text-xs text-soft">
                Everything — every project, text and setting plus every uploaded picture, CV and
                video (pulled straight from Supabase Storage). Keep the .zip on your computer or
                cloud; grab a fresh one after big changes.
              </p>
              <Button asChild className="mt-1 h-10 w-max gap-2">
                <a href="/api/admin/backup">
                  <Archive className="h-4 w-4" aria-hidden="true" /> Download Full Backup
                </a>
              </Button>
              <a
                href="/api/admin/export"
                className="mt-1 w-max text-xs text-body underline underline-offset-2 hover:text-ink"
              >
                Content-only JSON (smaller, no files)
              </a>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
              <p className="text-sm font-medium text-ink">Restore from a backup file</p>
              <p className="text-xs text-soft">
                A full .zip restores all content <span className="font-medium">and</span> every
                uploaded file; a .json restores content only. A safety snapshot of the current state
                is taken first.
              </p>
              <input
                ref={importRef}
                type="file"
                accept=".zip,application/zip,.json,application/json"
                className="sr-only"
                onChange={(e) => setImportTarget(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                className="mt-1 h-10 w-max gap-2"
                onClick={() => importRef.current?.click()}
              >
                <Upload className="h-4 w-4" aria-hidden="true" /> Choose Backup File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* history */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-ink">
            <History className="h-4 w-4 text-brand" aria-hidden="true" /> Change history
          </CardTitle>
          <p className="text-sm text-body">
            Every save, upload, reorder and delete is snapshotted — the newest 50 are kept. Restoring
            never loses anything either: a safety snapshot is taken first.
          </p>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex h-32 items-center justify-center text-soft" role="status">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">Loading history…</span>
            </div>
          ) : revisions.length === 0 ? (
            <p className="py-8 text-center text-sm text-soft">No snapshots yet.</p>
          ) : (
            <ScrollArea className="max-h-96 pr-3">
              <ul className="grid gap-1.5">
                {revisions.map((revision) => (
                  <li
                    key={revision.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{revision.label}</p>
                      <p className="text-xs text-soft">
                        Snapshot #{revision.id} · {mounted ? new Date(revision.createdAt).toLocaleString() : ""} ·{" "}
                        {mounted ? timeAgo(revision.createdAt) : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 text-xs"
                      onClick={() => setRestoreTarget(revision)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-soft">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        Content lives in your Supabase database, media files in its Storage, and every change is
        snapshotted in the revision history (newest 50). Supabase keeps its own infrastructure
        backups on top — download a full .zip after big changes and your data is safe anywhere,
        forever.
      </p>

      {/* restore confirm */}
      <AlertDialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore “{restoreTarget?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The site will go back to this snapshot. Nothing is lost — a safety snapshot of the
              current state is taken first, so you can undo the restore too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={(e) => {
                e.preventDefault();
                if (restoreTarget) restore(restoreTarget);
              }}
            >
              {restoring ? "Restoring…" : "Restore Snapshot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* import confirm */}
      <AlertDialog open={importTarget !== null} onOpenChange={(open) => !open && setImportTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Import “{importTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores all content from the backup — and with a full .zip, every uploaded
              picture, CV and video too. A safety snapshot of the current state is taken
              automatically first, so nothing is lost either way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={importing}
              onClick={(e) => {
                e.preventDefault();
                importBackup();
              }}
            >
              {importing ? "Importing…" : "Import Backup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
