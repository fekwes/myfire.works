import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS, simulateFire } from "./fire-engine";
import {
  assembleQuizInputs,
  QUIZ_POT_GROWTH,
  QUIZ_PROPERTY_GROWTH,
  type QuizState,
} from "./quiz";

describe("assembleQuizInputs", () => {
  const answers: QuizState = {
    currentAge: 40,
    retirementAge: 52,
    targetAnnualIncome: 30000,
    isaBalance: 120000,
    isaMonthlyContribution: 800,
    sippBalance: 90000,
    sippMonthlyContribution: 400,
    giaBalance: 15000,
  };

  it("carries over the answers the quiz collects", () => {
    const inputs = assembleQuizInputs(answers);
    expect(inputs.currentAge).toBe(40);
    expect(inputs.retirementAge).toBe(52);
    expect(inputs.targetAnnualIncome).toBe(30000);
    expect(inputs.isaBalance).toBe(120000);
    expect(inputs.isaMonthlyContribution).toBe(800);
    expect(inputs.sippBalance).toBe(90000);
    expect(inputs.sippMonthlyContribution).toBe(400);
    expect(inputs.giaBalance).toBe(15000);
  });

  it("applies the documented silent defaults for everything not asked", () => {
    const inputs = assembleQuizInputs(answers);
    // Statutory ages + pension strategy come from the engine defaults.
    expect(inputs.sippAccessAge).toBe(DEFAULT_ASSUMPTIONS.sippAccessAge);
    expect(inputs.statePensionAge).toBe(DEFAULT_ASSUMPTIONS.statePensionAge);
    expect(inputs.statePensionAnnual).toBe(
      DEFAULT_ASSUMPTIONS.statePensionAnnual,
    );
    expect(inputs.statePensionAnnual).toBe(12547.6);
    expect(inputs.pensionStrategy).toBe(DEFAULT_ASSUMPTIONS.pensionStrategy);
    expect(inputs.lifeExpectancyAge).toBe(
      DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
    );
    // Growth: pots at 5%, property at 3%.
    expect(inputs.isaGrowth).toBe(QUIZ_POT_GROWTH);
    expect(inputs.giaGrowth).toBe(QUIZ_POT_GROWTH);
    expect(inputs.sippGrowth).toBe(QUIZ_POT_GROWTH);
    expect(inputs.homeGrowth).toBe(QUIZ_PROPERTY_GROWTH);
    expect(inputs.rentalGrowth).toBe(QUIZ_PROPERTY_GROWTH);
    // Never auto-contributed to the GIA, never auto-sold/downsized.
    expect(inputs.giaMonthlyContribution).toBe(0);
    expect(inputs.rentalSaleAge).toBe(0);
    expect(inputs.downsizeAge).toBe(0);
    expect(inputs.downsizeReleaseFraction).toBe(0);
  });

  it("defaults omitted balances and property to zero", () => {
    const inputs = assembleQuizInputs({
      currentAge: 30,
      retirementAge: 50,
      targetAnnualIncome: 25000,
    });
    expect(inputs.isaBalance).toBe(0);
    expect(inputs.isaMonthlyContribution).toBe(0);
    expect(inputs.sippBalance).toBe(0);
    expect(inputs.sippMonthlyContribution).toBe(0);
    expect(inputs.giaBalance).toBe(0);
    expect(inputs.homeValue).toBe(0);
    expect(inputs.rentalValue).toBe(0);
    expect(inputs.rentalMonthlyIncome).toBe(0);
  });

  it("carries optional property answers through", () => {
    const inputs = assembleQuizInputs({
      ...answers,
      homeValue: 350000,
      rentalValue: 200000,
      rentalMonthlyIncome: 900,
    });
    expect(inputs.homeValue).toBe(350000);
    expect(inputs.rentalValue).toBe(200000);
    expect(inputs.rentalMonthlyIncome).toBe(900);
  });

  it("produces inputs the engine can simulate to completion", () => {
    const result = simulateFire(assembleQuizInputs(answers));
    // Runs from currentAge to the default life-expectancy horizon inclusive.
    expect(result.timeline).toHaveLength(
      DEFAULT_ASSUMPTIONS.lifeExpectancyAge - 40 + 1,
    );
    expect(result.timeline[0].age).toBe(40);
    expect(result.inputs.sippAccessAge).toBe(57);
  });
});
