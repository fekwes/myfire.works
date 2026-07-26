import type { FireInputs } from "./fire-engine";
import type { Profile } from "./profiles";

/**
 * What to do about the local plan the moment someone becomes signed in.
 *
 * This exists because "signing up saves your plan" was previously attempted at
 * the `signUp()` call, reading `data.session` — and that session is only ever
 * present when the Supabase project has email confirmation **off**. With
 * confirmation on (the default, and how this project is configured) `signUp`
 * returns no session at all, so the save never ran: the account was created,
 * the plan stayed on the device only, and nothing said so. The user then
 * confirms by email, lands back signed in via `/auth/callback`, and by then
 * there is no sign-up handler left to do it.
 *
 * Keying the decision off "a session now exists" instead of "a sign-up just
 * returned one" makes the promise true for every path in: confirmation off,
 * confirmation on, and signing in on a device where a plan was already built.
 */
export type PlanSyncAction =
  /** Nothing to do. */
  | { kind: "none" }
  /** Save the local plan as this account's first profile. */
  | { kind: "adopt-local" }
  /** Pull the account's most recent plan down onto this device. */
  | { kind: "restore"; inputs: FireInputs };

/**
 * Decide how a signed-in session and a local plan should be reconciled.
 *
 * The one rule worth stating out loud: an existing local plan is never
 * overwritten by a saved one. Local could be newer, unsaved work, and silently
 * replacing it is indistinguishable from losing it — the user can still load
 * any saved profile explicitly from the Edit plan screen.
 */
export function decidePlanSync({
  hasLocalPlan,
  saved,
}: {
  hasLocalPlan: boolean;
  /** The account's profiles, newest first (as `parseProfileRows` returns them). */
  saved: Profile[];
}): PlanSyncAction {
  const newest = saved[0];

  // A brand-new account: whatever they built before signing up becomes their
  // first profile. This is the "signing up saves your plan" promise.
  if (!newest) return hasLocalPlan ? { kind: "adopt-local" } : { kind: "none" };

  // A returning account on a fresh browser: bring their plan back.
  if (!hasLocalPlan) return { kind: "restore", inputs: newest.inputs };

  // Both exist — leave the local one alone.
  return { kind: "none" };
}

/** The name a first, auto-adopted profile is given. */
export const FIRST_PROFILE_NAME = "My plan";
