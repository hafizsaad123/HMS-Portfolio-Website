import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageCanvas } from "@/components/portfolio/PageCanvas";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "This page doesn’t exist.",
  robots: { index: false, follow: false },
};

/**
 * 404 — on-brand (framed canvas + pixel motif), honest, with a working
 * link home.
 */
export default function NotFound() {
  return (
    <PageCanvas>
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-7 px-6 py-16 text-center">
        {/* pixel motif, echoing the corner clusters */}
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
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep hover:shadow-[0_10px_25px_-10px_rgba(135,80,246,0.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>
      </div>
    </PageCanvas>
  );
}
