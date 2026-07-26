import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect from email-confirmation / OAuth links: exchanges the
// one-time code for a session cookie, then sends the user back to the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/planner";

  if (code && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // An expired or already-used link must not drop someone into the app
    // looking signed out with no explanation — that reads as the app losing
    // their account. Send them to /account, which can ask them to sign in.
    if (error) {
      return NextResponse.redirect(`${origin}/account?authError=link`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
