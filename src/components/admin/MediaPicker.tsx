"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, ImageIcon, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api } from "@/lib/admin/client";
import { friendlyUploadError, uploadMedia } from "@/lib/admin/upload";

/**
 * Image picker — upload a new file or choose one already in the media
 * library (or type a bundled path like /images/profile.png).
 */

export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  originalName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
}

export function MediaPicker({
  current,
  onChange,
  label = "Choose image",
  children,
}: {
  current?: string | null;
  onChange: (url: string) => void;
  label?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadLibrary() {
    setLoading(true);
    try {
      const data = await api<{ items: MediaItem[] }>("/api/admin/media");
      // this picker is for images only — videos live in the case-study editor
      setItems(data.items.filter((i) => i.mime.startsWith("image/")));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load the media library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadLibrary();
  }, [open]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      let lastUrl: string | null = null;
      for (const file of Array.from(files)) {
        const res = await uploadMedia(file);
        lastUrl = res.url;
      }
      toast.success("Image uploaded.");
      await loadLibrary();
      if (lastUrl) {
        setSelected(lastUrl);
      }
    } catch (e) {
      toast.error(friendlyUploadError(e, "Image upload"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function confirm(url: string) {
    onChange(url);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" className="h-10 gap-2 text-sm">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg text-ink">{label}</DialogTitle>
          <DialogDescription>
            Upload a new image or pick one from your media library.
            {current ? " The current image stays until you save." : null}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="gap-1.5">
              <ImageIcon className="h-4 w-4" aria-hidden="true" /> Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5">
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-soft">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading library…</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-soft">
                <ImageIcon className="h-6 w-6" aria-hidden="true" />
                No images yet — switch to Upload to add one.
              </div>
            ) : (
              <ScrollArea className="h-64 pr-3">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => confirm(item.url)}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-xl border-2 bg-badge transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        selected === item.url ? "border-brand" : "border-transparent hover:border-brand-soft",
                      )}
                      title={item.originalName}
                    >
                      <Image src={item.url} alt={item.alt ?? item.originalName} fill sizes="140px" className="object-cover" unoptimized />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {item.originalName}
                      </span>
                      {current === item.url ? (
                        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" aria-hidden="true" />
                <Input
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="…or type a path like /images/profile.png"
                  className="h-10 pl-9 text-sm"
                />
              </div>
              <Button
                type="button"
                className="h-10"
                disabled={!customPath.trim()}
                onClick={() => confirm(customPath.trim())}
              >
                Use Path
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files);
              }}
              className="flex h-44 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-badge/50 text-sm text-body"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden="true" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-brand" aria-hidden="true" />
                  <span>Drag &amp; drop an image here, or</span>
                  <Button type="button" variant="outline" className="h-9" onClick={() => fileRef.current?.click()}>
                    Browse Files
                  </Button>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
                className="sr-only"
                onChange={(e) => upload(e.target.files)}
              />
              <p className="text-xs text-soft">PNG, JPG, WebP, GIF, AVIF or SVG · big photos are compressed automatically</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
