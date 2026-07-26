// Asset-class return/fee assumptions + the per-holding portfolio model.
//
// This is a dependency-free base module: both the engine (`lib/fire-engine.ts`)
// and the fund catalogue (`lib/vanguard-funds.ts`) import from it, so the
// shared types and the return table live here to avoid an import cycle
// (vanguard-funds already imports the engine).

export type AssetClass =
  | "global-equity"
  | "us-equity"
  | "multi-asset-100"
  | "multi-asset-80"
  | "multi-asset-60"
  | "global-bonds"
  | "cash";

/**
 * Illustrative long-run *nominal* gross returns by asset class, before any
 * fees. Planning assumptions for the projection — not forecasts — chosen to be
 * sober rather than optimistic.
 */
export const ASSET_CLASS_RETURN: Record<AssetClass, number> = {
  "global-equity": 0.07,
  "us-equity": 0.07,
  "multi-asset-100": 0.07,
  "multi-asset-80": 0.062,
  "multi-asset-60": 0.054,
  "global-bonds": 0.04,
  cash: 0.035,
};

/** How each asset class splits across equity / bonds / cash (sums to 1). */
export const ASSET_CLASS_MIX: Record<
  AssetClass,
  { equity: number; bonds: number; cash: number }
> = {
  "global-equity": { equity: 1, bonds: 0, cash: 0 },
  "us-equity": { equity: 1, bonds: 0, cash: 0 },
  "multi-asset-100": { equity: 1, bonds: 0, cash: 0 },
  "multi-asset-80": { equity: 0.8, bonds: 0.2, cash: 0 },
  "multi-asset-60": { equity: 0.6, bonds: 0.4, cash: 0 },
  "global-bonds": { equity: 0, bonds: 1, cash: 0 },
  cash: { equity: 0, bonds: 0, cash: 1 },
};

/** Neutral fallback mix for a wrapper on a custom (unmatched) growth rate. */
export const DEFAULT_MIX = { equity: 0.8, bonds: 0.2, cash: 0 };

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  "global-equity": "Global equity",
  "us-equity": "US equity",
  "multi-asset-100": "Multi-asset · 100% equity",
  "multi-asset-80": "Multi-asset · 80% equity",
  "multi-asset-60": "Multi-asset · 60% equity",
  "global-bonds": "Global bonds",
  cash: "Cash / money market",
};

/** Broad category, used to group the catalogue in the picker. */
export type FundCategory = "equity" | "hybrid" | "bonds" | "cash";

export const ASSET_CLASS_CATEGORY: Record<AssetClass, FundCategory> = {
  "global-equity": "equity",
  "us-equity": "equity",
  "multi-asset-100": "hybrid",
  "multi-asset-80": "hybrid",
  "multi-asset-60": "hybrid",
  "global-bonds": "bonds",
  cash: "cash",
};

export const FUND_CATEGORY_LABEL: Record<FundCategory, string> = {
  equity: "Equity funds",
  hybrid: "Hybrid / multi-asset",
  bonds: "Bond funds",
  cash: "Cash / money market",
};

/**
 * UK investor-platform fee, headline 0.15%/yr on the first £250,000, with a
 * £4/month (£48/yr) minimum and a £375/yr cap. Modelled at its headline rate
 * for growth (a conservative simplification — big pots pay a lower effective
 * rate under the cap).
 */
export const PLATFORM_FEE_RATE = 0.0015;
export const PLATFORM_FEE_CAP = 375;
export const PLATFORM_FEE_FLOOR = 48; // £4/month

/** The actual £ platform fee for a given total balance (floor + cap applied). */
export function platformFeeForBalance(totalBalance: number): number {
  if (totalBalance <= 0) return 0;
  return Math.min(
    PLATFORM_FEE_CAP,
    Math.max(PLATFORM_FEE_FLOOR, totalBalance * PLATFORM_FEE_RATE),
  );
}

/**
 * One line of a wrapper's portfolio. A wrapper (ISA/GIA/SIPP) holds one or more
 * of these; `weight` is its share of the wrapper (0–1, summing to ~1 across the
 * wrapper). `fundId` points at the catalogue; a custom holding leaves it unset
 * and carries its own `label`, `assetClass`, `ocf` and optional `expectedReturn`.
 */
export interface Holding {
  fundId?: string;
  label?: string;
  assetClass: AssetClass;
  /** Ongoing Charges Figure as a fraction (0.0022 = 0.22%). */
  ocf: number;
  /** Optional custom expected *gross* return (fraction); overrides the class. */
  expectedReturn?: number;
  /** Share of the wrapper, 0–1. */
  weight: number;
}

/** A holding's gross expected return — its custom value or its class default. */
export function holdingReturn(h: Holding): number {
  return h.expectedReturn ?? ASSET_CLASS_RETURN[h.assetClass];
}

/** A holding's net growth: gross return minus its OCF and the platform fee. */
export function holdingNetGrowth(h: Holding): number {
  return holdingReturn(h) - h.ocf - PLATFORM_FEE_RATE;
}

/**
 * Weights normalised to sum to 1. Falls back to equal weights when the given
 * weights don't sum to a usable positive number, so a half-filled editor never
 * produces a nonsensical growth rate.
 */
function normalisedWeights(holdings: Holding[]): number[] {
  const raw = holdings.map((h) => (h.weight > 0 ? h.weight : 0));
  const total = raw.reduce((s, w) => s + w, 0);
  if (total <= 0) return holdings.map(() => 1 / holdings.length);
  return raw.map((w) => w / total);
}

/** The balance-weighted net growth a wrapper earns from its holdings. */
export function holdingsNetGrowth(holdings: Holding[]): number {
  if (holdings.length === 0) return 0;
  const weights = normalisedWeights(holdings);
  return holdings.reduce(
    (sum, h, i) => sum + weights[i] * holdingNetGrowth(h),
    0,
  );
}

/** The equity / bonds / cash split implied by a wrapper's holdings. */
export function holdingsAllocation(holdings: Holding[]): {
  equity: number;
  bonds: number;
  cash: number;
} {
  if (holdings.length === 0) return { ...DEFAULT_MIX };
  const weights = normalisedWeights(holdings);
  const acc = { equity: 0, bonds: 0, cash: 0 };
  holdings.forEach((h, i) => {
    const mix = ASSET_CLASS_MIX[h.assetClass];
    acc.equity += mix.equity * weights[i];
    acc.bonds += mix.bonds * weights[i];
    acc.cash += mix.cash * weights[i];
  });
  return acc;
}
