import type { FireInputs } from "./fire-engine";

/**
 * A saved profile — one named set of plan inputs, stored per user in the
 * `portfolios` table. "Profile" is the user-facing word; the table name is
 * historical and deliberately left alone so existing saves keep working.
 */
export interface Profile {
  id: string;
  name: string;
  inputs: FireInputs;
  updated_at?: string | null;
}

/** Longest profile name we'll store — keeps the list readable. */
export const MAX_PROFILE_NAME = 60;

/**
 * Tidy a name typed by a user: trim the ends, collapse runs of whitespace,
 * and cap the length. Returns "" for anything that is only whitespace.
 */
export function normaliseProfileName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_PROFILE_NAME);
}

/** A name is usable if it survives normalisation with something left. */
export function isValidProfileName(raw: string): boolean {
  return normaliseProfileName(raw).length > 0;
}

/** Case-insensitive match, so "My plan" and "my plan" are the same profile. */
export function findProfileByName(
  profiles: Profile[],
  name: string,
): Profile | undefined {
  const target = normaliseProfileName(name).toLowerCase();
  return profiles.find((p) => normaliseProfileName(p.name).toLowerCase() === target);
}

/**
 * Pick a free name for a "save a copy" action: "Plan" → "Plan (2)" → "Plan (3)".
 * Guarantees a name that doesn't collide with an existing profile, so a copy
 * can never silently overwrite the profile it was copied from.
 */
export function nextCopyName(base: string, profiles: Profile[]): string {
  const root = normaliseProfileName(base) || "Untitled plan";
  if (!findProfileByName(profiles, root)) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = normaliseProfileName(`${root} (${n})`);
    if (!findProfileByName(profiles, candidate)) return candidate;
  }
  return `${root} ${Date.now()}`;
}

/** Newest-first by `updated_at`, with unknown timestamps sorted last. */
export function sortProfiles(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) => {
    const at = a.updated_at ? Date.parse(a.updated_at) : Number.NaN;
    const bt = b.updated_at ? Date.parse(b.updated_at) : Number.NaN;
    if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
    if (Number.isNaN(at)) return 1;
    if (Number.isNaN(bt)) return -1;
    return bt - at;
  });
}

/**
 * Turn a Supabase/PostgREST failure into something a person can act on.
 *
 * This exists because the previous version ignored write errors entirely and
 * always flashed a success tick — so a save that never landed looked saved,
 * and the plan was gone on reload. Every failure must now say so out loud.
 */
export function describeProfileError(error: {
  code?: string | null;
  message?: string | null;
} | null): string | null {
  if (!error) return null;
  const code = error.code ?? "";
  // Undefined table — the migration hasn't been run on this project.
  if (code === "42P01") {
    return "Saved plans aren't set up on this project yet, so nothing was saved.";
  }
  // RLS rejection / not authenticated.
  if (code === "42501" || code === "PGRST301") {
    return "You don't have permission to save here — try signing in again.";
  }
  // Unique violation on (user_id, name).
  if (code === "23505") {
    return "You already have a plan with that name. Rename it, or load and overwrite it.";
  }
  return error.message
    ? `Couldn't save: ${error.message}`
    : "Couldn't save — please try again.";
}

/** Compact "when was this last saved" label for the profile list. */
export function formatSavedAt(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((now.getTime() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
