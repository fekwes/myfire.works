import {
  type AssetClass,
  ASSET_CLASS_CATEGORY,
  ASSET_CLASS_RETURN,
  DEFAULT_MIX,
  type FundCategory,
  type Holding,
  holdingsAllocation,
  holdingsNetGrowth,
  PLATFORM_FEE_RATE,
} from "./assets";
import {
  DEFAULT_ASSUMPTIONS,
  type FireInputs,
  simulateFire,
} from "./fire-engine";

// Re-export the shared asset-class/fee model so existing importers of this
// module keep working after the move to `./assets`.
export type { AssetClass, FundCategory, Holding };
export {
  ASSET_CLASS_LABEL,
  ASSET_CLASS_MIX,
  ASSET_CLASS_RETURN,
  FUND_CATEGORY_LABEL,
  holdingNetGrowth,
  holdingsAllocation,
  holdingsNetGrowth,
  PLATFORM_FEE_CAP,
  PLATFORM_FEE_FLOOR,
  PLATFORM_FEE_RATE,
  platformFeeForBalance,
} from "./assets";

export interface Fund {
  id: string;
  name: string;
  provider: string;
  /** Exchange ticker for ETFs. */
  ticker?: string;
  type: "OEIC" | "ETF";
  /** Ongoing Charges Figure, as a fraction (0.0023 = 0.23%). */
  ocf: number;
  assetClass: AssetClass;
  blurb: string;
}

/**
 * A curated set of ~40 funds popular with UK FIRE investors, across the main
 * platforms. OCFs are indicative figures as of mid-2026 — always confirm the
 * current OCF on the provider's site before investing. Expected returns are NOT
 * per-fund data; they come from each fund's `assetClass` (see ASSET_CLASS_RETURN
 * in ./assets), so this list only needs the class + fee to be roughly right.
 */
export const FUNDS: Fund[] = [
  // ── Global equity ────────────────────────────────────────────────────────
  {
    id: "global-all-cap",
    name: "FTSE Global All Cap Index Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0023,
    assetClass: "global-equity",
    blurb: "~7,000 companies across developed and emerging markets, inc. small caps.",
  },
  {
    id: "vwrp",
    name: "FTSE All-World UCITS ETF (Acc)",
    provider: "Vanguard",
    ticker: "VWRP",
    type: "ETF",
    ocf: 0.0014,
    assetClass: "global-equity",
    blurb: "The all-in-one global tracker in ETF form.",
  },
  {
    id: "vwrl",
    name: "FTSE All-World UCITS ETF (Dist)",
    provider: "Vanguard",
    ticker: "VWRL",
    type: "ETF",
    ocf: 0.0022,
    assetClass: "global-equity",
    blurb: "Distributing version of the all-world tracker — pays dividends out.",
  },
  {
    id: "vhvg",
    name: "FTSE Developed World UCITS ETF (Acc)",
    provider: "Vanguard",
    ticker: "VHVG",
    type: "ETF",
    ocf: 0.0012,
    assetClass: "global-equity",
    blurb: "Developed markets only (no emerging), at a lower fee.",
  },
  {
    id: "veve",
    name: "FTSE Developed World UCITS ETF (Dist)",
    provider: "Vanguard",
    ticker: "VEVE",
    type: "ETF",
    ocf: 0.0012,
    assetClass: "global-equity",
    blurb: "Distributing developed-world tracker.",
  },
  {
    id: "hsbc-ftse-all-world",
    name: "FTSE All-World Index Fund (Acc)",
    provider: "HSBC",
    type: "OEIC",
    ocf: 0.0013,
    assetClass: "global-equity",
    blurb: "One of the cheapest all-world index funds on the market.",
  },
  {
    id: "fidelity-index-world",
    name: "Index World Fund (Acc)",
    provider: "Fidelity",
    type: "OEIC",
    ocf: 0.0012,
    assetClass: "global-equity",
    blurb: "Developed-world tracker, a common low-cost core.",
  },
  {
    id: "lgim-international",
    name: "International Index Trust (Acc)",
    provider: "L&G",
    type: "OEIC",
    ocf: 0.0013,
    assetClass: "global-equity",
    blurb: "Developed markets excluding the UK.",
  },
  {
    id: "lgim-global-100",
    name: "Global 100 Index Trust (Acc)",
    provider: "L&G",
    type: "OEIC",
    ocf: 0.0014,
    assetClass: "global-equity",
    blurb: "The 100 largest global companies — concentrated mega-caps.",
  },
  {
    id: "swda",
    name: "Core MSCI World UCITS ETF (Acc)",
    provider: "iShares",
    ticker: "SWDA",
    type: "ETF",
    ocf: 0.002,
    assetClass: "global-equity",
    blurb: "The default developed-world ETF for many UK investors.",
  },
  {
    id: "swld",
    name: "MSCI World UCITS ETF (Acc)",
    provider: "SPDR",
    ticker: "SWLD",
    type: "ETF",
    ocf: 0.0012,
    assetClass: "global-equity",
    blurb: "A cheaper developed-world alternative to SWDA.",
  },
  {
    id: "vanguard-esg-global",
    name: "ESG Global All Cap UCITS ETF (Acc)",
    provider: "Vanguard",
    ticker: "V3AB",
    type: "ETF",
    ocf: 0.0024,
    assetClass: "global-equity",
    blurb: "All-world with ESG screens applied.",
  },
  {
    id: "vanguard-emerging",
    name: "FTSE Emerging Markets UCITS ETF (Acc)",
    provider: "Vanguard",
    ticker: "VFEG",
    type: "ETF",
    ocf: 0.0022,
    assetClass: "global-equity",
    blurb: "Emerging markets only — a satellite, not a core holding.",
  },
  {
    id: "vanguard-global-smallcap",
    name: "Global Small-Cap Index Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0029,
    assetClass: "global-equity",
    blurb: "Smaller companies worldwide — a higher-volatility tilt.",
  },
  // ── US equity ────────────────────────────────────────────────────────────
  {
    id: "vuag",
    name: "S&P 500 UCITS ETF (Acc)",
    provider: "Vanguard",
    ticker: "VUAG",
    type: "ETF",
    ocf: 0.0007,
    assetClass: "us-equity",
    blurb: "The 500 largest US companies — one of the cheapest anywhere.",
  },
  {
    id: "vusa",
    name: "S&P 500 UCITS ETF (Dist)",
    provider: "Vanguard",
    ticker: "VUSA",
    type: "ETF",
    ocf: 0.0007,
    assetClass: "us-equity",
    blurb: "Distributing S&P 500 tracker.",
  },
  {
    id: "us-equity-index",
    name: "U.S. Equity Index Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.001,
    assetClass: "us-equity",
    blurb: "Broad US market as a fund rather than an ETF.",
  },
  {
    id: "cspx",
    name: "Core S&P 500 UCITS ETF (Acc)",
    provider: "iShares",
    ticker: "CSPX",
    type: "ETF",
    ocf: 0.0007,
    assetClass: "us-equity",
    blurb: "The most-traded S&P 500 ETF in the UK.",
  },
  {
    id: "spxp",
    name: "S&P 500 UCITS ETF (Acc)",
    provider: "Invesco",
    ticker: "SPXP",
    type: "ETF",
    ocf: 0.0005,
    assetClass: "us-equity",
    blurb: "A synthetic S&P 500 tracker — the lowest headline fee.",
  },
  {
    id: "fidelity-index-us",
    name: "Index US Fund (Acc)",
    provider: "Fidelity",
    type: "OEIC",
    ocf: 0.0006,
    assetClass: "us-equity",
    blurb: "Cheap US tracker in OEIC form.",
  },
  {
    id: "hsbc-american",
    name: "American Index Fund (Acc)",
    provider: "HSBC",
    type: "OEIC",
    ocf: 0.0006,
    assetClass: "us-equity",
    blurb: "Long-standing low-cost US index fund.",
  },
  // ── Hybrid / multi-asset ─────────────────────────────────────────────────
  {
    id: "lifestrategy-100",
    name: "LifeStrategy 100% Equity Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0022,
    assetClass: "multi-asset-100",
    blurb: "Fully diversified all-equity fund, automatically rebalanced.",
  },
  {
    id: "lifestrategy-80",
    name: "LifeStrategy 80% Equity Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0022,
    assetClass: "multi-asset-80",
    blurb: "80% shares / 20% bonds — a touch smoother than all-equity.",
  },
  {
    id: "lifestrategy-60",
    name: "LifeStrategy 60% Equity Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0022,
    assetClass: "multi-asset-60",
    blurb: "60% shares / 40% bonds — a common pick nearer to drawdown.",
  },
  {
    id: "hsbc-global-dynamic",
    name: "Global Strategy Dynamic Portfolio (Acc)",
    provider: "HSBC",
    type: "OEIC",
    ocf: 0.0019,
    assetClass: "multi-asset-80",
    blurb: "~80% equity multi-asset, all-in-one and rebalanced.",
  },
  {
    id: "hsbc-global-balanced",
    name: "Global Strategy Balanced Portfolio (Acc)",
    provider: "HSBC",
    type: "OEIC",
    ocf: 0.0018,
    assetClass: "multi-asset-60",
    blurb: "~60% equity multi-asset — a lower-cost LifeStrategy rival.",
  },
  {
    id: "vanguard-target-2045",
    name: "Target Retirement 2045 Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0024,
    assetClass: "multi-asset-80",
    blurb: "Glide-path fund that de-risks automatically towards a 2045 retirement.",
  },
  {
    id: "vanguard-target-2035",
    name: "Target Retirement 2035 Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0024,
    assetClass: "multi-asset-60",
    blurb: "Glide-path fund aimed at a 2035 retirement — more bonds already.",
  },
  {
    id: "blackrock-mymap-6",
    name: "MyMap 6 Fund (Acc)",
    provider: "BlackRock",
    type: "OEIC",
    ocf: 0.0017,
    assetClass: "multi-asset-80",
    blurb: "Low-cost higher-risk multi-asset, risk-targeted and rebalanced.",
  },
  // ── Bonds ────────────────────────────────────────────────────────────────
  {
    id: "global-bond-hedged",
    name: "Global Aggregate Bond UCITS ETF (£-Hedged, Acc)",
    provider: "Vanguard",
    ticker: "VAGP",
    type: "ETF",
    ocf: 0.001,
    assetClass: "global-bonds",
    blurb: "Investment-grade global bonds, hedged to sterling.",
  },
  {
    id: "vanguard-global-bond-index",
    name: "Global Bond Index Fund (£-Hedged, Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0015,
    assetClass: "global-bonds",
    blurb: "The fund version of the global aggregate bond tracker.",
  },
  {
    id: "aggg",
    name: "Core Global Aggregate Bond UCITS ETF (£-Hedged)",
    provider: "iShares",
    ticker: "AGGG",
    type: "ETF",
    ocf: 0.001,
    assetClass: "global-bonds",
    blurb: "Broad global investment-grade bonds.",
  },
  {
    id: "vgov",
    name: "U.K. Gilt UCITS ETF (Dist)",
    provider: "Vanguard",
    ticker: "VGOV",
    type: "ETF",
    ocf: 0.0007,
    assetClass: "global-bonds",
    blurb: "UK government bonds (gilts) — the domestic safe-haven leg.",
  },
  {
    id: "vanguard-uk-ig",
    name: "U.K. Investment Grade Bond Index Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0012,
    assetClass: "global-bonds",
    blurb: "Sterling investment-grade corporate + government bonds.",
  },
  // ── Cash / money market ──────────────────────────────────────────────────
  {
    id: "sterling-mmf",
    name: "Sterling Short-Term Money Market Fund (Acc)",
    provider: "Vanguard",
    type: "OEIC",
    ocf: 0.0012,
    assetClass: "cash",
    blurb: "A cash-like holding — useful as a drawdown buffer.",
  },
  {
    id: "royal-london-stmm",
    name: "Short Term Money Market Fund (Acc)",
    provider: "Royal London",
    type: "OEIC",
    ocf: 0.001,
    assetClass: "cash",
    blurb: "Popular sterling money-market fund tracking short-term rates.",
  },
  {
    id: "blackrock-icash",
    name: "ICS Sterling Liquidity Fund",
    provider: "BlackRock",
    type: "OEIC",
    ocf: 0.0012,
    assetClass: "cash",
    blurb: "Institutional-style sterling liquidity — cash management.",
  },
];

export const FUND_BY_ID: Record<string, Fund> = Object.fromEntries(
  FUNDS.map((f) => [f.id, f]),
);

/** The picker category for a fund, from its asset class. */
export function fundCategory(fund: Fund): FundCategory {
  return ASSET_CLASS_CATEGORY[fund.assetClass];
}

/** Gross expected return for a fund, from its asset class. */
export function grossReturn(fund: Fund): number {
  return ASSET_CLASS_RETURN[fund.assetClass];
}

/**
 * The net growth rate a wrapper earns holding this fund alone: gross expected
 * return minus the fund's OCF and the platform fee.
 */
export function netGrowth(fund: Fund): number {
  return grossReturn(fund) - fund.ocf - PLATFORM_FEE_RATE;
}

/** Turn a catalogue fund into a portfolio holding at the given weight. */
export function fundToHolding(fund: Fund, weight: number): Holding {
  return {
    fundId: fund.id,
    assetClass: fund.assetClass,
    ocf: fund.ocf,
    weight,
  };
}

type WrapperView = {
  balance: number;
  holdings?: Holding[];
};

function wrapperViews(inputs: FireInputs): WrapperView[] {
  return [
    { balance: (inputs.pots?.isa?.balance ?? inputs.isaBalance ?? 0), holdings: (inputs.pots?.isa?.holdings ?? inputs.isaHoldings ?? []) },
    { balance: (inputs.pots?.gia?.balance ?? inputs.giaBalance ?? 0) ?? 0, holdings: (inputs.pots?.gia?.holdings ?? inputs.giaHoldings ?? []) },
    { balance: (inputs.pots?.sipp?.balance ?? inputs.sippBalance ?? 0), holdings: (inputs.pots?.sipp?.holdings ?? inputs.sippHoldings ?? []) },
  ];
}

/**
 * Balance-weighted equity / bonds / cash split of the invested pots (ISA + GIA
 * + SIPP), from each wrapper's holdings. A wrapper with no portfolio (a plain
 * growth rate) uses a neutral 80/20; nothing invested falls back to the same.
 */
export function portfolioAllocation(inputs: FireInputs): {
  equity: number;
  bonds: number;
  cash: number;
} {
  const wrappers = wrapperViews(inputs);
  const total = wrappers.reduce((sum, w) => sum + Math.max(0, w.balance), 0);
  if (total <= 0) return { ...DEFAULT_MIX };

  const acc = { equity: 0, bonds: 0, cash: 0 };
  for (const w of wrappers) {
    const weight = Math.max(0, w.balance) / total;
    if (weight === 0) continue;
    const mix =
      w.holdings && w.holdings.length > 0
        ? holdingsAllocation(w.holdings)
        : DEFAULT_MIX;
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

/** The weighted OCF a wrapper's holdings pay, or 0 for a plain-growth wrapper
 *  (whose figure already nets fees out). */
function wrapperOcf(w: WrapperView): number {
  if (!w.holdings || w.holdings.length === 0) return 0;
  const total = w.holdings.reduce((s, h) => s + Math.max(0, h.weight), 0);
  if (total <= 0) return 0;
  return w.holdings.reduce(
    (s, h) => s + (Math.max(0, h.weight) / total) * h.ocf,
    0,
  );
}

/**
 * Estimated total £ lost to fund OCFs + platform fees over the whole plan.
 * Re-runs the projection with fees added back (a zero-fee counterfactual) and
 * reports the shortfall in the pot at retirement — the clearest single number
 * for "what fees cost you".
 */
export function estimateFeeDrag(inputs: FireInputs): number {
  if (inputs.currentAge >= inputs.retirementAge) return 0;
  const fallback = inputs.growthRate ?? DEFAULT_ASSUMPTIONS.growthRate;
  const wrappers = wrapperViews(inputs);

  // A wrapper's fee-free (gross) growth = the net growth the engine actually
  // uses, plus the fees that were netted out of it. Starting from the derived
  // net (holdingsNetGrowth) is what makes the counterfactual meaningful.
  const grossGrowth = (w: WrapperView, manual: number | undefined) => {
    const net =
      w.holdings && w.holdings.length > 0
        ? holdingsNetGrowth(w.holdings)
        : (manual ?? fallback);
    return net + wrapperOcf(w) + PLATFORM_FEE_RATE;
  };

  const gross: FireInputs = {
    ...inputs,
    isaGrowth: grossGrowth(wrappers[0], (inputs.pots?.isa?.growth ?? inputs.isaGrowth ?? inputs.growthRate ?? 0)),
    giaGrowth: grossGrowth(wrappers[1], (inputs.pots?.gia?.growth ?? inputs.giaGrowth ?? inputs.growthRate ?? 0)),
    sippGrowth: grossGrowth(wrappers[2], (inputs.pots?.sipp?.growth ?? inputs.sippGrowth ?? inputs.growthRate ?? 0)),
    // Drop holdings so the counterfactual runs on the fee-free scalar above.
    isaHoldings: undefined,
    giaHoldings: undefined,
    sippHoldings: undefined,
  };

  const potAtRetirement = (result: ReturnType<typeof simulateFire>) => {
    const r = result.inputs.retirementAge;
    const snap =
      [...result.timeline].reverse().find((y) => y.age < r) ??
      result.timeline[result.timeline.length - 1];
    if (!snap || !snap.pots) return 0;
    return Object.values(snap.pots).reduce((sum, p) => sum + (p?.end ?? 0), 0);
  };

  const withFees = potAtRetirement(simulateFire(inputs));
  const withoutFees = potAtRetirement(simulateFire(gross));
  return Math.max(0, withoutFees - withFees);
}
