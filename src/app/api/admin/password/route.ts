import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/admin/crud";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

/**
 * Change the admin password (Supabase Auth).
 *
 * A scratch client verifies the CURRENT password by signing in fresh, then
 * uses that fresh session to set the new one — this both proves the caller
 * knows the old password and avoids Supabase's "session too old" guard on
 * password updates. The caller must already be signed in (requireAdmin).
 */
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = bodySchema.parse(await req.json());
    if (!admin.email) {
      return NextResponse.json({ error: "This account has no email set." }, { status: 400 });
    }

    const scratch = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    // 1. prove the current password is right
    const { error: signInError } = await scratch.auth.signInWithPassword({
      email: admin.email,
      password: body.currentPassword,
    });
    if (signInError) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 });
    }

    // 2. set the new password on the fresh session
    const { error: updateError } = await scratch.auth.updateUser({
      password: body.newPassword,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
