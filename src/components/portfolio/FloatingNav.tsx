"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, UserRound, Briefcase, FileText, ArrowUpRight, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { site } from "@/data/site";

/**
 * Floating navigation pill — fixed to the bottom, centred on the main
 * content column (65.5% of the viewport at lg+, matching the 31% sidebar
 * from the exports). The active page renders as the purple pill with its
 * label; inactive pages are icon buttons.
 */

const links = [
  { href: "/", label: "Home", icon: Home, activeLabel: "Home" },
  { href: "/about", label: "About Me", icon: UserRound, activeLabel: "About Me" },
  { href: "/work", label: "My Work", icon: Briefcase, activeLabel: "My Work" },
] as const;

export function FloatingNav({
  resumeUrl = site.resumeUrl,
  email = site.email,
}: {
  /** Managed from the admin portal — passed by the server pages. */
  resumeUrl?: string | null;
  email?: string;
}) {
  const pathname = usePathname();
  const [resumeOpen, setResumeOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="fixed z-50 bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 lg:left-[calc(50vw+198px)] xl:left-[65.5%] w-max max-w-[calc(100vw-1.5rem)]"
      >
        <div className="flex items-center gap-1 rounded-full border border-line bg-white/95 p-1.5 shadow-[0_10px_35px_-10px_rgba(17,24,39,0.28)] backdrop-blur">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            if (active) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current="page"
                  className="flex h-11 items-center gap-2 rounded-full bg-brand px-4 text-[13px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.activeLabel}
                </Link>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className="flex h-11 w-11 items-center justify-center rounded-full text-soft transition-colors hover:bg-badge hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
            );
          })}

          {/* Resume — opens the real destination once configured,
              otherwise an honest notice (never a fake link). */}
          {resumeUrl ? (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 flex h-11 items-center gap-2.5 rounded-full pr-4 pl-2 text-[13px] font-medium text-brand transition-colors hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-brand-ink text-white">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">View Resume</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setResumeOpen(true)}
              className="ml-1 flex h-11 items-center gap-2.5 rounded-full pr-4 pl-2 text-[13px] font-medium text-brand transition-colors hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-brand-ink text-white">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">View Resume</span>
            </button>
          )}
        </div>
      </nav>

      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg text-ink">Resume isn’t available yet</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-body">
              The resume file hasn’t been added to this site. You can email me
              directly and I’ll share it with you.
            </DialogDescription>
          </DialogHeader>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("Resume request — via portfolio")}`}
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {email}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
