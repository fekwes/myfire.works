export interface UkIncomeTaxBands {
  personalAllowance: number;
  taperThreshold: number;
  basicRateBandWidth: number;
  additionalRateThreshold: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
}

// 2024/25 rest-of-UK income tax bands (Scottish rates are not modelled).
export const UK_INCOME_TAX_BANDS_2024_25: UkIncomeTaxBands = {
  personalAllowance: 12570,
  taperThreshold: 100000,
  basicRateBandWidth: 37700,
  additionalRateThreshold: 125140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
};

export const TAX_FREE_LUMP_SUM_CAP = 268275;

export const DEFAULT_ASSUMPTIONS = {
  growthRate: 0.05,
  statePensionAnnual: 11502, // full new State Pension, 2024/25 (£221.20/week)
  statePensionAge: 67,
  sippAccessAge: 58,
  lifeExpectancyAge: 95,
} as const;

export interface FireInputs {
  currentAge: number;
  retirementAge: number;
  targetAnnualIncome: number;
  isaBalance: number;
  isaMonthlyContribution: number;
  sippBalance: number;
  sippMonthlyContribution: number;
  growthRate?: number;
  statePensionAnnual?: number;
  statePensionAge?: number;
  sippAccessAge?: number;
  lifeExpectancyAge?: number;
}

type ResolvedFireInputs = Required<FireInputs>;

export type FirePhase = "accumulation" | "bridge" | "sipp" | "state-pension";

export interface YearSnapshot {
  age: number;
  phase: FirePhase;
  isaBalanceStart: number;
  isaBalanceEnd: number;
  sippBalanceStart: number;
  sippBalanceEnd: number;
  isaWithdrawal: number;
  sippGrossWithdrawal: number;
  taxFreeLumpSumTaken: number;
  statePensionIncome: number;
  incomeTaxPaid: number;
  netIncome: number;
  shortfall: boolean;
}

export interface FireSimulationResult {
  inputs: ResolvedFireInputs;
  timeline: YearSnapshot[];
  taxFreeLumpSum: number;
  bridgeToSippTransitionAge: number | null;
  isaDepletedAge: number | null;
  sippDepletedAge: number | null;
  sustainableToLifeExpectancy: boolean;
}

function resolveInputs(inputs: FireInputs): ResolvedFireInputs {
  return {
    ...inputs,
    growthRate: inputs.growthRate ?? DEFAULT_ASSUMPTIONS.growthRate,
    statePensionAnnual:
      inputs.statePensionAnnual ?? DEFAULT_ASSUMPTIONS.statePensionAnnual,
    statePensionAge:
      inputs.statePensionAge ?? DEFAULT_ASSUMPTIONS.statePensionAge,
    sippAccessAge: inputs.sippAccessAge ?? DEFAULT_ASSUMPTIONS.sippAccessAge,
    lifeExpectancyAge:
      inputs.lifeExpectancyAge ?? DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
  };
}

export function calculatePersonalAllowance(
  totalIncome: number,
  bands: UkIncomeTaxBands = UK_INCOME_TAX_BANDS_2024_25,
): number {
  if (totalIncome <= bands.taperThreshold) return bands.personalAllowance;
  const reduction = Math.floor((totalIncome - bands.taperThreshold) / 2);
  return Math.max(0, bands.personalAllowance - reduction);
}

export function calculateUkIncomeTax(
  totalIncome: number,
  bands: UkIncomeTaxBands = UK_INCOME_TAX_BANDS_2024_25,
): number {
  if (totalIncome <= 0) return 0;

  const personalAllowance = calculatePersonalAllowance(totalIncome, bands);
  let taxable = totalIncome - personalAllowance;
  if (taxable <= 0) return 0;

  let tax = 0;

  const basicPortion = Math.min(taxable, bands.basicRateBandWidth);
  tax += basicPortion * bands.basicRate;
  taxable -= basicPortion;
  if (taxable <= 0) return tax;

  const higherBandWidth = Math.max(
    0,
    bands.additionalRateThreshold - personalAllowance - bands.basicRateBandWidth,
  );
  const higherPortion = Math.min(taxable, higherBandWidth);
  tax += higherPortion * bands.higherRate;
  taxable -= higherPortion;
  if (taxable <= 0) return tax;

  tax += taxable * bands.additionalRate;
  return tax;
}

export function calculateTaxFreeLumpSum(
  sippBalance: number,
  cap: number = TAX_FREE_LUMP_SUM_CAP,
): number {
  return Math.min(sippBalance * 0.25, cap);
}

/**
 * Finds the gross income (on top of `otherTaxableIncome`) whose combined
 * net-of-tax total equals `targetNet`. UK tax bands are progressive but the
 * net-of-tax function is strictly monotonic, so bisection is a simple and
 * robust way to invert it without hand-coding a band-by-band inverse.
 */
export function solveGrossIncomeForNet(
  targetNet: number,
  otherTaxableIncome: number,
  bands: UkIncomeTaxBands = UK_INCOME_TAX_BANDS_2024_25,
): number {
  if (targetNet <= 0) return 0;

  const netOf = (gross: number) => {
    const total = otherTaxableIncome + gross;
    return total - calculateUkIncomeTax(total, bands);
  };

  let lo = 0;
  let hi = Math.max(targetNet * 2, 1000);
  while (netOf(hi) < targetNet && hi < 1e8) hi *= 2;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < targetNet) lo = mid;
    else hi = mid;
  }

  return hi;
}

export function simulateFire(rawInputs: FireInputs): FireSimulationResult {
  const inputs = resolveInputs(rawInputs);
  const {
    currentAge,
    retirementAge,
    targetAnnualIncome,
    growthRate,
    statePensionAnnual,
    statePensionAge,
    sippAccessAge,
    lifeExpectancyAge,
  } = inputs;

  let isaBalance = inputs.isaBalance;
  let sippBalance = inputs.sippBalance;

  const lumpSumAge = Math.max(retirementAge, sippAccessAge);
  let lumpSumTaken = false;
  let taxFreeLumpSum = 0;

  let bridgeToSippTransitionAge: number | null = null;
  let isaDepletedAge: number | null = null;
  let sippDepletedAge: number | null = null;

  const timeline: YearSnapshot[] = [];

  for (let age = currentAge; age <= lifeExpectancyAge; age++) {
    const isaBalanceStart = isaBalance;
    const sippBalanceStart = sippBalance;

    if (age < retirementAge) {
      isaBalance = isaBalance * (1 + growthRate) + inputs.isaMonthlyContribution * 12;
      sippBalance =
        sippBalance * (1 + growthRate) + inputs.sippMonthlyContribution * 12;

      timeline.push({
        age,
        phase: "accumulation",
        isaBalanceStart,
        isaBalanceEnd: isaBalance,
        sippBalanceStart,
        sippBalanceEnd: sippBalance,
        isaWithdrawal: 0,
        sippGrossWithdrawal: 0,
        taxFreeLumpSumTaken: 0,
        statePensionIncome: 0,
        incomeTaxPaid: 0,
        netIncome: 0,
        shortfall: false,
      });
      continue;
    }

    isaBalance *= 1 + growthRate;
    sippBalance *= 1 + growthRate;

    let lumpSumThisYear = 0;
    if (!lumpSumTaken && age >= lumpSumAge) {
      lumpSumThisYear = calculateTaxFreeLumpSum(sippBalance);
      sippBalance -= lumpSumThisYear;
      isaBalance += lumpSumThisYear;
      taxFreeLumpSum = lumpSumThisYear;
      lumpSumTaken = true;
    }

    const isBridge = age < sippAccessAge;
    if (isBridge && bridgeToSippTransitionAge === null) {
      bridgeToSippTransitionAge = sippAccessAge;
    }

    const statePensionIncome = age >= statePensionAge ? statePensionAnnual : 0;

    const isaWithdrawal = Math.min(isaBalance, targetAnnualIncome);
    isaBalance -= isaWithdrawal;

    const remainingNeeded = targetAnnualIncome - isaWithdrawal;

    let sippGrossWithdrawal = 0;
    let incomeTaxPaid = 0;
    let netFromSippAndStatePension = 0;

    if (remainingNeeded > 0) {
      const desiredGross = solveGrossIncomeForNet(
        remainingNeeded,
        statePensionIncome,
      );
      sippGrossWithdrawal = Math.min(desiredGross, sippBalance);
      sippBalance -= sippGrossWithdrawal;

      const totalTaxable = statePensionIncome + sippGrossWithdrawal;
      incomeTaxPaid = calculateUkIncomeTax(totalTaxable);
      netFromSippAndStatePension = totalTaxable - incomeTaxPaid;
    } else if (statePensionIncome > 0) {
      incomeTaxPaid = calculateUkIncomeTax(statePensionIncome);
      netFromSippAndStatePension = statePensionIncome - incomeTaxPaid;
    }

    const netIncome = isaWithdrawal + netFromSippAndStatePension;
    const shortfall = netIncome < targetAnnualIncome - 0.01;

    if (isaBalance <= 0.01 && isaDepletedAge === null && isaBalanceStart > 0) {
      isaDepletedAge = age;
    }
    if (sippBalance <= 0.01 && sippDepletedAge === null && sippBalanceStart > 0) {
      sippDepletedAge = age;
    }

    timeline.push({
      age,
      phase: isBridge
        ? "bridge"
        : age >= statePensionAge
          ? "state-pension"
          : "sipp",
      isaBalanceStart,
      isaBalanceEnd: isaBalance,
      sippBalanceStart,
      sippBalanceEnd: sippBalance,
      isaWithdrawal,
      sippGrossWithdrawal,
      taxFreeLumpSumTaken: lumpSumThisYear,
      statePensionIncome,
      incomeTaxPaid,
      netIncome,
      shortfall,
    });
  }

  const sustainableToLifeExpectancy = timeline
    .filter((year) => year.phase !== "accumulation")
    .every((year) => !year.shortfall);

  return {
    inputs,
    timeline,
    taxFreeLumpSum,
    bridgeToSippTransitionAge,
    isaDepletedAge,
    sippDepletedAge,
    sustainableToLifeExpectancy,
  };
}
