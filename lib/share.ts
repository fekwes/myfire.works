import type { FireInputs } from "./fire-engine";

/**
 * Encode a plan into a URL-safe string for a read-only share link
 * (`/planner?p=<encoded>`). The inputs are plain numbers/strings (all ASCII),
 * so base64 of the JSON is enough — we only swap in URL-safe characters and
 * drop padding. No backend required.
 */
export function encodePlan(inputs: FireInputs): string {
  const b64 = btoa(JSON.stringify(inputs));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a shared-plan parameter back into `FireInputs`, or `null` if it's
 * missing, malformed, or doesn't look like a plan. Never throws.
 */
export function decodePlan(param: string | null | undefined): FireInputs | null {
  if (!param) return null;
  try {
    const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(b64));
    if (typeof parsed !== "object" || parsed === null) return null;
    // Sanity-check the fields every plan must have.
    const p = parsed as Record<string, unknown>;
    if (
      typeof p.currentAge !== "number" ||
      typeof p.retirementAge !== "number" ||
      typeof p.targetAnnualIncome !== "number"
    ) {
      return null;
    }
    return parsed as FireInputs;
  } catch {
    return null;
  }
}
