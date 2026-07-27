import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS, DEFAULT_INFLATION_RATE, simulateFire } from "./fire-engine";
import {
  assembleQuizInputs,
  BARISTA_ANNUAL_INCOME,
  FIRE_STRATEGIES,
  initialQuizState,
  lifestyleIncome,
  PLSA_LIFESTYLES,
  QUIZ_POT_GROWTH,
  QUIZ_PROPERTY_GROWTH,
} from "./quiz";

describe("lifestyleIncome", () => {
  it("returns the PLSA figure for a named lifestyle", () => {
    expect(lifestyleIncome("moderate", 0)).toBe(31700);
    expect(lifestyleIncome("comfortable", 0)).toBe(43900);
    expect(lifestyleIncome("minimum", 0)).toBe(13400);
  });

  it("returns the custom amount for a custom lifestyle", () => {
    expect(lifestyleIncome("custom", 55000)).toBe(55000);
  });
});

describe("FIRE_STRATEGIES", () => {
  it("offers exactly the three strategies that change the plan's shape", () => {
    expect(FIRE_STRATEGIES.map((s) => s.id)).toEqual([
      "standard",
      "coast",
      "barista",
    ]);
  });

  /**
   * Regression guard for the redundancy fix: Lean/Fat FIRE differed from
   * Standard only by the spending target, which the quiz asks directly. They
   * must not come back as a separate question.
   */
  it("does not re-ask spending level as a strategy", () => {
    const ids = FIRE_STRATEGIES.map((s) => s.id as string);
    expect(ids).not.toContain("lean");
    expect(ids).not.toContain("fat");
  });
});

describe("assembleQuizInputs", () => {
  const base = initialQuizState();

  it("takes its target income from the chosen lifestyle", () => {
    const inputs = assembleQuizInputs({ ...base, lifestyle: "moderate" });
    expect(inputs.targetAnnualIncome).toBe(31700);
  });

  it("uses the custom income when lifestyle is custom", () => {
    const inputs = assembleQuizInputs({
      ...base,
      lifestyle: "custom",
      customIncome: 52000,
    });
    expect(inputs.targetAnnualIncome).toBe(52000);
  });

  it("carries the ages through and applies documented defaults", () => {
    const inputs = assembleQuizInputs({
      ...base,
      currentAge: 42,
      retirementAge: 58,
    });
    expect(inputs.currentAge).toBe(42);
    expect(inputs.retirementAge).toBe(58);
    expect(inputs.sippAccessAge).toBe(58);
    expect(inputs.statePensionAge).toBe(68);
    expect(inputs.statePensionAnnual).toBe(DEFAULT_ASSUMPTIONS.statePensionAnnual);
    expect(inputs.pensionStrategy).toBe(DEFAULT_ASSUMPTIONS.pensionStrategy);
    expect(inputs.isaGrowth).toBe(QUIZ_POT_GROWTH);
    expect(inputs.homeGrowth).toBe(QUIZ_PROPERTY_GROWTH);
    expect(inputs.inflationRate).toBe(DEFAULT_INFLATION_RATE);
  });

  it("starts balances at zero with placeholder contributions", () => {
    const inputs = assembleQuizInputs(base);
    expect(inputs.isaBalance).toBe(0);
    expect(inputs.sippBalance).toBe(0);
    expect(inputs.giaBalance).toBe(0);
    expect(inputs.isaMonthlyContribution).toBeGreaterThan(0);
    expect(inputs.sippMonthlyContribution).toBeGreaterThan(0);
  });

  it("seeds the ISA balance from savings when the user gave a figure", () => {
    const inputs = assembleQuizInputs({
      ...base,
      savings: 85000,
      savingsProvided: true,
    });
    expect(inputs.isaBalance).toBe(85000);
    // The combined figure is parked in ISA only — not fabricated into a pension.
    expect(inputs.sippBalance).toBe(0);
    expect(inputs.giaBalance).toBe(0);
  });

  it("ignores a savings figure when the step was skipped", () => {
    const inputs = assembleQuizInputs({
      ...base,
      savings: 85000,
      savingsProvided: false,
    });
    expect(inputs.isaBalance).toBe(0);
  });

  it("clamps a negative savings figure to zero", () => {
    const inputs = assembleQuizInputs({
      ...base,
      savings: -1000,
      savingsProvided: true,
    });
    expect(inputs.isaBalance).toBe(0);
  });

  it("gives the part-time strategy income to State Pension age", () => {
    const inputs = assembleQuizInputs({ ...base, strategy: "barista" });
    expect(inputs.partTimeAnnualIncome).toBe(BARISTA_ANNUAL_INCOME);
    expect(inputs.partTimeUntilAge).toBe(68);
  });

  it("gives the other strategies no part-time income", () => {
    for (const strategy of ["standard", "coast"] as const) {
      const inputs = assembleQuizInputs({ ...base, strategy });
      expect(inputs.partTimeAnnualIncome).toBe(0);
    }
  });

  /** The strategy choice must never overwrite the target the user just set. */
  it("keeps the user's spending target and ages across every strategy", () => {
    for (const strategy of ["standard", "coast", "barista"] as const) {
      const inputs = assembleQuizInputs({
        ...base,
        lifestyle: "custom",
        customIncome: 51000,
        currentAge: 41,
        retirementAge: 57,
        strategy,
      });
      expect(inputs.targetAnnualIncome).toBe(51000);
      expect(inputs.currentAge).toBe(41);
      expect(inputs.retirementAge).toBe(57);
    }
  });

  it("produces inputs the engine can simulate to completion", () => {
    const inputs = assembleQuizInputs({ ...base, currentAge: 40 });
    const result = simulateFire(inputs);
    expect(result.timeline).toHaveLength(
      DEFAULT_ASSUMPTIONS.lifeExpectancyAge - 40 + 1,
    );
    expect(result.timeline[0].age).toBe(40);
  });

  it("exposes exactly the three PLSA lifestyle bands", () => {
    expect(PLSA_LIFESTYLES.map((l) => l.id)).toEqual([
      "minimum",
      "moderate",
      "comfortable",
    ]);
  });
});
