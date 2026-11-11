"use client";

/**
 * Client-side auth gate for the admin dashboard.
 *
 * In the static export the layout can't check the session cookie on the
 * server (there is no server), so the shell asks the API —
 * GET /api/admin/session (Next.js in development, PHP on the live host) —
 * and bounces to /admin/login when there's no valid session.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/admin/client";
import { AdminShell } from "./AdminShell";

type SessionState = { authenticated: boolean };

export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "denied" | "error">("checking");

  useEffect(() => {
    let cancelled = false;
    api<SessionState>("/api/admin/session")
      .then((data) => {
        if (cancelled) return;
        if (data?.authenticated) {
          setState("ok");
        } else {
          setState("denied");
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "ok") return <AdminShell>{children}</AdminShell>;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        {state === "checking" ? (
          <>
            <span
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-brand"
              aria-hidden="true"
            />
            <p className="text-sm text-soft" role="status">
              Checking your session…
            </p>
          </>
        ) : state === "denied" ? (
          <>
            <p className="text-sm text-soft">Redirecting to the sign-in page…</p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-ink">The admin API didn’t respond.</p>
            <p className="text-sm leading-relaxed text-soft">
              Make sure the site’s API is installed and reachable, then reload this page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Reload
            </button>
          </>
        )}
      </div>
    </div>
  );
}
