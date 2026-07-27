import { describe, expect, it } from "vitest";
import { computeCoastFire } from "./coast-fire";
import { type FireInputs, simulateFire } from "./fire-engine";

describe("computeCoastFire", () => {
  it("reports Coast FIRE when current assets already sustain the plan", () => {
    const inputs: FireInputs = {
      currentAge: 45,
      retirementAge: 50,
      targetAnnualIncome: 20000,
      isaBalance: 1_500_000,
      isaMonthlyContribution: 2000,
      sippBalance: 500_000,
      sippMonthlyContribution: 1000,
    };
    const coast = computeCoastFire(inputs);
    expect(coast.isCoastFire).toBe(true);
    expect(coast.coastAge).toBe(inputs.currentAge); // can stop contributing now
    expect(coast.surplus).toBeGreaterThan(0);
    expect(coast.coastNumber).toBeLessThanOrEqual(coast.currentInvested);
  });

  it("reports a gap when current assets are far short", () => {
    const inputs: FireInputs = {
      currentAge: 30,
      retirementAge: 45,
      targetAnnualIncome: 40000,
      isaBalance: 10_000,
      isaMonthlyContribution: 500,
      sippBalance: 10_000,
      sippMonthlyContribution: 300,
    };
    const coast = computeCoastFire(inputs);
    expect(coast.isCoastFire).toBe(false);
    expect(coast.surplus).toBeLessThan(0);
    expect(coast.coastNumber).toBeGreaterThan(coast.currentInvested);
  });

  it("returns a coast number that itself sustains the plan", () => {
    const inputs: FireInputs = {
      currentAge: 35,
      retirementAge: 50,
      targetAnnualIncome: 30000,
      isaBalance: 40_000,
      isaMonthlyContribution: 800,
      sippBalance: 60_000,
      sippMonthlyContribution: 400,
    };
    const coast = computeCoastFire(inputs);
    // Allocate the coast number across the same pots, no contributions.
    const total = coast.currentInvested;
    const w =
      total > 0
        ? { isa: (inputs.pots?.isa?.balance ?? inputs.isaBalance ?? 0) / total, sipp: (inputs.pots?.sipp?.balance ?? inputs.sippBalance ?? 0) / total }
        : { isa: 0.4, sipp: 0.6 };
    const check = simulateFire({
      ...inputs,
      isaBalance: coast.coastNumber * w.isa,
      sippBalance: coast.coastNumber * w.sipp,
      isaMonthlyContribution: 0,
      sippMonthlyContribution: 0,
    });
    expect(check.sustainableToLifeExpectancy).toBe(true);
  });
});
