import { describe, expect, it } from "vitest";
import { sustainableIncomeFromPots } from "./bridge";
import { type FireInputs, simulateFire } from "./fire-engine";

const baseInputs: FireInputs = {
  currentAge: 40,
  retirementAge: 50,
  sippAccessAge: 57,
  statePensionAge: 67,
  lifeExpectancyAge: 90,
  targetAnnualIncome: 30000,
  isaBalance: 100000,
  giaBalance: 0,
  sippBalance: 200000,
  isaHoldings: [],
  giaHoldings: [],
  sippHoldings: [],
  isaMonthlyContribution: 0,
  sippMonthlyContribution: 0,
  statePensionAnnual: 12547.6,
};

describe("sustainableIncomeFromPots", () => {
  it("returns null if all balances are zero", () => {
    expect(
      sustainableIncomeFromPots({
        ...baseInputs,
        isaBalance: 0,
        giaBalance: 0,
        sippBalance: 0,
      }),
    ).toBeNull();
  });

  it("computes bridge and pension legs and returns minimum as headline", () => {
    const result = sustainableIncomeFromPots(baseInputs)!;
    expect(result).not.toBeNull();
    expect(result.bridgeIncome).toBeGreaterThan(0);
    expect(result.pensionIncome).toBeGreaterThan(0);
    expect(result.headline).toBe(Math.min(result.bridgeIncome!, result.pensionIncome));
  });

  it("handles zero-length bridge", () => {
    const result = sustainableIncomeFromPots({
      ...baseInputs,
      retirementAge: 60,
      sippAccessAge: 58,
    })!;
    expect(result.bridgeIncome).toBeNull();
    expect(result.headline).toBe(result.pensionIncome);
  });

  it("a plan whose sustainable income meets its target is also sustainableToLifeExpectancy", () => {
    const result = sustainableIncomeFromPots(baseInputs)!;
    // test the headline
    const target = result.headline;
    
    // Set target to headline, contributions to 0, current balances
    const sim = simulateFire({
      ...baseInputs,
      targetAnnualIncome: target,
      isaMonthlyContribution: 0,
      giaMonthlyContribution: 0,
      sippMonthlyContribution: 0,
    });
    
    // The headline means it SHOULD be sustainable. 
    // Wait, the headline is calculated by zeroing out cross-pots (bridge has SIPP=0, pension has ISA=0).
    // If they actually run the plan with BOTH pots, they should have MORE flexibility, 
    // so it should definitely be sustainable.
    expect(sim.sustainableToLifeExpectancy).toBe(true);
  });

  it("asserts figures move with access ages, not hardcoded 57/67", () => {
    const defaultAges = sustainableIncomeFromPots({
      ...baseInputs,
      sippAccessAge: 57,
      statePensionAge: 67,
    })!;
    const delayedAges = sustainableIncomeFromPots({
      ...baseInputs,
      sippAccessAge: 60,
      statePensionAge: 70,
    })!;
    
    // With delayed access, bridge must last longer, so bridge income should drop
    expect(delayedAges.bridgeIncome!).toBeLessThan(defaultAges.bridgeIncome!);
  });

  it("works with inputs.pots structure", () => {
    const result = sustainableIncomeFromPots({
      ...baseInputs,
      pots: {
        isa: { balance: 100000, monthlyContribution: 500 },
        gia: { balance: 0, monthlyContribution: 0 },
        sipp: { balance: 200000, monthlyContribution: 500 },
      },
    })!;
    expect(result).not.toBeNull();
    expect(result.bridgeIncome).toBeGreaterThan(0);
    expect(result.pensionIncome).toBeGreaterThan(0);
  });
});
