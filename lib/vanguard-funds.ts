import { type FireInputs, simulateFire } from "./fire-engine";

/**
 * Vanguard UK Personal Investor platform (account) fee, 2026.
 * 0.15%/yr on the first £250,000, capped at £375/yr, with a £4/month
 * (£48/yr) minimum for total holdings under ~£32,000 (0.15% of £32k = £48).
 * Junior/Managed ISAs are exempt — not modelled here.
 * Verified: vanguardinvestor.co.uk/what-we-offer/fees-explained (2026).
 */
export const PLATFORM_FEE_RATE = 0.0015;
export const PLATFORM_FEE_CAP = 375;
export const PLATFORM_FEE_FLOOR = 48; // £4/month

/** The actual £ platform fee for a given total balance (floor + cap applied). */
export function platformFeeForBalance(totalBalance: number): number {
  if (totalBalance <= 0) return 0;
  return Math.min(PLATFORM_FEE_CAP, Math.max(PLATFORM_FEE_FLOOR, totalBalance * PLATFORM_FEE_RATE));
}

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
 * fees. These are planning assumptions for the projection — not Vanguard
 * forecasts — chosen to be sober rather than optimistic.
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

/** Neutral fallback for a wrapper on a custom (unmatched) growth rate. */
const DEFAULT_MIX = { equity: 0.8, bonds: 0.2, cash: 0 };

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  "global-equity": "Global equity",
  "us-equity": "US equity",
  "multi-asset-100": "Multi-asset · 100% equity",
  "multi-asset-80": "Multi-asset · 80% equity",
  "multi-asset-60": "Multi-asset · 60% equity",
  "global-bonds": "Global bonds",
  cash: "Cash / money market",
};

export interface VanguardFund {
  id: string;
  name: string;
  /** Exchange ticker for ETFs. */
  ticker?: string;
  type: "OEIC" | "ETF";
  /** Ongoing Charges Figure, as a fraction (0.0023 = 0.23%). */
  ocf: number;
  assetClass: AssetClass;
  blurb: string;
}

/**
 * A curated set of popular Vanguard UK funds. OCFs are the published figures
 * as of July 2026 (verified against Vanguard's fund pages) and are indicative
 * — always confirm the current OCF on Vanguard's site before investing.
 */
export const VANGUARD_FUNDS: VanguardFund[] = [
  {
    id: "global-all-cap",
    name: "FTSE Global All Cap Index Fund (Acc)",
    type: "OEIC",
    ocf: 0.0023,
    assetClass: "global-equity",
    blurb: "~7,000 companies across developed and emerging markets, including small caps.",
  },
  {
    id: "vwrp",
    name: "FTSE All-World UCITS ETF (Acc)",
    ticker: "VWRP",
    type: "ETF",
    ocf: 0.0014,
    assetClass: "global-equity",
    blurb: "The all-in-one global tracker — fee cut to 0.14% from 28 Jul 2026.",
  },
  {
    id: "vuag",
    name: "S&P 500 UCITS ETF (Acc)",
    ticker: "VUAG",
    type: "ETF",
    ocf: 0.0007,
    assetClass: "us-equity",
    blurb: "The 500 largest US companies — one of the cheapest trackers anywhere.",
  },
  {
    id: "us-equity-index",
    name: "U.S. Equity Index Fund (Acc)",
    type: "OEIC",
    ocf: 0.001,
    assetClass: "us-equity",
    blurb: "Broad US market as a fund rather than an ETF (no live pricing needed).",
  },
  {
    id: "lifestrategy-100",
    name: "LifeStrategy 100% Equity Fund (Acc)",
    type: "OEIC",
    ocf: 0.0022,
    assetClass: "multi-asset-100",
    blurb: "Fully diversified all-equity fund, automatically rebalanced.",
  },
  {
    id: "lifestrategy-80",
    name: "LifeStrategy 80% Equity Fund (Acc)",
    type: "OEIC",
    ocf: 0.0022,
    assetClass: "multi-asset-80",
    blurb: "80% shares / 20% bonds — a touch smoother than all-equity.",
  },
  {
    id: "lifestrategy-60",
    name: "LifeStrategy 60% Equity Fund (Acc)",
    type: "OEIC",
    ocf: 0.0022,
    assetClass: "multi-asset-60",
    blurb: "60% shares / 40% bonds — a common pick nearer to drawdown.",
  },
  {
    id: "global-bond-hedged",
    name: "Global Aggregate Bond UCITS ETF (£-Hedged, Acc)",
    ticker: "VAGP",
    type: "ETF",
    ocf: 0.001,
    assetClass: "global-bonds",
    blurb: "Investment-grade global bonds, hedged to sterling to damp currency swings.",
  },
  {
    id: "sterling-mmf",
    name: "Sterling Short-Term Money Market Fund (Acc)",
    type: "OEIC",
    ocf: 0.0012,
    assetClass: "cash",
    blurb: "A cash-like holding — useful as a drawdown buffer against bad markets.",
  },
];

export const FUND_BY_ID: Record<string, VanguardFund> = Object.fromEntries(
  VANGUARD_FUNDS.map((f) => [f.id, f]),
);

/** Gross expected return for a fund, from its asset class. */
export function grossReturn(fund: VanguardFund): number {
  return ASSET_CLASS_RETURN[fund.assetClass];
}

/**
 * The net growth rate a wrapper earns holding this fund: gross expected
 * return minus the fund's OCF and the platform fee. The platform fee is
 * modelled at its 0.15% headline rate (it's actually capped at £375/yr, so
 * large pots pay a lower effective rate — a conservative simplification).
 */
export function netGrowth(fund: VanguardFund): number {
  return grossReturn(fund) - fund.ocf - PLATFORM_FEE_RATE;
}

/**
 * Best-effort reverse lookup: which preset fund produces this net growth rate.
 * Lets the picker re-highlight a saved choice without persisting the fund id.
 * Returns null when the growth was set manually (no preset matches).
 */
export function fundForGrowth(growth: number | undefined): VanguardFund | null {
  if (growth === undefined) return null;
  return (
    VANGUARD_FUNDS.find((f) => Math.abs(netGrowth(f) - growth) < 1e-6) ?? null
  );
}

/**
 * Balance-weighted equity / bonds / cash split of the invested pots (ISA +
 * GIA + SIPP), inferred from each wrapper's chosen fund. Wrappers on a custom
 * growth rate use a neutral 80/20 default. Falls back to that default when
 * nothing is invested yet. This is what lets the risk analysis reflect the
 * portfolio you actually built rather than a fixed guess.
 */
export function portfolioAllocation(inputs: FireInputs): {
  equity: number;
  bonds: number;
  cash: number;
} {
  const wrappers: { balance: number; growth: number | undefined }[] = [
    { balance: inputs.isaBalance, growth: inputs.isaGrowth },
    { balance: inputs.giaBalance ?? 0, growth: inputs.giaGrowth },
    { balance: inputs.sippBalance, growth: inputs.sippGrowth },
  ];
  const total = wrappers.reduce((sum, w) => sum + Math.max(0, w.balance), 0);
  if (total <= 0) return { ...DEFAULT_MIX };

  const acc = { equity: 0, bonds: 0, cash: 0 };
  for (const w of wrappers) {
    const weight = Math.max(0, w.balance) / total;
    if (weight === 0) continue;
    const fund = fundForGrowth(w.growth);
    const mix = fund ? ASSET_CLASS_MIX[fund.assetClass] : DEFAULT_MIX;
    acc.equity += mix.equity * weight;
    acc.bonds += mix.bonds * weight;
    acc.cash += mix.cash * weight;
  }
  return acc;
}

/** Portfolio-weighted equity fraction (0–1) — the Monte Carlo's key input. */
export function portfolioEquityFraction(inputs: FireInputs): number {
  return portfolioAllocation(inputs).equity;
}

/**
 * Estimated total £ lost to fund OCFs + platform fees over the whole plan.
 * Re-runs the projection with fees added back (a zero-fee counterfactual) and
 * reports the shortfall in the pot at retirement — the clearest single number
 * for "what fees cost you". Uses each wrapper's matched fund OCF where known,
 * or the platform fee alone for manually-set growth.
 */
export function estimateFeeDrag(inputs: FireInputs): number {
  const feeFor = (growth: number | undefined) => {
    const fund = fundForGrowth(growth);
    return (fund ? fund.ocf : 0) + PLATFORM_FEE_RATE;
  };

  const gross: FireInputs = {
    ...inputs,
    isaGrowth: (inputs.isaGrowth ?? 0) + feeFor(inputs.isaGrowth),
    giaGrowth: (inputs.giaGrowth ?? 0) + feeFor(inputs.giaGrowth),
    sippGrowth: (inputs.sippGrowth ?? 0) + feeFor(inputs.sippGrowth),
  };

  const potAtRetirement = (result: ReturnType<typeof simulateFire>) => {
    const r = result.inputs.retirementAge;
    // Last accumulation snapshot is the peak investable pot.
    const snap =
      [...result.timeline].reverse().find((y) => y.age < r) ??
      result.timeline[result.timeline.length - 1];
    return snap.isaBalanceEnd + snap.giaBalanceEnd + snap.sippBalanceEnd;
  };

  const withFees = potAtRetirement(simulateFire(inputs));
  const withoutFees = potAtRetirement(simulateFire(gross));
  return Math.max(0, withoutFees - withFees);
}
