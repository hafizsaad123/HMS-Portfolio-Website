/**
 * Admin authentication — Supabase Auth (email + password).
 *
 * - Sessions live in cookies managed by @supabase/ssr and are refreshed by
 *   src/proxy.ts on every request.
 * - The portal is single-account: ANY signed-in user counts as the admin.
 *   The account is created via the Supabase dashboard (Authentication →
 *   Users → Add user, "Auto Confirm User" ticked). It can NEVER be created
 *   with SQL — GoTrue rejects SQL-forged auth.users rows ("Database error").
 *   Its password can be changed from the admin Settings page.
 * - API routes guard themselves with requireAdmin(); the proxy is only the
 *   fast outer gate for pages.
 */

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized — please sign in again.");
    this.name = "UnauthorizedError";
  }
}

/** True when the request carries a valid Supabase session. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

/** API guard: returns the signed-in admin user, or throws UnauthorizedError. */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
