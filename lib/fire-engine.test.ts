import { describe, expect, it } from "vitest";
import {
  BASIC_RATE_CEILING,
  calculateCapitalGainsTax,
  calculatePersonalAllowance,
  calculateTaxFreeLumpSum,
  calculateUkIncomeTax,
  CGT_ANNUAL_EXEMPT_AMOUNT,
  simulateFire,
  solveGiaGrossForNet,
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

describe("calculateCapitalGainsTax", () => {
  const fullBand = BASIC_RATE_CEILING;

  it("is £0 when the gain is within the annual exempt amount", () => {
    expect(calculateCapitalGainsTax(CGT_ANNUAL_EXEMPT_AMOUNT, fullBand)).toBe(0);
    expect(calculateCapitalGainsTax(1000, fullBand)).toBe(0);
  });

  it("taxes gains above the exemption at 18% within the basic band", () => {
    // £10,000 gain − £3,000 exemption = £7,000 taxable @ 18% = £1,260
    expect(calculateCapitalGainsTax(10000, fullBand)).toBeCloseTo(1260, 2);
  });

  it("taxes gains at 24% once the basic band is used up by income", () => {
    // No basic band left → £7,000 taxable @ 24% = £1,680
    expect(calculateCapitalGainsTax(10000, 0)).toBeCloseTo(1680, 2);
  });

  it("splits a large gain across the 18% and 24% rates", () => {
    // £3,000 basic band left, £20,000 gain − £3,000 exemption = £17,000 taxable
    // £3,000 @ 18% + £14,000 @ 24% = £540 + £3,360 = £3,900
    expect(calculateCapitalGainsTax(20000, 3000)).toBeCloseTo(3900, 2);
  });
});

describe("solveGiaGrossForNet", () => {
  it("returns the target unchanged when there is no gain", () => {
    expect(solveGiaGrossForNet(20000, 0, BASIC_RATE_CEILING)).toBe(20000);
  });

  it("inverts the CGT calc so net-of-CGT matches the target", () => {
    const gross = solveGiaGrossForNet(20000, 0.5, BASIC_RATE_CEILING);
    const net =
      gross - calculateCapitalGainsTax(gross * 0.5, BASIC_RATE_CEILING);
    expect(net).toBeCloseTo(20000, 1);
    expect(gross).toBeGreaterThan(20000); // must gross up to cover the CGT
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

  it("takes a 25% tax-free lump sum at the SIPP access age (lump-sum strategy)", () => {
    const result = simulateFire({
      ...baseInputs,
      pensionStrategy: "lump-sum",
    });
    expect(result.taxFreeLumpSum).toBeGreaterThan(0);
    expect(result.taxFreeLumpSum).toBeLessThanOrEqual(TAX_FREE_LUMP_SUM_CAP);

    const lumpSumYear = result.timeline.find((y) => y.pensionTaxFreeTaken > 0);
    expect(lumpSumYear?.age).toBe(57); // default SIPP access age (2028 NMPA)
  });

  it("takes no upfront lump sum in the default gradual (UFPLS) strategy", () => {
    const result = simulateFire(baseInputs);
    expect(result.taxFreeLumpSum).toBe(0);
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
      expect(year.statePensionIncome).toBeCloseTo(12547.6, 0); // 2026/27
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

  it("leaves GIA untouched and CGT at zero when no GIA is provided", () => {
    const result = simulateFire(baseInputs);
    expect(
      result.timeline.every(
        (y) => y.giaBalanceEnd === 0 && y.capitalGainsTaxPaid === 0,
      ),
    ).toBe(true);
    expect(result.giaDepletedAge).toBeNull();
  });

  it("draws down GIA and charges CGT once gains have accrued", () => {
    const result = simulateFire({
      currentAge: 50,
      retirementAge: 50,
      targetAnnualIncome: 20000,
      isaBalance: 0,
      isaMonthlyContribution: 0,
      giaBalance: 500000,
      giaMonthlyContribution: 0,
      sippBalance: 0,
      sippMonthlyContribution: 0,
    });
    // GIA funds the plan, and CGT appears once per-withdrawal gains exceed
    // the £3,000 annual exemption.
    expect(result.timeline.some((y) => y.giaWithdrawal > 0)).toBe(true);
    expect(
      result.timeline.some(
        (y) => y.giaWithdrawal > 0 && y.capitalGainsTaxPaid > 0,
      ),
    ).toBe(true);
    // Net income is grossed up to still hit the target despite CGT.
    const fundedYear = result.timeline.find(
      (y) => y.giaWithdrawal > 0 && !y.shortfall,
    );
    expect(fundedYear?.netIncome).toBeCloseTo(20000, 0);
  });

  it("cannot draw the SIPP before the access age (bridge shortfall)", () => {
    // Retire at 50 with a small ISA but a large, locked SIPP. The bridge
    // years (50–56) must fall short — the SIPP can't be touched until 57.
    const result = simulateFire({
      currentAge: 50,
      retirementAge: 50,
      targetAnnualIncome: 40000,
      isaBalance: 20000,
      isaMonthlyContribution: 0,
      sippBalance: 1_000_000,
      sippMonthlyContribution: 0,
    });
    const bridge = result.timeline.filter((y) => y.phase === "bridge");
    expect(bridge.every((y) => y.sippGrossWithdrawal === 0)).toBe(true);
    expect(bridge.some((y) => y.shortfall)).toBe(true);
  });

  it("routes the tax-free lump sum into the GIA, not the ISA", () => {
    const result = simulateFire({
      currentAge: 57,
      retirementAge: 57,
      targetAnnualIncome: 10000,
      isaBalance: 0,
      isaMonthlyContribution: 0,
      sippBalance: 400000,
      sippMonthlyContribution: 0,
      pensionStrategy: "lump-sum",
    });
    const accessYear = result.timeline.find((y) => y.age === 57);
    expect(accessYear?.giaBalanceStart).toBe(0);
    expect(accessYear?.giaBalanceEnd ?? 0).toBeGreaterThan(50000); // lump landed here
    expect(result.taxFreeLumpSum).toBeGreaterThan(0);
  });

  it("gives 25% of gradual (UFPLS) SIPP withdrawals tax-free", () => {
    const result = simulateFire({
      currentAge: 57,
      retirementAge: 57,
      targetAnnualIncome: 30000,
      isaBalance: 0,
      isaMonthlyContribution: 0,
      sippBalance: 800000,
      sippMonthlyContribution: 0,
      pensionStrategy: "gradual",
    });
    const year = result.timeline.find(
      (y) => y.age === 57 && y.sippGrossWithdrawal > 0,
    );
    expect(year?.pensionTaxFreeTaken ?? 0).toBeGreaterThan(0);
    expect(year?.netIncome).toBeCloseTo(30000, 0);
    expect(result.totalTaxFreePension).toBeGreaterThan(0);
  });
});
