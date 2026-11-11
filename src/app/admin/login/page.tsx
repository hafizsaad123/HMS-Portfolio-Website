"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

/**
 * Admin sign-in — Supabase Auth (email + password).
 * The session cookies are set by @supabase/ssr and refreshed by the proxy.
 */

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // already signed in? straight to the dashboard
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/admin");
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const message = signInError.message.toLowerCase();
        if (message.includes("invalid login credentials")) {
          setError("Wrong email or password.");
        } else if (message.includes("email not confirmed")) {
          setError("Your account isn't confirmed yet — open Supabase → Authentication → Users and confirm it.");
        } else if (message.includes("failed to fetch") || message.includes("fetch failed")) {
          setError("Couldn't reach Supabase — check the URL and key in .env.local.");
        } else {
          setError(signInError.message);
        }
        setSubmitting(false);
        return;
      }

      toast.success("Welcome back!");
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Sign-in failed — check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#fafafa] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white shadow-[0_10px_30px_-10px_rgba(135,80,246,0.7)]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">Portfolio Admin</h1>
            <p className="mt-1 text-sm text-body">Sign in to manage your site</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-[0_18px_50px_-30px_rgba(17,24,39,0.35)]"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@saad.design"
                className="h-11 pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" aria-hidden="true" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 pl-9"
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} className="h-11 w-full text-sm font-semibold">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="flex items-start gap-2 rounded-lg bg-badge px-3 py-2.5 text-[12.5px] leading-relaxed text-body">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              First time here? Run <strong className="text-ink">supabase/migration.sql</strong> in the
              Supabase SQL Editor — it creates the account{" "}
              <strong className="text-ink">admin@saad.design</strong> /{" "}
              <strong className="text-ink">saad2026</strong> (change it in Settings after your first
              sign-in).
            </span>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-soft">
          Every change is snapshotted automatically — nothing can be lost.
        </p>
      </div>
    </div>
  );
}
