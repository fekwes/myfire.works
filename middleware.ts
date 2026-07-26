import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  // No Supabase configured → nothing to refresh.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the session cookie if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /**
     * Only paths that actually need a session.
     *
     * This runs `auth.getUser()`, which for a signed-in visitor is a network
     * round-trip to the Supabase Auth server — so every path matched here adds
     * that hop to every request, and spends Supabase quota. The previous
     * pattern matched everything but static assets, which meant the two AI
     * routes, the sitemap, robots.txt and the OpenGraph image all paid for a
     * session refresh none of them read.
     *
     * Excluded and why:
     * - `_next/*`, `favicon.ico`, `icon.svg`, image files — no session.
     * - `robots.txt`, `sitemap.xml`, `opengraph-image` — public, uncached-by-user.
     * - `api/analyze`, `api/estimate-portfolio` — unauthenticated endpoints.
     * - `auth/callback` — exchanges the code and sets the cookies itself;
     *   refreshing first is wasted work on the one request guaranteed not to
     *   have a session yet.
     *
     * `api/account/delete` is deliberately *not* excluded: it authenticates the
     * caller, so it wants the token refreshed before it reads it.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|opengraph-image|auth/callback|api/analyze|api/estimate-portfolio|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
