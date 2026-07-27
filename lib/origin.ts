// Shared origin parsing for the environment variables that carry a URL.
//
// Two of them do — `NEXT_PUBLIC_SITE_URL` (where this app lives) and
// `NEXT_PUBLIC_SUPABASE_URL` (where its API lives) — and both are typed into a
// dashboard value box by hand, so both meet the same class of mistake: a
// missing protocol, a trailing slash, a pasted path, or the whole `KEY=value`
// line. `new URL()` is too permissive to catch the last one on its own: it
// happily accepts `_` and `=` in a hostname, so a value that could never
// resolve still parses. Hence the hostname check here.

/**
 * A hostname we would accept from DNS: dot-separated labels of letters, digits
 * and hyphens. `localhost` is the one permitted dotless exception, for dev.
 * Deliberately stricter than `new URL()`.
 */
const HOSTNAME =
  /^(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/;

/**
 * Normalise one candidate into an origin, or `null` if it isn't usable.
 * Tolerates the two mistakes people actually make in a dashboard — a missing
 * protocol (`myfire.works`) and a trailing slash — and rejects everything whose
 * hostname could not resolve.
 */
export function toOrigin(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    // `.origin` normalises (validates, drops any trailing slash or path), so
    // downstream `${origin}${path}` concatenation is safe.
    const url = new URL(withProtocol);
    return HOSTNAME.test(url.hostname) ? url.origin : null;
  } catch {
    return null;
  }
}
