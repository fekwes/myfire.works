export interface UkIncomeTaxBands {
  personalAllowance: number;
  taperThreshold: number;
  basicRateBandWidth: number;
  additionalRateThreshold: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
}

// 2026/27 rest-of-UK income tax bands (Scottish rates are not modelled).
// Thresholds are frozen from 2021/22 through to 2030/31, so these match the
// current published figures.
export const UK_INCOME_TAX_BANDS_2026_27: UkIncomeTaxBands = {
  personalAllowance: 12570,
  taperThreshold: 100000,
  basicRateBandWidth: 37700,
  additionalRateThreshold: 125140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
};

/** Income at which the basic-rate band ends (£50,270 for 2026/27). */
export const BASIC_RATE_CEILING =
  UK_INCOME_TAX_BANDS_2026_27.personalAllowance +
  UK_INCOME_TAX_BANDS_2026_27.basicRateBandWidth;

/** Lump Sum Allowance — the lifetime cap on tax-free pension cash (frozen). */
export const TAX_FREE_LUMP_SUM_CAP = 268275;

// Capital Gains Tax, 2026/27 (non-property rates aligned at 18%/24% since
// 30 Oct 2024; £3,000 annual exempt amount).
export const CGT_ANNUAL_EXEMPT_AMOUNT = 3000;
export const CGT_BASIC_RATE = 0.18;
export const CGT_HIGHER_RATE = 0.24;

export type PensionStrategy = "gradual" | "lump-sum";

export const DEFAULT_ASSUMPTIONS = {
  growthRate: 0.05,
  // Full new State Pension 2026/27: £241.30/week × 52 = £12,547.60/yr.
  statePensionAnnual: 12547.6,
  statePensionAge: 67,
  // UK Normal Minimum Pension Age is 55 today, rising to 57 on 6 Apr 2028.
  // Early retirees modelled here reach it after 2028, so we default to 57.
  sippAccessAge: 57,
  lifeExpectancyAge: 95,
  // "gradual" = UFPLS: 25% of every SIPP withdrawal is tax-free (the most
  // tax-efficient default). "lump-sum" = take the 25% up front as cash.
  pensionStrategy: "gradual" as PensionStrategy,
} as const;

export interface FireInputs {
  currentAge: number;
  retirementAge: number;
  targetAnnualIncome: number;
  isaBalance: number;
  isaMonthlyContribution: number;
  sippBalance: number;
  sippMonthlyContribution: number;
  /** General Investment Account — taxable (CGT on gains). Defaults to 0. */
  giaBalance?: number;
  giaMonthlyContribution?: number;
  /** Per-wrapper nominal growth. Each defaults to `growthRate`. */
  isaGrowth?: number;
  giaGrowth?: number;
  sippGrowth?: number;
  growthRate?: number;
  statePensionAnnual?: number;
  statePensionAge?: number;
  sippAccessAge?: number;
  pensionStrategy?: PensionStrategy;
  lifeExpectancyAge?: number;
}

type ResolvedFireInputs = Required<FireInputs>;

export type FirePhase = "accumulation" | "bridge" | "sipp" | "state-pension";

export interface YearSnapshot {
  age: number;
  phase: FirePhase;
  isaBalanceStart: number;
  isaBalanceEnd: number;
  giaBalanceStart: number;
  giaBalanceEnd: number;
  sippBalanceStart: number;
  sippBalanceEnd: number;
  isaWithdrawal: number;
  giaWithdrawal: number;
  sippGrossWithdrawal: number;
  /** Tax-free pension cash taken this year (lump sum, or the 25% UFPLS slice). */
  pensionTaxFreeTaken: number;
  statePensionIncome: number;
  incomeTaxPaid: number;
  capitalGainsTaxPaid: number;
  netIncome: number;
  shortfall: boolean;
}

export interface FireSimulationResult {
  inputs: ResolvedFireInputs;
  timeline: YearSnapshot[];
  /** Upfront tax-free lump sum (only in the "lump-sum" strategy; else 0). */
  taxFreeLumpSum: number;
  /** Total tax-free pension cash taken across the whole plan. */
  totalTaxFreePension: number;
  bridgeToSippTransitionAge: number | null;
  isaDepletedAge: number | null;
  giaDepletedAge: number | null;
  sippDepletedAge: number | null;
  sustainableToLifeExpectancy: boolean;
}

function resolveInputs(inputs: FireInputs): ResolvedFireInputs {
  const growthRate = inputs.growthRate ?? DEFAULT_ASSUMPTIONS.growthRate;
  return {
    ...inputs,
    giaBalance: inputs.giaBalance ?? 0,
    giaMonthlyContribution: inputs.giaMonthlyContribution ?? 0,
    growthRate,
    isaGrowth: inputs.isaGrowth ?? growthRate,
    giaGrowth: inputs.giaGrowth ?? growthRate,
    sippGrowth: inputs.sippGrowth ?? growthRate,
    statePensionAnnual:
      inputs.statePensionAnnual ?? DEFAULT_ASSUMPTIONS.statePensionAnnual,
    statePensionAge:
      inputs.statePensionAge ?? DEFAULT_ASSUMPTIONS.statePensionAge,
    sippAccessAge: inputs.sippAccessAge ?? DEFAULT_ASSUMPTIONS.sippAccessAge,
    pensionStrategy:
      inputs.pensionStrategy ?? DEFAULT_ASSUMPTIONS.pensionStrategy,
    lifeExpectancyAge:
      inputs.lifeExpectancyAge ?? DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
  };
}

export function calculatePersonalAllowance(
  totalIncome: number,
  bands: UkIncomeTaxBands = UK_INCOME_TAX_BANDS_2026_27,
): number {
  if (totalIncome <= bands.taperThreshold) return bands.personalAllowance;
  const reduction = Math.floor((totalIncome - bands.taperThreshold) / 2);
  return Math.max(0, bands.personalAllowance - reduction);
}

export function calculateUkIncomeTax(
  totalIncome: number,
  bands: UkIncomeTaxBands = UK_INCOME_TAX_BANDS_2026_27,
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

/**
 * Simplified UK Capital Gains Tax on a realised gain. The £3,000 annual
 * exempt amount is applied, then gains are taxed at 18% up to the basic-rate
 * ceiling (as stacked on top of the year's income) and 24% above it.
 */
export function calculateCapitalGainsTax(
  realisedGain: number,
  remainingBasicBand: number,
  exemption: number = CGT_ANNUAL_EXEMPT_AMOUNT,
): number {
  const taxable = Math.max(0, realisedGain - exemption);
  if (taxable <= 0) return 0;
  const atBasic = Math.min(taxable, Math.max(0, remainingBasicBand));
  const atHigher = taxable - atBasic;
  return atBasic * CGT_BASIC_RATE + atHigher * CGT_HIGHER_RATE;
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
  bands: UkIncomeTaxBands = UK_INCOME_TAX_BANDS_2026_27,
): number {
  if (targetNet <= 0) return 0;

  const netOf = (gross: number) => {
    const total = otherTaxableIncome + gross;
    return total - calculateUkIncomeTax(total, bands);
  };

  return bisect(netOf, targetNet);
}

/**
 * Gross SIPP withdrawal (UFPLS "gradual" strategy) whose net-of-tax value —
 * with 25% of the withdrawal tax-free up to `remainingLsa`, on top of
 * `otherTaxableIncome` — equals `targetNet`.
 */
export function solveSippGrossForNetGradual(
  targetNet: number,
  otherTaxableIncome: number,
  remainingLsa: number,
): number {
  if (targetNet <= 0) return 0;

  const netOf = (gross: number) => {
    const taxFree = Math.min(0.25 * gross, remainingLsa);
    const taxable = gross - taxFree;
    return (
      taxFree +
      (otherTaxableIncome + taxable) -
      calculateUkIncomeTax(otherTaxableIncome + taxable)
    );
  };

  return bisect(netOf, targetNet);
}

/**
 * Gross GIA withdrawal whose net-of-CGT value equals `targetNet`, for a fixed
 * gains fraction. Net-of-CGT is monotonic in the gross amount within a year.
 */
export function solveGiaGrossForNet(
  targetNet: number,
  gainFraction: number,
  remainingBasicBand: number,
): number {
  if (targetNet <= 0) return 0;
  if (gainFraction <= 0) return targetNet; // no gain → no CGT

  const netOf = (gross: number) =>
    gross - calculateCapitalGainsTax(gross * gainFraction, remainingBasicBand);

  return bisect(netOf, targetNet);
}

/** Bisection for a monotonically increasing net(gross) function. */
function bisect(netOf: (gross: number) => number, targetNet: number): number {
  let lo = 0;
  let hi = Math.max(targetNet * 2, 1000);
  while (netOf(hi) < targetNet && hi < 1e9) hi *= 2;
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
    isaGrowth,
    giaGrowth,
    sippGrowth,
    statePensionAnnual,
    statePensionAge,
    sippAccessAge,
    pensionStrategy,
    lifeExpectancyAge,
  } = inputs;

  let isaBalance = inputs.isaBalance;
  let giaBalance = inputs.giaBalance;
  // Cost basis for CGT: starting GIA is assumed to carry no embedded gain.
  let giaBasis = inputs.giaBalance;
  let sippBalance = inputs.sippBalance;

  const lumpSumAge = Math.max(retirementAge, sippAccessAge);
  let lumpSumTaken = false;
  let taxFreeLumpSum = 0;
  let lsaUsed = 0; // cumulative tax-free pension cash taken (capped at the LSA)

  let bridgeToSippTransitionAge: number | null = null;
  let isaDepletedAge: number | null = null;
  let giaDepletedAge: number | null = null;
  let sippDepletedAge: number | null = null;

  const timeline: YearSnapshot[] = [];

  for (let age = currentAge; age <= lifeExpectancyAge; age++) {
    const isaBalanceStart = isaBalance;
    const giaBalanceStart = giaBalance;
    const sippBalanceStart = sippBalance;

    if (age < retirementAge) {
      isaBalance = isaBalance * (1 + isaGrowth) + inputs.isaMonthlyContribution * 12;
      const giaContribution = inputs.giaMonthlyContribution * 12;
      giaBalance = giaBalance * (1 + giaGrowth) + giaContribution;
      giaBasis += giaContribution;
      sippBalance =
        sippBalance * (1 + sippGrowth) + inputs.sippMonthlyContribution * 12;

      timeline.push({
        age,
        phase: "accumulation",
        isaBalanceStart,
        isaBalanceEnd: isaBalance,
        giaBalanceStart,
        giaBalanceEnd: giaBalance,
        sippBalanceStart,
        sippBalanceEnd: sippBalance,
        isaWithdrawal: 0,
        giaWithdrawal: 0,
        sippGrossWithdrawal: 0,
        pensionTaxFreeTaken: 0,
        statePensionIncome: 0,
        incomeTaxPaid: 0,
        capitalGainsTaxPaid: 0,
        netIncome: 0,
        shortfall: false,
      });
      continue;
    }

    isaBalance *= 1 + isaGrowth;
    giaBalance *= 1 + giaGrowth;
    sippBalance *= 1 + sippGrowth;

    const sippAccessible = age >= sippAccessAge;

    // "lump-sum" strategy: take the 25% PCLS once, as cash into the GIA
    // (it can't fit in an ISA). The remainder is fully taxable on drawdown.
    let pensionTaxFreeTaken = 0;
    if (
      pensionStrategy === "lump-sum" &&
      sippAccessible &&
      !lumpSumTaken &&
      age >= lumpSumAge
    ) {
      const lump = Math.min(
        calculateTaxFreeLumpSum(sippBalance),
        TAX_FREE_LUMP_SUM_CAP - lsaUsed,
      );
      sippBalance -= lump;
      giaBalance += lump; // cash sheltered in the GIA (basis = amount)
      giaBasis += lump;
      taxFreeLumpSum = lump;
      lsaUsed += lump;
      pensionTaxFreeTaken += lump;
      lumpSumTaken = true;
    }

    if (age < sippAccessAge && bridgeToSippTransitionAge === null) {
      bridgeToSippTransitionAge = sippAccessAge;
    }
    const statePensionIncome = age >= statePensionAge ? statePensionAnnual : 0;
    const statePensionNet =
      statePensionIncome - calculateUkIncomeTax(statePensionIncome);

    // The State Pension is guaranteed income, so the pots only need to cover
    // the rest of the target — it offsets ISA/GIA/SIPP drawdown alike.
    let potNeed = Math.max(0, targetAnnualIncome - statePensionNet);

    // 1. ISA — tax-free, drawn first.
    const isaWithdrawal = Math.min(isaBalance, potNeed);
    isaBalance -= isaWithdrawal;
    potNeed -= isaWithdrawal;

    // 2. GIA — CGT on the gains portion.
    let giaWithdrawal = 0;
    let capitalGainsTaxPaid = 0;
    let netFromGia = 0;
    if (potNeed > 0 && giaBalance > 0.01) {
      const gainFraction =
        giaBalance > 0 ? Math.max(0, (giaBalance - giaBasis) / giaBalance) : 0;
      const remainingBasicBand = Math.max(
        0,
        BASIC_RATE_CEILING - statePensionIncome,
      );
      const desiredGross = solveGiaGrossForNet(
        potNeed,
        gainFraction,
        remainingBasicBand,
      );
      giaWithdrawal = Math.min(desiredGross, giaBalance);
      const realisedGain = giaWithdrawal * gainFraction;
      capitalGainsTaxPaid = calculateCapitalGainsTax(
        realisedGain,
        remainingBasicBand,
      );
      netFromGia = giaWithdrawal - capitalGainsTaxPaid;
      const basisConsumed =
        giaBalance > 0 ? giaWithdrawal * (giaBasis / giaBalance) : 0;
      giaBasis = Math.max(0, giaBasis - basisConsumed);
      giaBalance -= giaWithdrawal;
      potNeed -= netFromGia;
    }

    // 3. SIPP — only once accessible, drawn on top of the State Pension.
    // In "gradual" (UFPLS) mode, 25% of each withdrawal is tax-free. The
    // solver targets total net income (pot need + SP net) so the SIPP tax
    // correctly stacks above the State Pension.
    let sippGrossWithdrawal = 0;
    let taxablePortion = 0;
    let gradualTaxFree = 0; // tax-free SIPP slice spent as income this year
    if (sippAccessible && potNeed > 0) {
      const solverTarget = potNeed + statePensionNet;
      if (pensionStrategy === "gradual") {
        const remainingLsa = Math.max(0, TAX_FREE_LUMP_SUM_CAP - lsaUsed);
        const desiredGross = solveSippGrossForNetGradual(
          solverTarget,
          statePensionIncome,
          remainingLsa,
        );
        sippGrossWithdrawal = Math.min(desiredGross, sippBalance);
        gradualTaxFree = Math.min(0.25 * sippGrossWithdrawal, remainingLsa);
        lsaUsed += gradualTaxFree;
        pensionTaxFreeTaken += gradualTaxFree;
        taxablePortion = sippGrossWithdrawal - gradualTaxFree;
      } else {
        const desiredGross = solveGrossIncomeForNet(
          solverTarget,
          statePensionIncome,
        );
        sippGrossWithdrawal = Math.min(desiredGross, sippBalance);
        taxablePortion = sippGrossWithdrawal;
      }
      sippBalance -= sippGrossWithdrawal;
    }

    const incomeTaxPaid = calculateUkIncomeTax(
      statePensionIncome + taxablePortion,
    );
    // Net from the taxable side (State Pension + taxable SIPP) plus the
    // gradual tax-free slice; ISA and GIA are already net.
    const netFromSippAndStatePension =
      gradualTaxFree + statePensionIncome + taxablePortion - incomeTaxPaid;
    const netIncome = isaWithdrawal + netFromGia + netFromSippAndStatePension;
    const shortfall = netIncome < targetAnnualIncome - 0.01;

    if (isaBalance <= 0.01 && isaDepletedAge === null && isaBalanceStart > 0) {
      isaDepletedAge = age;
    }
    if (giaBalance <= 0.01 && giaDepletedAge === null && giaBalanceStart > 0) {
      giaDepletedAge = age;
    }
    if (sippBalance <= 0.01 && sippDepletedAge === null && sippBalanceStart > 0) {
      sippDepletedAge = age;
    }

    timeline.push({
      age,
      phase: age < sippAccessAge
        ? "bridge"
        : age >= statePensionAge
          ? "state-pension"
          : "sipp",
      isaBalanceStart,
      isaBalanceEnd: isaBalance,
      giaBalanceStart,
      giaBalanceEnd: giaBalance,
      sippBalanceStart,
      sippBalanceEnd: sippBalance,
      isaWithdrawal,
      giaWithdrawal,
      sippGrossWithdrawal,
      pensionTaxFreeTaken,
      statePensionIncome,
      incomeTaxPaid,
      capitalGainsTaxPaid,
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
    totalTaxFreePension: lsaUsed,
    bridgeToSippTransitionAge,
    isaDepletedAge,
    giaDepletedAge,
    sippDepletedAge,
    sustainableToLifeExpectancy,
  };
}
