"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  BriefcaseBusiness,
  FileText,
  Images,
  Settings as SettingsIcon,
  ExternalLink,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

/**
 * Admin portal shell — fixed navigation sidebar on desktop, slide-in sheet
 * on mobile. Full-height layout: the sidebar is pinned and only the main
 * column scrolls (mirroring the public site's rule #1).
 */

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/experience", label: "Experience", icon: BriefcaseBusiness },
  { href: "/admin/content", label: "Page Content", icon: FileText },
  { href: "/admin/media", label: "Media Library", icon: Images },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
] as const;

function NavLinks({ onNavigate, pathname }: { onNavigate?: () => void; pathname: string }) {
  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-brand text-white shadow-sm"
                : "text-body hover:bg-badge hover:text-ink",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      // Supabase Auth sign-out — clears the session cookies
      await createClient().auth.signOut();
      router.push("/admin/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-body transition-colors hover:bg-badge hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ExternalLink className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        View Site
      </a>
      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-body transition-colors hover:bg-badge hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {loggingOut ? "Signing out…" : "Sign Out"}
      </button>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-[#fafafa] lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* ——— desktop sidebar ——— */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-line bg-white p-4 lg:flex lg:h-dvh">
        <div className="flex flex-col gap-6">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold text-ink">Portfolio Admin</span>
              <span className="block text-xs text-soft">Content control center</span>
            </span>
          </Link>
          <NavLinks pathname={pathname} />
        </div>
        <SidebarFooter />
      </aside>

      {/* ——— main column (the only scroller at lg+) ——— */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-dvh lg:overflow-y-auto">
        {/* mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Open admin menu"
              className="grid h-11 w-11 place-items-center rounded-lg text-body hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="flex items-center gap-2.5 px-2 pb-4 pt-1 text-[15px] font-semibold text-ink">
                <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-[9px] bg-brand text-white">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                Portfolio Admin
              </SheetTitle>
              <div className="flex h-[calc(100%-4.5rem)] flex-col justify-between">
                <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
                <SidebarFooter />
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-[15px] font-semibold text-ink">Portfolio Admin</span>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View site (opens in new tab)"
            className="grid h-11 w-11 place-items-center rounded-lg text-body hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ExternalLink className="h-5 w-5" aria-hidden="true" />
          </a>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
