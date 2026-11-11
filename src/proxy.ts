import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Next.js 16 proxy (the renamed middleware).
 *
 *  1. Refreshes the Supabase auth session on every request (token rotation
 *     cookies are written onto the response).
 *  2. Guards the admin portal: no session → /admin/login, session on the
 *     login page → /admin.
 *
 * API routes also check auth themselves (requireAdmin) — this is the fast
 * outer gate, not the only one.
 */
export default async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isAdminArea = path === "/admin" || path.startsWith("/admin/");
  const isLoginPage = path === "/admin/login";

  if (isAdminArea && !isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and the media file route
     * (media files are immutable + cached hard; anon visitors carry no
     * auth cookies so skipping them saves needless work).
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|logo.svg|robots.txt|api/media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff2)$).*)",
  ],
};
