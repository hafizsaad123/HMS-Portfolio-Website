import { NextResponse } from "next/server";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/content";
import { getAdminUser, isAdminAuthenticated, verifyPassword } from "@/lib/auth";

/**
 * Session state for the portal. Public on purpose — the login page uses
 * `isDefaultPassword` to show the starter-password hint until the password
 * is changed in Settings.
 */
export async function GET() {
  const authenticated = await isAdminAuthenticated();
  const admin = await getAdminUser().catch(() => null);

  return NextResponse.json({
    authenticated,
    isDefaultPassword: admin ? verifyPassword(DEFAULT_ADMIN_PASSWORD, admin.passwordHash) : true,
  });
}
