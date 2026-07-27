import { toOrigin } from "../origin";

/**
 * Hostnames that serve *this app*, and therefore never the Supabase API.
 *
 * `NEXT_PUBLIC_SUPABASE_URL` was once set to the app's own deployment URL
 * (`https://onfire-nu.vercel.app`). Nothing in the app noticed: the value is a
 * perfectly good URL, `isSupabaseConfigured` was true, the Sign in button
 * rendered, and every auth call went to `<the app>/auth/v1/…` — a path this app
 * does not serve. What the user got was a CORS error, because the browser
 * reports the missing `Access-Control-Allow-Origin` on the preflight long
 * before it would report the 404 behind it:
 *
 *   Access to fetch at 'https://onfire-nu.vercel.app/auth/v1/signup' from
 *   origin 'https://www.myfire.works' has been blocked by CORS policy
 *
 * That error names neither the variable at fault nor this app, which is what
 * made it expensive to read. So we reject the wrong origin at the source.
 *
 * Deliberately a denylist, not an allowlist of `*.supabase.co`: Supabase
 * supports custom domains, and refusing to start against one would be a worse
 * bug than the one being fixed.
 */
const APP_HOSTNAME_SUFFIXES = [".vercel.app"];

/** Every origin we know belongs to the app. Literal `process.env` reads: Next
 *  only inlines `NEXT_PUBLIC_*` into the browser bundle when it can see them. */
const APP_URLS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
];

function hostnameOf(origin: string): string {
  return new URL(origin).hostname;
}

/**
 * Resolve `NEXT_PUBLIC_SUPABASE_URL` into an origin we are willing to send auth
 * traffic to. Exported for tests — the constant below is fixed at import time.
 *
 * A `reason` is a misconfiguration worth shouting about. Absent value *and*
 * absent reason is the supported "no Supabase" build, which degrades to the
 * local-only app.
 */
export function resolveSupabaseUrl(
  raw: string | undefined,
  appUrls: readonly (string | undefined)[] = [],
): { origin: string | null; reason: string | null } {
  if (!raw?.trim()) return { origin: null, reason: null };

  const origin = toOrigin(raw);
  if (!origin) {
    return {
      origin: null,
      reason: `NEXT_PUBLIC_SUPABASE_URL is not a usable URL (${JSON.stringify(raw)}). Expected the Project URL from Supabase → Project Settings → API, e.g. https://your-project-id.supabase.co`,
    };
  }

  const hostname = hostnameOf(origin);
  const appHostnames = appUrls
    .map(toOrigin)
    .filter((value): value is string => value !== null)
    .map(hostnameOf);

  const isApp =
    appHostnames.includes(hostname) ||
    APP_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

  if (isApp) {
    return {
      origin: null,
      reason: `NEXT_PUBLIC_SUPABASE_URL points at this app (${origin}), not at Supabase, so every auth request would be blocked by CORS. Set it to the Project URL from Supabase → Project Settings → API, e.g. https://your-project-id.supabase.co`,
    };
  }

  return { origin, reason: null };
}

const resolved = resolveSupabaseUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  APP_URLS,
);

// Loud, and in both places that can see it: the browser console for whoever
// hits the broken sign-in, the build/server log for whoever can fix it.
if (resolved.reason) console.error(`[supabase] ${resolved.reason}`);

export const SUPABASE_URL = resolved.origin ?? undefined;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Auth features are enabled only when both env vars are present *and* the URL
 * is one we can actually reach. A misconfigured URL degrades to the same
 * signed-out app as no Supabase at all — an absent Sign in button beats one
 * that fails on submit with a message about CORS.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * The service-role key (server-only, never exposed to the browser) enables
 * full account deletion. Its absence degrades to a data-only delete.
 */
export const isServiceRoleConfigured = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
