import { describe, expect, it } from "vitest";
import {
  ASSET_CLASS_RETURN,
  type Holding,
  holdingNetGrowth,
  holdingsAllocation,
  holdingsNetGrowth,
  PLATFORM_FEE_RATE,
} from "./assets";
import { simulateFire } from "./fire-engine";

const near = (a: number, b: number, p = 1e-9) =>
  expect(Math.abs(a - b)).toBeLessThan(p);

const holding = (over: Partial<Holding> & { assetClass: Holding["assetClass"] }): Holding => ({
  ocf: 0,
  weight: 1,
  ...over,
});

describe("holdings model", () => {
  it("net growth = gross return − OCF − platform fee", () => {
    near(
      holdingNetGrowth(holding({ assetClass: "global-equity", ocf: 0.002 })),
      0.07 - 0.002 - PLATFORM_FEE_RATE,
    );
  });

  it("a custom expected return overrides the asset-class default", () => {
    near(
      holdingNetGrowth(
        holding({ assetClass: "global-equity", ocf: 0.001, expectedReturn: 0.09 }),
      ),
      0.09 - 0.001 - PLATFORM_FEE_RATE,
    );
  });

  it("holdingsNetGrowth is balance-weighted across holdings", () => {
    const hs = [
      holding({ assetClass: "global-equity", weight: 0.5 }),
      holding({ assetClass: "global-bonds", weight: 0.5 }),
    ];
    near(holdingsNetGrowth(hs), (0.07 + 0.04) / 2 - PLATFORM_FEE_RATE);
  });

  it("normalises weights that don't sum to 1", () => {
    const hs = [
      holding({ assetClass: "global-equity", weight: 60 }),
      holding({ assetClass: "global-bonds", weight: 40 }),
    ];
    near(holdingsNetGrowth(hs), 0.6 * 0.07 + 0.4 * 0.04 - PLATFORM_FEE_RATE);
  });

  it("allocation reflects the blended equity/bonds/cash mix", () => {
    const a = holdingsAllocation([
      holding({ assetClass: "global-equity", weight: 0.5 }),
      holding({ assetClass: "global-bonds", weight: 0.5 }),
    ]);
    near(a.equity, 0.5);
    near(a.bonds, 0.5);
    near(a.cash, 0);
  });

  it("empty holdings fall back to the neutral 80/20 default", () => {
    near(holdingsAllocation([]).equity, 0.8);
  });
});

describe("engine derives growth from holdings", () => {
  it("a single-fund portfolio matches the equivalent scalar growth", () => {
    const base = {
      currentAge: 35,
      retirementAge: 55,
      targetAnnualIncome: 30000,
      isaBalance: 100000,
      isaMonthlyContribution: 500,
      sippBalance: 0,
      sippMonthlyContribution: 0,
    };
    const netEquity = ASSET_CLASS_RETURN["global-equity"] - 0.002 - PLATFORM_FEE_RATE;

    const scalar = simulateFire({ ...base, isaGrowth: netEquity });
    const holdings = simulateFire({
      ...base,
      isaHoldings: [holding({ assetClass: "global-equity", ocf: 0.002, weight: 1 })],
    });

    // Holdings should collapse to the identical projection.
    near(scalar.timeline[10].isaBalanceEnd, holdings.timeline[10].isaBalanceEnd, 1e-6);
  });
});
