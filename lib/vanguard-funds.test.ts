import { describe, expect, it } from "vitest";
import type { FireInputs } from "./fire-engine";
import {
  PLATFORM_FEE_CAP,
  PLATFORM_FEE_FLOOR,
  PLATFORM_FEE_RATE,
  VANGUARD_FUNDS,
  estimateFeeDrag,
  fundForGrowth,
  netGrowth,
  platformFeeForBalance,
} from "./vanguard-funds";

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
    const vwrp = VANGUARD_FUNDS.find((f) => f.id === "vwrp")!;
    // global equity 7% − 0.14% OCF − 0.15% platform.
    expect(netGrowth(vwrp)).toBeCloseTo(0.07 - 0.0014 - PLATFORM_FEE_RATE, 10);
  });

  it("cheaper funds keep more of the return", () => {
    const vwrp = VANGUARD_FUNDS.find((f) => f.id === "vwrp")!;
    const allCap = VANGUARD_FUNDS.find((f) => f.id === "global-all-cap")!;
    // Same asset class, lower OCF → higher net growth.
    expect(netGrowth(vwrp)).toBeGreaterThan(netGrowth(allCap));
  });
});

describe("fundForGrowth", () => {
  it("round-trips a preset's net growth back to the fund", () => {
    const allCap = VANGUARD_FUNDS.find((f) => f.id === "global-all-cap")!;
    expect(fundForGrowth(netGrowth(allCap))?.id).toBe("global-all-cap");
  });

  it("returns null for a manually-set growth", () => {
    expect(fundForGrowth(0.0512345)).toBeNull();
    expect(fundForGrowth(undefined)).toBeNull();
  });
});

describe("estimateFeeDrag", () => {
  const base: FireInputs = {
    currentAge: 35,
    retirementAge: 55,
    targetAnnualIncome: 30000,
    isaBalance: 100_000,
    isaMonthlyContribution: 1000,
    isaGrowth: netGrowth(VANGUARD_FUNDS[0]),
    sippBalance: 100_000,
    sippMonthlyContribution: 500,
    sippGrowth: netGrowth(VANGUARD_FUNDS[0]),
  };

  it("is a positive, non-trivial sum over a long accumulation", () => {
    const drag = estimateFeeDrag(base);
    expect(drag).toBeGreaterThan(0);
  });

  it("grows when fees are higher", () => {
    const cheap = { ...base };
    const pricey: FireInputs = {
      ...base,
      isaGrowth: netGrowth(VANGUARD_FUNDS.find((f) => f.id === "lifestrategy-100")!),
      sippGrowth: netGrowth(VANGUARD_FUNDS.find((f) => f.id === "lifestrategy-100")!),
    };
    // LifeStrategy (0.22% OCF) drags more than the All Cap (0.23%)? Compare to
    // the cheapest tracker instead to keep the ordering unambiguous.
    const cheapest: FireInputs = {
      ...base,
      isaGrowth: netGrowth(VANGUARD_FUNDS.find((f) => f.id === "vuag")!),
      sippGrowth: netGrowth(VANGUARD_FUNDS.find((f) => f.id === "vuag")!),
    };
    expect(estimateFeeDrag(pricey)).toBeGreaterThan(estimateFeeDrag(cheapest));
    expect(estimateFeeDrag(cheap)).toBeGreaterThan(0);
  });
});
