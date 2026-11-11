import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  getAdminUser,
  loginRateLimited,
  recordLoginFailure,
  resetLoginFailures,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";

const bodySchema = z.object({
  password: z.string().min(1, "Password is required"),
});

/** Password-only sign-in (single-account portal — no username). */
export async function POST(req: NextRequest) {
  try {
    if (loginRateLimited()) {
      return NextResponse.json(
        { error: "Too many attempts — wait a minute and try again." },
        { status: 429 },
      );
    }

    const { password } = bodySchema.parse(await req.json());
    const admin = await getAdminUser();

    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      recordLoginFailure();
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    resetLoginFailures();
    const { token, maxAge } = createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
