// Single source of truth for the public site origin.
//
// This value feeds `new URL()` in `app/layout.tsx` (metadataBase) at module
// load, so a malformed `NEXT_PUBLIC_SITE_URL` must NEVER reach it raw — an
// invalid value throws `TypeError: Invalid URL` during `next build` and takes
// the whole production build down. We tolerate the two mistakes people
// actually make in the Vercel dashboard: a missing protocol
// (`onfire.vercel.app`) and a stray trailing slash, and fall back to localhost
// if the value is still unusable.
function resolveSiteUrl(): string {
  const fallback = "http://localhost:3000";
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return fallback;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    // `.origin` normalises the value (validates it and drops any trailing
    // slash or path), so downstream `${siteUrl}${path}` concatenation is safe.
    return new URL(withProtocol).origin;
  } catch {
    return fallback;
  }
}

export const siteUrl = resolveSiteUrl();
