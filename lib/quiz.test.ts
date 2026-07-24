import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS, DEFAULT_INFLATION_RATE, simulateFire } from "./fire-engine";
import {
  applyPersona,
  assembleQuizInputs,
  BARISTA_ANNUAL_INCOME,
  initialQuizState,
  lifestyleIncome,
  PERSONA_BY_ID,
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

describe("applyPersona", () => {
  it("pulls in the persona's lifestyle and retirement age", () => {
    const s = applyPersona(initialQuizState(), "lean");
    expect(s.persona).toBe("lean");
    expect(s.lifestyle).toBe("minimum");
    expect(s.retirementAge).toBe(PERSONA_BY_ID.lean.retirementAge);
  });

  it("seeds a custom income for Fat FIRE", () => {
    const s = applyPersona(initialQuizState(), "fat");
    expect(s.lifestyle).toBe("custom");
    expect(s.customIncome).toBe(60000);
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
    expect(inputs.sippAccessAge).toBe(DEFAULT_ASSUMPTIONS.sippAccessAge);
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

  it("gives the Barista persona part-time income to State Pension age", () => {
    const inputs = assembleQuizInputs(applyPersona(base, "barista"));
    expect(inputs.partTimeAnnualIncome).toBe(BARISTA_ANNUAL_INCOME);
    expect(inputs.partTimeUntilAge).toBe(DEFAULT_ASSUMPTIONS.statePensionAge);
  });

  it("gives non-Barista personas no part-time income", () => {
    for (const id of ["standard", "lean", "fat", "coast"] as const) {
      const inputs = assembleQuizInputs(applyPersona(base, id));
      expect(inputs.partTimeAnnualIncome).toBe(0);
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
