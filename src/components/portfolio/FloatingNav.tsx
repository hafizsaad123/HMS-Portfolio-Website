"use client";

/**
 * FloatingNav — the bottom dock from the new exports.
 *
 * Two pills: a segmented Home / My Work toggle (the active segment is a
 * purple pill that physically slides between the two positions via a
 * framer-motion layout animation) and a separate "View Resume" pill with
 * the navy document chip. The resume opens the real file once configured,
 * otherwise an honest notice dialog (never a fake link).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Home, Briefcase, FileText, Mail, ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { site } from "@/data/site";
import { EASE_OUT_EXPO } from "./Reveal";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/work", label: "My Work", icon: Briefcase },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FloatingNav({
  resumeUrl = site.resumeUrl,
  email = site.email,
}: {
  /** Managed from the admin portal — passed by the server pages. */
  resumeUrl?: string | null;
  email?: string;
}) {
  const pathname = usePathname() ?? "/";
  const [resumeOpen, setResumeOpen] = useState(false);

  return (
    <>
      <motion.nav
        aria-label="Primary navigation"
        className="fixed bottom-[max(3rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-5 print:hidden"
        initial={{ y: 26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.45, ease: EASE_OUT_EXPO }}
      >
        {/* ——— segmented page toggle ——— */}
        <div className="flex items-center gap-1 rounded-full border border-line bg-white/95 p-[6px] shadow-[0_12px_40px_-12px_rgba(17,24,39,0.32)] backdrop-blur transition-transform duration-300 hover:scale-[1.02]">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            if (active) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current="page"
                  className="relative flex h-[38px] items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-brand shadow-[0_6px_20px_-6px_rgba(135,80,246,0.65)]"
                  />
                  <Icon className="relative z-10 h-4 w-4" aria-hidden="true" />
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className="group grid h-[38px] w-[38px] place-items-center rounded-full bg-badge text-soft transition-colors duration-200 hover:bg-[#ececf2] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon
                  className="h-[17px] w-[17px] transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>

        {/* ——— resume pill ——— */}
        {resumeUrl ? (
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[50px] items-center gap-2.5 rounded-full border border-line bg-white/95 pr-5 pl-2 text-[13.5px] font-medium shadow-[0_12px_40px_-12px_rgba(17,24,39,0.32)] backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-deep text-white transition-transform duration-300 hover:scale-105"
            >
              <FileText className="h-4 w-4" />
            </span>
            <span className="hidden text-ink sm:inline">
              View <span className="text-brand">Resume</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-brand sm:hidden" aria-hidden="true" />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setResumeOpen(true)}
            className="flex h-[50px] items-center gap-2.5 rounded-full border border-line bg-white/95 pr-5 pl-2 text-[13.5px] font-medium shadow-[0_12px_40px_-12px_rgba(17,24,39,0.32)] backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-brand-deep text-white">
              <FileText className="h-4 w-4" />
            </span>
            <span className="hidden text-ink sm:inline">
              View <span className="text-brand">Resume</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-brand sm:hidden" aria-hidden="true" />
          </button>
        )}
      </motion.nav>

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
