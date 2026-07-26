import type { AssetClass, Holding } from "./assets";
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

/**
 * The three figures a plan is meaningless without. There's no sensible
 * fallback for "how old are you" or "what do you want to live on", so a plan
 * missing them is rejected outright.
 */
const ESSENTIAL_FIELDS = [
  "currentAge",
  "retirementAge",
  "targetAnnualIncome",
] as const;

/**
 * Numbers the engine needs present, but where zero is a perfectly sensible
 * reading of "absent" — someone with no GIA, or a link from an older build
 * that didn't carry a field. Filled in rather than used to reject the plan,
 * so an old or partial share link still opens.
 */
const ZERO_FILLED_FIELDS = [
  "isaBalance",
  "isaMonthlyContribution",
  "sippBalance",
  "sippMonthlyContribution",
] as const;

const HOLDINGS_FIELDS = ["isaHoldings", "sippHoldings", "giaHoldings"] as const;

const VALID_ASSET_CLASSES: readonly string[] = [
  "global-equity",
  "us-equity",
  "multi-asset-100",
  "multi-asset-80",
  "multi-asset-60",
  "global-bonds",
  "cash",
];

/**
 * Validate a wrapper's holdings array from untrusted JSON: each holding needs a
 * known asset class and finite ocf/weight/return, or it's dropped. Returns
 * `undefined` (no portfolio) when nothing usable survives, so a malformed blob
 * falls back to the scalar growth rather than reaching the engine.
 */
function sanitiseHoldings(value: unknown): Holding[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const clean: Holding[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const h = item as Record<string, unknown>;
    if (
      typeof h.assetClass !== "string" ||
      !VALID_ASSET_CLASSES.includes(h.assetClass)
    ) {
      continue;
    }
    const holding: Holding = {
      assetClass: h.assetClass as AssetClass,
      ocf: typeof h.ocf === "number" && Number.isFinite(h.ocf) ? h.ocf : 0,
      weight:
        typeof h.weight === "number" && Number.isFinite(h.weight) && h.weight >= 0
          ? h.weight
          : 0,
    };
    if (typeof h.fundId === "string") holding.fundId = h.fundId;
    if (typeof h.label === "string") holding.label = h.label;
    if (typeof h.expectedReturn === "number" && Number.isFinite(h.expectedReturn)) {
      holding.expectedReturn = h.expectedReturn;
    }
    clean.push(holding);
  }
  return clean.length > 0 ? clean : undefined;
}

/**
 * Make a parsed blob safe to hand to the engine, or reject it.
 *
 * Plans arrive as ordinary JSON that anything can have written — an older
 * build, a hand-edited devtools value, a truncated share link someone pasted,
 * or a field that was mid-edit when the tab closed (`NaN` serialises to
 * `null`). A single non-numeric value would otherwise flow straight into the
 * projection and surface as `£NaN`, or worse as a quietly wrong figure.
 *
 * The rule is graded by how recoverable each field is, so validation stays
 * safe without being brittle about old links:
 *
 * - an **essential** field (the ages, the target) that isn't a finite number
 *   invalidates the plan — there's no honest default for it;
 * - a **balance or contribution** that's missing or unusable becomes 0, which
 *   is what "not provided" actually means for money;
 * - any other field that isn't a finite number is dropped, letting the
 *   engine's own default apply.
 */
export function sanitisePlanInput(parsed: unknown): FireInputs | null {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const source = parsed as Record<string, unknown>;

  for (const key of ESSENTIAL_FIELDS) {
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
  for (const key of ZERO_FILLED_FIELDS) {
    if (typeof clean[key] !== "number") clean[key] = 0;
  }
  for (const key of HOLDINGS_FIELDS) {
    const holdings = sanitiseHoldings(source[key]);
    if (holdings) clean[key] = holdings;
    else delete clean[key];
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
