import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // GEO Auto-Detection from Edge Headers (Vercel / Cloudflare / AWS)
  const countryHeader = (
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code") ||
    ""
  ).toUpperCase();

  let detectedRegion: "uk" | "es" | "us" | null = null;
  if (countryHeader === "ES") detectedRegion = "es";
  else if (countryHeader === "US") detectedRegion = "us";
  else if (countryHeader === "GB" || countryHeader === "UK") detectedRegion = "uk";

  if (detectedRegion && !request.cookies.has("x-detected-region")) {
    response.cookies.set("x-detected-region", detectedRegion, { path: "/", maxAge: 86400 * 30 });
  }

  // No Supabase configured → nothing to refresh.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return response;
  }

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
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|opengraph-image|auth/callback|api/analyze|api/estimate-portfolio|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
