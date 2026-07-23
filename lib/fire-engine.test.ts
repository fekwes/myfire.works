import { describe, expect, it } from "vitest";
import {
  calculatePersonalAllowance,
  calculateTaxFreeLumpSum,
  calculateUkIncomeTax,
  simulateFire,
  solveGrossIncomeForNet,
  TAX_FREE_LUMP_SUM_CAP,
} from "./fire-engine";

describe("calculatePersonalAllowance", () => {
  it("returns the full allowance below the taper threshold", () => {
    expect(calculatePersonalAllowance(60000)).toBe(12570);
  });

  it("tapers £1 for every £2 over £100,000", () => {
    expect(calculatePersonalAllowance(110000)).toBe(7570);
  });

  it("floors at £0 by £125,140", () => {
    expect(calculatePersonalAllowance(125140)).toBe(0);
    expect(calculatePersonalAllowance(200000)).toBe(0);
  });
});

describe("calculateUkIncomeTax", () => {
  it("is £0 within the personal allowance", () => {
    expect(calculateUkIncomeTax(12000)).toBe(0);
  });

  it("matches known basic-rate tax on £30,000", () => {
    expect(calculateUkIncomeTax(30000)).toBeCloseTo(3486, 2);
  });

  it("matches known higher-rate tax on £60,000", () => {
    expect(calculateUkIncomeTax(60000)).toBeCloseTo(11432, 2);
  });

  it("matches known tax exactly at the additional-rate threshold (£125,140)", () => {
    expect(calculateUkIncomeTax(125140)).toBeCloseTo(42516, 2);
  });

  it("matches known additional-rate tax on £200,000", () => {
    expect(calculateUkIncomeTax(200000)).toBeCloseTo(76203, 2);
  });

  it("accounts for the personal allowance taper on £110,000", () => {
    expect(calculateUkIncomeTax(110000)).toBeCloseTo(33432, 2);
  });
});

describe("solveGrossIncomeForNet", () => {
  it("inverts calculateUkIncomeTax within a penny", () => {
    const gross = solveGrossIncomeForNet(30000, 0);
    const net = gross - calculateUkIncomeTax(gross);
    expect(net).toBeCloseTo(30000, 1);
  });

  it("accounts for other taxable income using up the personal allowance", () => {
    const statePension = 11502;
    const gross = solveGrossIncomeForNet(20000, statePension);
    const totalTax = calculateUkIncomeTax(statePension + gross);
    const net = statePension + gross - totalTax;
    expect(net).toBeCloseTo(20000, 1);
  });

  it("returns 0 for a non-positive target", () => {
    expect(solveGrossIncomeForNet(0, 5000)).toBe(0);
  });
});

describe("calculateTaxFreeLumpSum", () => {
  it("is 25% of the SIPP balance below the cap", () => {
    expect(calculateTaxFreeLumpSum(400000)).toBe(100000);
  });

  it("is capped at £268,275 for large pots", () => {
    expect(calculateTaxFreeLumpSum(2000000)).toBe(TAX_FREE_LUMP_SUM_CAP);
  });
});

describe("simulateFire", () => {
  const baseInputs = {
    currentAge: 40,
    retirementAge: 50,
    targetAnnualIncome: 30000,
    isaBalance: 300000,
    isaMonthlyContribution: 0,
    sippBalance: 400000,
    sippMonthlyContribution: 0,
  };

  it("grows both pots through the accumulation phase with no withdrawals", () => {
    const result = simulateFire(baseInputs);
    const accumulationYears = result.timeline.filter(
      (y) => y.phase === "accumulation",
    );
    expect(accumulationYears).toHaveLength(10); // ages 40-49
    expect(accumulationYears.every((y) => y.netIncome === 0)).toBe(true);
    expect(accumulationYears[9].isaBalanceEnd).toBeGreaterThan(
      baseInputs.isaBalance,
    );
  });

  it("funds the bridge phase entirely from the ISA, tax-free", () => {
    const result = simulateFire(baseInputs);
    const bridgeYears = result.timeline.filter((y) => y.phase === "bridge");
    expect(bridgeYears.length).toBeGreaterThan(0); // ages 50-57
    for (const year of bridgeYears) {
      expect(year.sippGrossWithdrawal).toBe(0);
      expect(year.incomeTaxPaid).toBe(0);
      expect(year.netIncome).toBeCloseTo(baseInputs.targetAnnualIncome, 0);
    }
  });

  it("takes a 25% tax-free lump sum at the SIPP access age", () => {
    const result = simulateFire(baseInputs);
    expect(result.taxFreeLumpSum).toBeGreaterThan(0);
    expect(result.taxFreeLumpSum).toBeLessThanOrEqual(TAX_FREE_LUMP_SUM_CAP);

    const lumpSumYear = result.timeline.find(
      (y) => y.taxFreeLumpSumTaken > 0,
    );
    expect(lumpSumYear?.age).toBe(58);
  });

  it("draws taxable SIPP income once ISA and the tax-free lump sum can't cover the target", () => {
    // Target income deliberately exceeds what the ISA + 25% lump sum can
    // cover in year one, forcing a genuine taxable SIPP drawdown.
    const result = simulateFire({
      currentAge: 58,
      retirementAge: 58,
      targetAnnualIncome: 100000,
      isaBalance: 0,
      isaMonthlyContribution: 0,
      sippBalance: 300000,
      sippMonthlyContribution: 0,
    });
    const sippYears = result.timeline.filter((y) => y.phase === "sipp");
    expect(sippYears.some((y) => y.sippGrossWithdrawal > 0)).toBe(true);
  });

  it("offsets SIPP drawdown with State Pension income from age 67", () => {
    const result = simulateFire(baseInputs);
    const statePensionYears = result.timeline.filter(
      (y) => y.phase === "state-pension",
    );
    expect(statePensionYears.length).toBeGreaterThan(0);
    for (const year of statePensionYears) {
      expect(year.statePensionIncome).toBeCloseTo(11502, 0);
    }
  });

  it("flags a shortfall once both pots are exhausted", () => {
    const result = simulateFire({
      ...baseInputs,
      isaBalance: 10000,
      sippBalance: 10000,
      lifeExpectancyAge: 95,
    });
    expect(result.sustainableToLifeExpectancy).toBe(false);
    expect(result.timeline.some((y) => y.shortfall)).toBe(true);
  });

  it("is fully sustainable for a well-funded plan", () => {
    const result = simulateFire({
      ...baseInputs,
      isaBalance: 500000,
      sippBalance: 900000,
    });
    expect(result.sustainableToLifeExpectancy).toBe(true);
  });
});
