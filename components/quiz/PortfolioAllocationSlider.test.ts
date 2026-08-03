import { describe, expect, it } from "vitest";
import {
  holdingsToSplit,
  splitToHoldings,
} from "./PortfolioAllocationSlider";

describe("PortfolioAllocationSlider conversion utilities", () => {
  it("converts a 80/20 growth split to holdings accurately", () => {
    const holdings = splitToHoldings({ equity: 80, bonds: 20, cash: 0 });
    expect(holdings).toHaveLength(2);
    expect(holdings[0].assetClass).toBe("global-equity");
    expect(holdings[0].weight).toBeCloseTo(0.8, 4);
    expect(holdings[1].assetClass).toBe("global-bonds");
    expect(holdings[1].weight).toBeCloseTo(0.2, 4);
  });

  it("converts holdings back into a 3-way split", () => {
    const holdings = splitToHoldings({ equity: 70, bonds: 20, cash: 10 });
    const split = holdingsToSplit(holdings);
    expect(split.equity).toBe(70);
    expect(split.bonds).toBe(20);
    expect(split.cash).toBe(10);
  });

  it("defaults to 100% Cash when empty holdings provided", () => {
    const split = holdingsToSplit([]);
    expect(split.cash).toBe(100);
    expect(split.equity).toBe(0);
    expect(split.bonds).toBe(0);
  });
});
