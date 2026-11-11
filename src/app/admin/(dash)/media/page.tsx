"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, Copy, Trash2, Images, Check, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { api, formatBytes, timeAgo } from "@/lib/admin/client";
import { friendlyUploadError, uploadMedia } from "@/lib/admin/upload";
import type { MediaItem } from "@/components/admin/MediaPicker";

/**
 * Media Library — every uploaded image. Uploads are stored inside the
 * database folder (db/uploads) and never hard-deleted from disk, so any
 * earlier state can always be fully recovered.
 */

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // time-dependent strings render only after mount (avoids SSR mismatch)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function load() {
    try {
      const data = await api<{ items: MediaItem[] }>("/api/admin/media");
      setItems(data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load the library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of list) {
        await uploadMedia(file);
      }
      toast.success(`${list.length === 1 ? "Image" : `${list.length} images`} uploaded.`);
      await load();
    } catch (e) {
      toast.error(friendlyUploadError(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function copyUrl(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(item.id);
      setTimeout(() => setCopied(null), 1500);
      toast.success("Image URL copied.");
    } catch {
      toast.error("Couldn't copy — select the URL manually.");
    }
  }

  async function remove(item: MediaItem) {
    setDeleting(true);
    try {
      await api(`/api/admin/media/${item.id}`, { method: "DELETE" });
      toast.success(`“${item.originalName}” removed from the library.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const totalSize = items.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Media Library</h1>
          <p className="mt-1 text-sm text-body">
            {items.length} {items.length === 1 ? "image" : "images"} · {formatBytes(totalSize)} stored ·
            files are kept on disk even after removal, so nothing is ever lost.
          </p>
        </div>
      </div>

      {/* upload dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex h-40 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed text-sm transition-colors ${
          dragOver ? "border-brand bg-brand/5 text-brand" : "border-line bg-white text-body"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-brand" aria-hidden="true" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-brand" aria-hidden="true" />
            <span>Drag &amp; drop images here, or</span>
            <Button variant="outline" className="h-10 gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Browse Files
            </Button>
            <p className="text-xs text-soft">PNG, JPG, WebP, GIF, AVIF or SVG · big photos are compressed automatically</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
          className="sr-only"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-soft" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading library…</span>
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-soft">
            <Images className="h-7 w-7" aria-hidden="true" />
            No images yet — upload your first one above.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="group min-w-0 overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/3] bg-badge">
                  {item.mime.startsWith("video/") ? (
                    <video src={item.url} controls preload="metadata" playsInline className="absolute inset-0 h-full w-full object-contain p-2" />
                  ) : (
                    <Image src={item.url} alt={item.alt ?? item.originalName} fill sizes="260px" className="object-contain p-2" unoptimized />
                  )}
                </div>
                <CardContent className="grid gap-1.5 p-3">
                  <p className="truncate text-[13px] font-medium text-ink" title={item.originalName}>
                    {item.mime.startsWith("video/") ? (
                      <VideoIcon className="mr-1.5 inline h-3.5 w-3.5 text-brand" aria-hidden="true" />
                    ) : null}
                    {item.originalName}
                  </p>
                  <p className="text-xs text-soft">
                    {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                    {formatBytes(item.size)} · {mounted ? timeAgo(item.createdAt) : ""}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 gap-1.5 text-xs"
                      onClick={() => copyUrl(item)}
                    >
                      {copied === item.id ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {copied === item.id ? "Copied" : "Copy URL"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Remove ${item.originalName}`}
                      className="h-8 w-8 shrink-0 p-0 text-red-500 hover:text-red-600"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{deleteTarget?.originalName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from the library. If it&apos;s currently used on the site, removal is
              blocked. The file itself stays safely on disk and any earlier snapshot can bring it back.
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
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
