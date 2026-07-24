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

/** Read a previously-saved plan, or `null` if none/invalid. Safe on the server. */
export function loadPlanLocal(): FireInputs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FireInputs;
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
