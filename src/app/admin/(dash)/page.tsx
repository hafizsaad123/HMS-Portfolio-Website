"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FolderKanban,
  BriefcaseBusiness,
  Columns3,
  Images,
  History,
  FileText,
  FileUp,
  PenSquare,
  Upload,
  Plus,
  Download,
  ExternalLink,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, formatBytes, timeAgo } from "@/lib/admin/client";

interface Overview {
  counts: {
    projects: number;
    experience: number;
    socials: number;
    tools: number;
    skills: number;
    media: number;
    revisions: number;
  };
  lastRevision: { label: string; createdAt: string } | null;
  siteUpdated: string | null;
  storageBytes: number;
}

interface Revision {
  id: number;
  label: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  // time-dependent strings render only after mount (avoids SSR mismatch)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function load() {
    try {
      const [ov, rev] = await Promise.all([
        api<Overview>("/api/admin/overview"),
        api<{ items: Revision[] }>("/api/admin/revisions"),
      ]);
      setOverview(ov);
      setRevisions(rev.items.slice(0, 8));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load the dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(id: number) {
    setRestoring(id);
    try {
      await api(`/api/admin/revisions/${id}/restore`, { method: "POST" });
      toast.success("Content restored from snapshot.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setRestoring(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-soft" role="status">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading dashboard…</span>
      </div>
    );
  }

  const stats = overview
    ? [
        { label: "Projects", value: overview.counts.projects, icon: FolderKanban, href: "/admin/projects" },
        { label: "Experience", value: overview.counts.experience, icon: BriefcaseBusiness, href: "/admin/experience" },
        { label: "Media Files", value: overview.counts.media, icon: Images, href: "/admin/media" },
        { label: "Snapshots", value: overview.counts.revisions, icon: History, href: "/admin/settings" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-body">
            {overview?.lastRevision
              ? `Last change: ${overview.lastRevision.label} · ${mounted ? timeAgo(overview.lastRevision.createdAt) : "recently"}`
              : "Manage every word, project and image on your site from here."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10">
            <a href="/api/admin/export" className="gap-2">
              <Download className="h-4 w-4" aria-hidden="true" /> Backup
            </a>
          </Button>
          <Button asChild className="h-10 gap-2">
            <Link href="/admin/projects">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Project
            </Link>
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-[0_14px_35px_-24px_rgba(17,24,39,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center justify-between">
                <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-badge text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-3xl font-bold tracking-tight text-ink">{stat.value}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-body">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* quick actions */}
        <Card className="xl:col-span-2 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-ink">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { href: "/admin/sliders", icon: Columns3, title: "Change homepage images", desc: "The scrolling slider columns on the homepage" },
              { href: "/admin/content", icon: FileUp, title: "Upload resume (PDF)", desc: "Powers the “View Resume” button on your site" },
              { href: "/admin/content", icon: FileText, title: "Edit page text", desc: "Headings, bio paragraphs, About & Work copy" },
              { href: "/admin/projects", icon: FolderKanban, title: "Manage projects", desc: "Add, reorder, feature or update project cards" },
              { href: "/admin/projects", icon: PenSquare, title: "Write case studies", desc: "Blog-style pages for every project — /work/<slug>" },
              { href: "/admin/media", icon: Upload, title: "Upload images", desc: `Media library · ${formatBytes(overview?.storageBytes ?? 0)} stored` },
              { href: "/admin/settings", icon: History, title: "View history", desc: "Every change is snapshotted — restore anytime" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href + action.title}
                  href={action.href}
                  className="flex min-w-0 items-center gap-3.5 rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-badge text-brand">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{action.title}</span>
                    <span className="block truncate text-xs text-soft">{action.desc}</span>
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* recent history */}
        <Card className="xl:col-span-3 rounded-2xl">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base text-ink">Recent Changes</CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-body">
              <Link href="/admin/settings">Full history</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {revisions.length === 0 ? (
              <p className="py-6 text-center text-sm text-soft">No changes yet.</p>
            ) : (
              <ul className="grid gap-1.5">
                {revisions.map((revision) => (
                  <li
                    key={revision.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-badge"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{revision.label}</p>
                      <p className="text-xs text-soft">{mounted ? timeAgo(revision.createdAt) : "recently"}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 text-xs"
                      disabled={restoring === revision.id}
                      onClick={() => restore(revision.id)}
                    >
                      {restoring === revision.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* site links */}
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <span className="text-sm font-medium text-body">Your live site:</span>
          {[
            { href: "/", label: "Home" },
            { href: "/work", label: "Work" },
            { href: "/about", label: "About" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-body transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {link.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
