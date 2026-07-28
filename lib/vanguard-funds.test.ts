import { describe, expect, it } from "vitest";
import type { FireInputs } from "./fire-engine";
import {
  estimateFeeDrag,
  FUNDS,
  fundToHolding,
  netGrowth,
  PLATFORM_FEE_CAP,
  PLATFORM_FEE_FLOOR,
  PLATFORM_FEE_RATE,
  platformFeeForBalance,
  portfolioAllocation,
  portfolioEquityFraction,
} from "./vanguard-funds";

const fund = (id: string) => FUNDS.find((f) => f.id === id)!;
const hold = (id: string) => [fundToHolding(fund(id), 1)];

describe("platformFeeForBalance", () => {
  it("charges the £48 floor for small balances", () => {
    expect(platformFeeForBalance(10_000)).toBe(PLATFORM_FEE_FLOOR);
  });

  it("charges 0.15% in the middle band", () => {
    expect(platformFeeForBalance(100_000)).toBeCloseTo(150, 6);
  });

  it("caps at £375 for large balances", () => {
    expect(platformFeeForBalance(1_000_000)).toBe(PLATFORM_FEE_CAP);
  });

  it("is zero with nothing invested", () => {
    expect(platformFeeForBalance(0)).toBe(0);
  });
});

describe("netGrowth", () => {
  it("deducts OCF and the platform fee from the gross return", () => {
    const vwrp = fund("vwrp");
    // global equity 7% − 0.14% OCF − 0.15% platform.
    expect(netGrowth(vwrp)).toBeCloseTo(0.07 - 0.0014 - PLATFORM_FEE_RATE, 10);
  });

  it("cheaper funds keep more of the return", () => {
    // Same asset class, lower OCF → higher net growth.
    expect(netGrowth(fund("vwrp"))).toBeGreaterThan(netGrowth(fund("global-all-cap")));
  });
});

describe("portfolioAllocation", () => {
  const base: FireInputs = {
    currentAge: 40,
    retirementAge: 55,
    targetAnnualIncome: 30000,
    isaBalance: 0,
    isaMonthlyContribution: 0,
    sippBalance: 0,
    sippMonthlyContribution: 0,
  };

  it("reads a single all-equity fund as 100% equity", () => {
    const a = portfolioAllocation({
      ...base,
      isaBalance: 50_000,
      isaHoldings: hold("vwrp"),
    });
    expect(a.equity).toBeCloseTo(1, 6);
    expect(a.bonds).toBeCloseTo(0, 6);
  });

  it("weights a 60/40 fund correctly", () => {
    const a = portfolioAllocation({
      ...base,
      sippBalance: 50_000,
      sippHoldings: hold("lifestrategy-60"),
    });
    expect(a.equity).toBeCloseTo(0.6, 6);
    expect(a.bonds).toBeCloseTo(0.4, 6);
  });

  it("balance-weights across wrappers", () => {
    // £75k all-equity ISA + £25k 60/40 SIPP → 0.75*1 + 0.25*0.6 = 0.9 equity.
    const eq = portfolioEquityFraction({
      ...base,
      isaBalance: 75_000,
      isaHoldings: hold("vwrp"),
      sippBalance: 25_000,
      sippHoldings: hold("lifestrategy-60"),
    });
    expect(eq).toBeCloseTo(0.9, 6);
  });

  it("falls back to the neutral 80/20 default with nothing invested", () => {
    expect(portfolioEquityFraction(base)).toBeCloseTo(0.8, 6);
  });

  it("treats a plain-growth wrapper (no portfolio) as the neutral default", () => {
    const eq = portfolioEquityFraction({
      ...base,
      isaBalance: 50_000,
      isaGrowth: 0.0512345,
    });
    expect(eq).toBeCloseTo(0.8, 6);
  });
});

describe("estimateFeeDrag", () => {
  const base: FireInputs = {
    currentAge: 35,
    retirementAge: 55,
    targetAnnualIncome: 30000,
    isaBalance: 100_000,
    isaMonthlyContribution: 1000,
    isaHoldings: hold("global-all-cap"),
    sippBalance: 100_000,
    sippMonthlyContribution: 500,
    sippHoldings: hold("global-all-cap"),
  };

  it("is a positive, non-trivial sum over a long accumulation", () => {
    expect(estimateFeeDrag(base)).toBeGreaterThan(0);
  });

  it("survives a plan-lasts-to age below the current age", () => {
    // A half-typed "Plan lasts to" used to leave the projection with no years
    // at all, and reading the pot at retirement threw.
    expect(() =>
      estimateFeeDrag({ ...base, lifeExpectancyAge: 9 }),
    ).not.toThrow();
  });

  it("returns 0 fee drag when current age is equal to or past retirement age", () => {
    expect(estimateFeeDrag({ ...base, currentAge: 55, retirementAge: 55 })).toBe(0);
  });

  it("grows when fees are higher", () => {
    // LifeStrategy 100 (0.22% OCF) drags more than the cheapest tracker (VUAG,
    // 0.07% OCF) — same asset-class return, so the gap is purely fees.
    const pricey: FireInputs = {
      ...base,
      isaHoldings: hold("lifestrategy-100"),
      sippHoldings: hold("lifestrategy-100"),
    };
    const cheapest: FireInputs = {
      ...base,
      isaHoldings: hold("vuag"),
      sippHoldings: hold("vuag"),
    };
    expect(estimateFeeDrag(pricey)).toBeGreaterThan(estimateFeeDrag(cheapest));
  });
});
