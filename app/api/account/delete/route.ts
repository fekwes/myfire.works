import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { isSupabaseConfigured, SUPABASE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// The one irreversible endpoint in the app. It authenticates its caller, so the
// exposure is small, but a per-IP cap is a cheap backstop against a script
// hammering it.
const perMinute = createRateLimiter({ windowMs: 60_000, max: 8 });

/**
 * Permanently delete the *authenticated caller's own* account. We verify the
 * session with the cookie-bound server client, then use a service-role admin
 * client to remove the auth user — their `portfolios` rows cascade away via the
 * table's `on delete cascade`. The service-role key is read from the server
 * env only and never reaches the browser.
 */
export async function POST(request: Request) {
  const gate = perMinute.check(clientIp(request));
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(gate.retryAfterMs / 1000)) },
      },
    );
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  // Who is calling? Only ever delete this verified user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !SUPABASE_URL) {
    // No admin key — the client falls back to deleting the user's data only.
    return NextResponse.json(
      { error: "Account deletion isn't enabled on this server." },
      { status: 501 },
    );
  }

  const admin = createAdminClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
