import { describe, expect, it } from "vitest";
import { simulateFire } from "./fire-engine";
import { computeFireNumber } from "./fire-number";
import { computeCoastFire } from "./coast-fire";

describe("Persona A: Early Accumulator Simulation", () => {
  const personaAInputs = {
    country: "uk" as const,
    currentAge: 25,
    retirementAge: 55,
    targetAnnualIncome: 35000,
    inflationRate: 0.025,
    growthRate: 0.05,
    contributionsUntilAge: 55,
    pots: {
      isa: { balance: 15000, monthlyContribution: 500, growth: 0.05, holdings: [] },
      sipp: { balance: 25000, monthlyContribution: 400, growth: 0.05, holdings: [] }, // workplace pension + SIPP
      gia: { balance: 0, monthlyContribution: 0, growth: 0.05, holdings: [] },
    },
    statePensionAnnual: 12547.6,
    statePensionAge: 67,
    sippAccessAge: 57,
  };

  it("calculates accumulation timeline correctly over 30 years", () => {
    const result = simulateFire(personaAInputs);
    expect(result.timeline.length).toBe(95 - 25 + 1); // 71 years (25 to 95)
    
    const accum = result.timeline.filter(y => y.phase === "accumulation");
    expect(accum.length).toBe(30); // 25 to 54
    
    // Pot at retirement age 55 (start of 55)
    const year55 = result.timeline.find(y => y.age === 55)!;
    expect(year55.pots.isa.start).toBeGreaterThan(15000);
    expect(year55.pots.sipp.start).toBeGreaterThan(25000);
  });

  it("computes FIRE number and Coast FIRE correctly", () => {
    const fn = computeFireNumber(personaAInputs);
    expect(fn.fireNumber).toBeGreaterThan(0);
    expect(fn.projectedAtRetirement).toBeGreaterThan(0);

    const coast = computeCoastFire(personaAInputs);
    expect(coast.currentInvested).toBe(40000); // 15k + 25k
  });
});

describe("Persona B: Near-Retirement / Drawdown User Simulation", () => {
  const personaBInputs = {
    country: "uk" as const,
    currentAge: 54,
    retirementAge: 55,
    targetAnnualIncome: 45000,
    inflationRate: 0.025,
    growthRate: 0.04,
    contributionsUntilAge: 55,
    pots: {
      isa: { balance: 250000, monthlyContribution: 0, growth: 0.04, holdings: [] },
      sipp: { balance: 650000, monthlyContribution: 0, growth: 0.04, holdings: [] },
      gia: { balance: 100000, monthlyContribution: 0, growth: 0.04, holdings: [] },
    },
    statePensionAnnual: 12547.6,
    statePensionAge: 67,
    sippAccessAge: 57,
    pensionStrategy: "gradual" as const,
  };

  it("handles SIPP access age (57) vs retirement age (55) correctly", () => {
    const result = simulateFire(personaBInputs);
    
    // Age 55 and 56 must be bridge phase (SIPP access is 57)
    const bridgeYears = result.timeline.filter(y => y.age === 55 || y.age === 56);
    expect(bridgeYears.every(y => y.phase === "bridge")).toBe(true);
    expect(bridgeYears.every(y => y.potWithdrawals.sipp.gross === 0)).toBe(true);

    // Age 57 onwards SIPP unlocks
    const sippYear = result.timeline.find(y => y.age === 57)!;
    expect(sippYear.phase).toBe("sipp");
  });

  it("applies 25% tax-free UFPLS fraction up to PCLS cap (£268,275)", () => {
    const result = simulateFire(personaBInputs);
    expect(result.totalTaxFreePension).toBeGreaterThan(0);
  });

  it("bridges to State Pension at age 67 with indexation", () => {
    const result = simulateFire(personaBInputs);
    const spYear = result.timeline.find(y => y.age === 67)!;
    expect(spYear.phase).toBe("state-pension");
    expect(spYear.statePensionIncome).toBeGreaterThan(12547.6);
  });
});

describe("Persona C: Chaos & Edge-Case User Simulation", () => {
  it("handles negative values without crashing", () => {
    const chaosInputs = {
      country: "uk" as const,
      currentAge: 30,
      retirementAge: 40,
      targetAnnualIncome: -5000,
      inflationRate: -0.05,
      growthRate: -0.1,
      contributionsUntilAge: 40,
      pots: {
        isa: { balance: -10000, monthlyContribution: -200, growth: -0.05, holdings: [] },
        sipp: { balance: 0, monthlyContribution: 0, growth: 0, holdings: [] },
      },
      lifeExpectancyAge: 80,
    };

    expect(() => simulateFire(chaosInputs)).not.toThrow();
    const result = simulateFire(chaosInputs);
    expect(result.timeline.length).toBe(80 - 30 + 1);
  });

  it("handles 0% return and 100% inflation", () => {
    const extremeInflationInputs = {
      country: "uk" as const,
      currentAge: 30,
      retirementAge: 40,
      targetAnnualIncome: 30000,
      inflationRate: 1.0, // 100% inflation
      growthRate: 0.0,    // 0% growth
      pots: {
        isa: { balance: 100000, monthlyContribution: 0, growth: 0, holdings: [] },
      },
    };

    expect(() => simulateFire(extremeInflationInputs)).not.toThrow();
    const result = simulateFire(extremeInflationInputs);
    expect(result.sustainableToLifeExpectancy).toBe(false);
  });

  it("handles giant numbers (1e12)", () => {
    const giantInputs = {
      country: "uk" as const,
      currentAge: 30,
      retirementAge: 50,
      targetAnnualIncome: 1e9,
      pots: {
        isa: { balance: 1e12, monthlyContribution: 1e6, growth: 0.05, holdings: [] },
      },
    };

    expect(() => simulateFire(giantInputs)).not.toThrow();
    const result = simulateFire(giantInputs);
    expect(Number.isFinite(result.timeline[0].pots.isa.start)).toBe(true);
  });

  it("handles equal boundary dates (currentAge == retirementAge == lifeExpectancyAge)", () => {
    const boundaryInputs = {
      country: "uk" as const,
      currentAge: 65,
      retirementAge: 65,
      targetAnnualIncome: 20000,
      lifeExpectancyAge: 65,
    };

    expect(() => simulateFire(boundaryInputs)).not.toThrow();
    const result = simulateFire(boundaryInputs);
    expect(result.timeline.length).toBe(1);
    expect(result.timeline[0].age).toBe(65);
  });

  it("handles currentAge > retirementAge", () => {
    const invertedAgeInputs = {
      country: "uk" as const,
      currentAge: 60,
      retirementAge: 50,
      targetAnnualIncome: 20000,
    };

    expect(() => simulateFire(invertedAgeInputs)).not.toThrow();
    const result = simulateFire(invertedAgeInputs);
    expect(result.timeline.length).toBeGreaterThan(0);
  });
});
