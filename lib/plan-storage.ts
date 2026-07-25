import type { FireInputs } from "./fire-engine";

/**
 * localStorage key used to hand a plan from the onboarding quiz (`/start`) to
 * the planner (`/planner`). Kept as a single stringified `FireInputs`.
 */
export const PLAN_STORAGE_KEY = "onfire:plan";

/** Persist an assembled plan so the planner can pick it up. Safe on the server. */
export function savePlanLocal(inputs: FireInputs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // Storage can be unavailable (private mode, quota) — degrade silently.
  }
}

/** The fields a plan can't be simulated without. */
const REQUIRED_NUMERIC_FIELDS = [
  "currentAge",
  "retirementAge",
  "targetAnnualIncome",
  "isaBalance",
  "isaMonthlyContribution",
  "sippBalance",
  "sippMonthlyContribution",
] as const;

/**
 * Make a parsed blob safe to hand to the engine, or reject it.
 *
 * Stored plans are ordinary JSON that anything can have written — an older
 * build, a hand-edited devtools value, or a field that was mid-edit when the
 * tab closed (`NaN` serialises to `null`). A single non-numeric value would
 * otherwise flow straight into the projection and surface as `£NaN`, or worse
 * as a quietly wrong figure, so:
 *
 * - a required field that isn't a finite number invalidates the whole plan
 *   (better a clean start than a plan silently computed from age 0);
 * - an optional field that isn't a finite number is dropped, letting the
 *   engine's own default apply.
 */
export function sanitisePlanInput(parsed: unknown): FireInputs | null {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const source = parsed as Record<string, unknown>;

  for (const key of REQUIRED_NUMERIC_FIELDS) {
    if (typeof source[key] !== "number" || !Number.isFinite(source[key])) {
      return null;
    }
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    if (value === null || value === undefined) continue;
    clean[key] = value;
  }
  return clean as unknown as FireInputs;
}

/** Read a previously-saved plan, or `null` if none/invalid. Safe on the server. */
export function loadPlanLocal(): FireInputs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    return sanitisePlanInput(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Forget any stored plan. Safe on the server. */
export function clearPlanLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLAN_STORAGE_KEY);
  } catch {
    // no-op
  }
}
