import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "This page doesn’t exist.",
  robots: { index: false, follow: false },
};

/**
 * 404 — on-brand, honest, with a working link home.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-white px-6 py-16 text-center">
      {/* pixel motif, echoing the sidebar decor */}
      <div aria-hidden="true" className="flex items-end justify-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-[3px] bg-brand-blue" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-brand" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-brand-soft" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-brand-deep" />
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-ink">404</h1>
        <p className="text-body">
          This page doesn’t exist. The link may be outdated or mistyped.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>
    </div>
  );
}
