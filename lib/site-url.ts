// Single source of truth for the public site origin.
//
// This value feeds `new URL()` in `app/layout.tsx` (metadataBase) at module
// load, so a malformed `NEXT_PUBLIC_SITE_URL` must NEVER reach it raw — an
// invalid value throws `TypeError: Invalid URL` during `next build` and takes
// the whole production build down.
//
// Tolerating a bad value is not enough on its own, though. `NEXT_PUBLIC_SITE_URL`
// was once set to the whole `KEY=value` line pasted into the Vercel dashboard's
// value box. That parses: prefixing `https://` gives
// `https://NEXT_PUBLIC_SITE_URL=https://myfire.works`, whose hostname is
// `next_public_site_url=https`. The build stayed green and every canonical,
// sitemap entry, robots line and OG image URL on the live site pointed at a
// hostname that does not exist. So we validate the *hostname* too, and fall
// back to the origin Vercel already knows rather than to a wrong value.

/**
 * A hostname we would accept from DNS: dot-separated labels of letters, digits
 * and hyphens. `localhost` is the one permitted dotless exception, for dev.
 * Deliberately stricter than `new URL()`, which happily accepts `_` and `=`.
 */
const HOSTNAME =
  /^(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/;

/**
 * Normalise one candidate into an origin, or `null` if it isn't usable.
 * Tolerates the two mistakes people actually make in a dashboard — a missing
 * protocol (`myfire.works`) and a trailing slash — and rejects everything whose
 * hostname could not resolve.
 */
function toOrigin(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    // `.origin` normalises (validates, drops any trailing slash or path), so
    // downstream `${siteUrl}${path}` concatenation is safe.
    const url = new URL(withProtocol);
    return HOSTNAME.test(url.hostname) ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * First usable candidate wins, else localhost. Exported for tests — the module
 * constant below is fixed at import time and can't be re-read per case.
 */
export function pickSiteUrl(candidates: readonly (string | undefined)[]): string {
  for (const candidate of candidates) {
    const origin = toOrigin(candidate);
    if (origin) return origin;
  }
  return "http://localhost:3000";
}

// Each `process.env.X` is referenced literally so Next can statically inline the
// `NEXT_PUBLIC_*` ones. `VERCEL_PROJECT_PRODUCTION_URL` is Vercel's own name for
// the project's primary production domain — it follows whichever domain is set
// primary in the dashboard, so the canonical can never disagree with the
// redirect. It is server-only, which is fine: every consumer of `siteUrl`
// (layout, page, sitemap, robots) is a server component. Importing this module
// into a client component would silently lose that fallback.
export const siteUrl = pickSiteUrl([
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]);
