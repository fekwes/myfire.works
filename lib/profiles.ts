import type { FireInputs } from "./fire-engine";
import { sanitisePlanInput } from "./plan-storage";

/**
 * The Supabase table saved profiles live in.
 *
 * The name predates the Fireworks rebrand and is deliberately kept: it is the
 * live table in every existing project, so renaming it here would orphan every
 * plan anyone has already saved. `lib/identifiers.test.ts` pins it.
 */
export const PROFILES_TABLE = "portfolios";

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
 * What the failed request was trying to do. A read that fails must not tell
 * someone "nothing was saved" — they weren't saving, and the wrong sentence
 * sends them looking for a problem that isn't there.
 */
export type ProfileAction = "save" | "read" | "delete";

const ACTION_VERB: Record<ProfileAction, string> = {
  save: "save",
  read: "load your saved plans",
  delete: "delete that",
};

/**
 * Turn a Supabase/PostgREST failure into something a person can act on.
 *
 * This exists because the previous version ignored write errors entirely and
 * always flashed a success tick — so a save that never landed looked saved,
 * and the plan was gone on reload. Every failure must now say so out loud.
 */
export function describeProfileError(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
  action: ProfileAction = "save",
): string | null {
  if (!error) return null;
  const code = error.code ?? "";
  // Undefined table — the migration hasn't been run on this project. `42P01` is
  // Postgres'; `PGRST205` is what PostgREST returns when the table isn't in its
  // schema cache, which is what a caller actually sees. Missing it meant the
  // commonest setup mistake surfaced as a raw "Could not find the table
  // 'public.portfolios' in the schema cache".
  if (code === "42P01" || code === "PGRST205") {
    return action === "read"
      ? "Saved plans aren't set up on this project yet, so there's nothing to load."
      : "Saved plans aren't set up on this project yet, so nothing was saved.";
  }
  // RLS rejection / not authenticated. 42501 is a missing table grant — the
  // migration's `grant … to authenticated` line is the usual culprit.
  if (code === "42501" || code === "PGRST301") {
    return `You don't have permission to ${ACTION_VERB[action]} — try signing in again.`;
  }
  // Unique violation on (user_id, name).
  if (code === "23505") {
    return "You already have a plan with that name. Rename it, or load and overwrite it.";
  }
  const prefix =
    action === "read"
      ? "Couldn't load your saved plans"
      : action === "delete"
        ? "Couldn't delete that"
        : "Couldn't save";
  return error.message ? `${prefix}: ${error.message}` : `${prefix} — please try again.`;
}

/**
 * Validate rows read back from Supabase before any of them reach the engine.
 *
 * A row's `inputs` is a `jsonb` blob, and the app is not the only thing that
 * can have written it: an older build with a different field set, a plan saved
 * while a field was mid-edit (`NaN` serialises to `null`), a hand-edited row.
 * `sanitisePlanInput` is the same validator that guards localStorage and share
 * links, and it has to guard this path too — without it one bad row renders
 * `£NaN` across the projection, or worse a quietly wrong figure.
 *
 * Rows that can't be salvaged are dropped rather than thrown away silently at
 * the point of use, and counted so the UI can say so.
 */
export function parseProfileRows(rows: unknown): {
  profiles: Profile[];
  dropped: number;
} {
  if (!Array.isArray(rows)) return { profiles: [], dropped: 0 };
  const profiles: Profile[] = [];
  let dropped = 0;
  for (const row of rows) {
    if (typeof row !== "object" || row === null) {
      dropped++;
      continue;
    }
    const r = row as Record<string, unknown>;
    const inputs = sanitisePlanInput(r.inputs);
    if (typeof r.id !== "string" || typeof r.name !== "string" || !inputs) {
      dropped++;
      continue;
    }
    profiles.push({
      id: r.id,
      name: r.name,
      inputs,
      updated_at: typeof r.updated_at === "string" ? r.updated_at : null,
    });
  }
  return { profiles: sortProfiles(profiles), dropped };
}

/**
 * Rows are validated on the way in by `parseProfileRows`, so a `Profile` in
 * state is already safe to load. This re-validates at the point of use anyway:
 * it is one cheap call, and it means a future caller that builds a `Profile`
 * some other way can't route around the validator.
 */
export function profileInputsForLoad(profile: Profile): FireInputs | null {
  return sanitisePlanInput(profile.inputs);
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
