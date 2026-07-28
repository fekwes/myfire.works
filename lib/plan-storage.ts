import { type Holding, isAssetClass } from "./assets";
import type { FireInputs } from "./fire-engine";

/**
 * localStorage key used to hand a plan from the onboarding quiz (`/start`) to
 * the planner (`/planner`). Kept as a single stringified `FireInputs`.
 */
export const PLAN_STORAGE_KEY = "onfire:plan";

export function getActiveRegionLocal(): "uk" | "es" | "us" {
  if (typeof window === "undefined") return "uk";
  
  const saved = window.localStorage.getItem("onfire:region");
  if (saved === "uk" || saved === "es" || saved === "us") return saved;
  
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.country === "us" || parsed.country === "es") {
        window.localStorage.setItem("onfire:region", parsed.country);
        return parsed.country;
      }
    }
  } catch {}
  
  // Use timezone inference as a fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.startsWith("America/")) {
      window.localStorage.setItem("onfire:region", "us");
      return "us";
    }
    if (tz && (tz.startsWith("Europe/Madrid") || tz.startsWith("Atlantic/Canary"))) {
      window.localStorage.setItem("onfire:region", "es");
      return "es";
    }
  } catch {}

  window.localStorage.setItem("onfire:region", "uk");
  return "uk";
}

export function setActiveRegionLocal(region: "uk" | "es" | "us"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("onfire:region", region);
}

/** Persist an assembled plan so the planner can pick it up. Safe on the server. */
export function savePlanLocal(region: "uk" | "es" | "us", inputs: FireInputs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PLAN_STORAGE_KEY}:${region}`, JSON.stringify(inputs));
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

/**
 * Plausible ranges for every numeric field, by kind.
 *
 * Finiteness alone is not enough. The engine walks one year at a time from
 * `currentAge` to `lifeExpectancyAge`, building an object per year, so a plan
 * saying "live to 5,000,000" is a finite, valid-looking number that allocates
 * five million objects and takes the tab down with it. Since plans arrive in
 * shareable `?p=` links, that is a link someone can craft and send to another
 * person — so the range check belongs here, next to the finiteness check, in
 * the one validator that guards links, localStorage and saved rows alike.
 *
 * These are deliberately generous. The point is to bound the work, not to
 * second-guess someone's figures.
 */
const AGE_MAX = 120;
/** £1 trillion. Absurd as a balance, but the projection stays bounded. */
const MONEY_MAX = 1e12;
/** Growth and inflation as decimal fractions: -90% to +100% a year. */
const RATE_MIN = -0.9;
const RATE_MAX = 1;

const AGE_FIELDS = [
  "currentAge",
  "retirementAge",
  "statePensionAge",
  "sippAccessAge",
  "lifeExpectancyAge",
  "rentalSaleAge",
  "partTimeUntilAge",
  "downsizeAge",
  "contributionsUntilAge",
] as const;

const MONEY_FIELDS = [
  "targetAnnualIncome",
  "isaBalance",
  "isaMonthlyContribution",
  "sippBalance",
  "sippMonthlyContribution",
  "giaBalance",
  "giaMonthlyContribution",
  "rentalValue",
  "rentalMonthlyIncome",
  "homeValue",
  "partTimeAnnualIncome",
  "statePensionAnnual",
] as const;

const RATE_FIELDS = [
  "inflationRate",
  "growthRate",
  "isaGrowth",
  "giaGrowth",
  "sippGrowth",
  "rentalGrowth",
  "homeGrowth",
] as const;

const FRACTION_FIELDS = ["downsizeReleaseFraction"] as const;

const clamp = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value));

/** Clamp every numeric field to its kind's range, in place on `clean`. */
function clampRanges(clean: Record<string, unknown>): void {
  const apply = (
    keys: readonly string[],
    lo: number,
    hi: number,
    round = false,
  ) => {
    for (const key of keys) {
      const value = clean[key];
      if (typeof value !== "number") continue;
      const bounded = clamp(value, lo, hi);
      clean[key] = round ? Math.round(bounded) : bounded;
    }
  };
  apply(AGE_FIELDS, 0, AGE_MAX, true);
  apply(MONEY_FIELDS, 0, MONEY_MAX);
  apply(RATE_FIELDS, RATE_MIN, RATE_MAX);
  apply(FRACTION_FIELDS, 0, 1);
}

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
    if (!isAssetClass(h.assetClass)) continue;
    const holding: Holding = {
      assetClass: h.assetClass,
      // Bounded, not just finite: a holding claiming a 500% fee would drive the
      // wrapper's derived growth deeply negative, and a weight of 1e308
      // dominates every other holding to the point of erasing them.
      ocf:
        typeof h.ocf === "number" && Number.isFinite(h.ocf)
          ? clamp(h.ocf, 0, 0.1)
          : 0,
      weight:
        typeof h.weight === "number" && Number.isFinite(h.weight) && h.weight >= 0
          ? Math.min(h.weight, 1e6)
          : 0,
    };
    if (typeof h.fundId === "string") holding.fundId = h.fundId.slice(0, 100);
    if (typeof h.label === "string") holding.label = h.label.slice(0, 120);
    if (typeof h.expectedReturn === "number" && Number.isFinite(h.expectedReturn)) {
      holding.expectedReturn = clamp(h.expectedReturn, RATE_MIN, RATE_MAX);
    }
    clean.push(holding);
    // A statement has tens of holdings, not thousands; the cap keeps a crafted
    // link from making the wrapper's growth calculation the slow part.
    if (clean.length >= 100) break;
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
  if (typeof source.country === "string" && (source.country === "uk" || source.country === "es" || source.country === "us")) {
    clean.country = source.country;
  }
  if (typeof source.pots === "object" && source.pots !== null) {
    const safePots: NonNullable<FireInputs["pots"]> = {};
    for (const [potId, pot] of Object.entries(source.pots)) {
      if (typeof pot === "object" && pot !== null) {
        safePots[potId] = {
          balance: typeof pot.balance === "number" ? pot.balance : 0,
          monthlyContribution: typeof pot.monthlyContribution === "number" ? pot.monthlyContribution : 0,
          growth: typeof pot.growth === "number" ? pot.growth : 0.05,
        };
        const holdings = sanitiseHoldings(pot.holdings);
        if (holdings) safePots[potId].holdings = holdings;
      }
    }
    clean.pots = safePots;
  }
  clampRanges(clean);
  return clean as unknown as FireInputs;
}

/** Read a previously-saved plan, or `null` if none/invalid. Safe on the server. */
export function loadPlanLocal(region: "uk" | "es" | "us"): FireInputs | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = window.localStorage.getItem(`${PLAN_STORAGE_KEY}:${region}`);
    
    // Migration: if the region-specific key doesn't exist, try the legacy key
    if (!raw) {
      const legacyRaw = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        const legacyRegion = parsed.country === "us" ? "us" : parsed.country === "es" ? "es" : "uk";
        if (legacyRegion === region) {
          raw = legacyRaw;
          // Clean up by saving to the new key and optionally deleting the old one
          window.localStorage.setItem(`${PLAN_STORAGE_KEY}:${region}`, legacyRaw);
          window.localStorage.removeItem(PLAN_STORAGE_KEY);
        }
      }
    }

    if (!raw) return null;
    return sanitisePlanInput(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Forget any stored plan. Safe on the server. */
export function clearPlanLocal(region?: "uk" | "es" | "us"): void {
  if (typeof window === "undefined") return;
  try {
    if (region) {
      window.localStorage.removeItem(`${PLAN_STORAGE_KEY}:${region}`);
    } else {
      window.localStorage.removeItem(`${PLAN_STORAGE_KEY}:uk`);
      window.localStorage.removeItem(`${PLAN_STORAGE_KEY}:es`);
      window.localStorage.removeItem(`${PLAN_STORAGE_KEY}:us`);
      window.localStorage.removeItem(PLAN_STORAGE_KEY);
      window.localStorage.removeItem("onfire:region");
    }
  } catch {
    // no-op
  }
}
