"use client";

/**
 * Client data layer for the public site.
 *
 * Architecture: every public page is server-rendered with its content
 * baked in (perfect SEO + instant paint), then hydrated by these client
 * views which refresh the same data from GET /api/content:
 *   - development  → the Next.js route (SQLite via Prisma)
 *   - live host    → the PHP API (MySQL)
 * The URL is identical in both environments (same-origin /api/content),
 * so this file never needs to know where it's running.
 */

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/admin/client";
import type { ContentPayload } from "@/data/types";

// ————————————————————————————————————————————————
// Provider

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            gcTime: 30 * 60 * 1000,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ————————————————————————————————————————————————
// The one query that powers the whole public site

export function useContent(initial?: ContentPayload) {
  return useQuery({
    queryKey: ["site-content"],
    queryFn: () => api<ContentPayload>("/api/content"),
    initialData: initial,
    // Server-baked content renders instantly but counts as stale, so a
    // background refresh brings in live admin edits right away.
    initialDataUpdatedAt: initial ? 0 : undefined,
    staleTime: 30_000,
  });
}

// ————————————————————————————————————————————————
// Loading / error states (match the site's design language)

/** Sidebar-sized shimmering skeleton — used while the first fetch runs. */
export function SidebarSkeleton() {
  return (
    <div className="relative w-full lg:h-dvh lg:w-[31%] lg:min-w-[397px] lg:shrink-0" aria-hidden="true">
      <div className="flex h-full w-full flex-col gap-7 border border-line bg-white px-10 pt-10">
        <div className="flex items-start gap-3.5">
          <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-[16px] bg-badge" />
          <div className="flex w-full flex-col gap-2 pt-2">
            <div className="h-3.5 w-3/5 animate-pulse rounded bg-badge" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-badge" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-4/5 animate-pulse rounded bg-badge" />
          <div className="h-2.5 w-full animate-pulse rounded bg-badge" />
          <div className="h-2.5 w-3/5 animate-pulse rounded bg-badge" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="h-2 w-14 animate-pulse rounded bg-badge" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 4 - i }).map((_, j) => (
                <div key={j} className="h-6 w-20 animate-pulse rounded-full bg-badge" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Centered spinner card for full-page loading (case study fallback page). */
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-brand" aria-hidden="true" />
        <p className="text-sm text-soft">{label}</p>
      </div>
    </div>
  );
}

/** Friendly inline error with a retry — used only when there is no
 *  server-baked content to fall back to. */
export function ContentError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-line bg-white px-8 py-10 text-center">
        <p className="text-[15px] font-semibold text-ink">Couldn’t load the content.</p>
        <p className="text-sm leading-relaxed text-soft">
          The site’s API didn’t respond. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="h-10 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
