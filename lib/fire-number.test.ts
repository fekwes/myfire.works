import { describe, expect, it } from "vitest";
import { computeFireNumber } from "./fire-number";
import type { FireInputs } from "./fire-engine";

describe("computeFireNumber", () => {
  const base: FireInputs = {
    currentAge: 40,
    retirementAge: 55,
    targetAnnualIncome: 30000,
    isaBalance: 150000,
    isaMonthlyContribution: 1000,
    sippBalance: 90000,
    sippMonthlyContribution: 500,
  };

  it("requires a larger pot for a larger target income", () => {
    const modest = computeFireNumber({ ...base, targetAnnualIncome: 20000 });
    const luxury = computeFireNumber({ ...base, targetAnnualIncome: 50000 });
    expect(luxury.fireNumber).toBeGreaterThan(modest.fireNumber);
  });

  it("reports on-track when the projected pot clears the FIRE number", () => {
    const strong = computeFireNumber({
      ...base,
      isaMonthlyContribution: 3000,
      sippMonthlyContribution: 1500,
    });
    expect(strong.projectedAtRetirement).toBeGreaterThan(strong.fireNumber);
    expect(strong.onTrack).toBe(true);
    expect(strong.surplus).toBeGreaterThan(0);
  });

  it("reports a shortfall when contributions are far too small", () => {
    const weak = computeFireNumber({
      ...base,
      isaBalance: 5000,
      sippBalance: 5000,
      isaMonthlyContribution: 50,
      sippMonthlyContribution: 50,
    });
    expect(weak.onTrack).toBe(false);
    expect(weak.surplus).toBeLessThan(0);
  });

  it("is positive and finite for a realistic plan", () => {
    const { fireNumber } = computeFireNumber(base);
    expect(fireNumber).toBeGreaterThan(0);
    expect(Number.isFinite(fireNumber)).toBe(true);
  });
});
