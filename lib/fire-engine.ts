import { type Holding, holdingsNetGrowth } from "./assets";
import { ukPack } from "./countries/uk";
import { usPack } from "./countries/us";
import { esPack } from "./countries/es";
import { executeDrawdownSequence } from "./engine/drawdown";

import { calculateTax } from "./engine/tax";

import {
  type UkIncomeTaxBands,
  UK_INCOME_TAX_BANDS_2026_27,
  BASIC_RATE_CEILING,
  TAX_FREE_LUMP_SUM_CAP,
  CGT_ANNUAL_EXEMPT_AMOUNT,
  CGT_BASIC_RATE,
  CGT_HIGHER_RATE,
  calculatePersonalAllowance,
} from "./countries/uk/constants";

export {
  type UkIncomeTaxBands,
  UK_INCOME_TAX_BANDS_2026_27,
  BASIC_RATE_CEILING,
  TAX_FREE_LUMP_SUM_CAP,
  CGT_ANNUAL_EXEMPT_AMOUNT,
  CGT_BASIC_RATE,
  CGT_HIGHER_RATE,
  calculatePersonalAllowance,
};

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

/** Default annual inflation the planner/quiz apply (Bank of England target ~2%,
 *  nudged to 2.5% to be a touch conservative). The engine itself defaults to 0. */
export const DEFAULT_INFLATION_RATE = 0.025;

export interface WrapperInput {
  balance: number;
  monthlyContribution: number;
  growth?: number;
  holdings?: Holding[];
}

export interface FireInputs {
  schemaVersion?: number;
  country?: "uk" | "es" | "us";
  region?: string;
  filingStatus?: "single" | "married-joint";
  
  currentAge: number;
  retirementAge: number;
  targetAnnualIncome: number;
  contributionsUntilAge?: number;
  inflationRate?: number;
  
  pots?: Record<string, WrapperInput>;
  
  // Legacy v1 fields (kept for type compatibility during migration)
  isaBalance?: number;
  isaMonthlyContribution?: number;
  sippBalance?: number;
  sippMonthlyContribution?: number;
  giaBalance?: number;
  giaMonthlyContribution?: number;
  isaGrowth?: number;
  giaGrowth?: number;
  sippGrowth?: number;
  isaHoldings?: Holding[];
  giaHoldings?: Holding[];
  sippHoldings?: Holding[];
  /**
   * Rental property: value grows at `rentalGrowth`; `rentalMonthlyIncome` is
   * taxable rental income (offsets the target in retirement). Optionally sold
   * at `rentalSaleAge` — residential CGT on the gain, net proceeds into the
   * GIA, and the rent then stops. 0 / undefined sale age = keep it.
   */
  rentalValue?: number;
  rentalGrowth?: number;
  rentalMonthlyIncome?: number;
  rentalSaleAge?: number;
  /**
   * "Barista FIRE" part-time work in early retirement: taxable employment
   * income received each retirement year from `retirementAge` until
   * `partTimeUntilAge` (exclusive). Quoted in today's money and grown by
   * inflation, it offsets the target like rental income so the pots draw down
   * less early on. 0 / undefined = none.
   */
  partTimeAnnualIncome?: number;
  partTimeUntilAge?: number;
  /**
   * Home you live in: net worth only, grows at `homeGrowth`. Optionally
   * downsized at `downsizeAge`, releasing `downsizeReleaseFraction` of its
   * value as tax-free cash into the GIA (primary-residence CGT relief).
   */
  homeValue?: number;
  homeGrowth?: number;
  downsizeAge?: number;
  downsizeReleaseFraction?: number;
  growthRate?: number;
  statePensionAnnual?: number;
  statePensionAge?: number;
  sippAccessAge?: number;
  pensionStrategy?: PensionStrategy;
  lifeExpectancyAge?: number;
}

// Holdings are collapsed into the per-wrapper growth scalars by resolveInputs,
// so the resolved shape the simulation runs on doesn't carry them.
type BaseResolvedFireInputs = Required<
  Omit<FireInputs, "schemaVersion" | "country" | "region" | "filingStatus" | "pots" | "pensionStrategy" | "isaHoldings" | "giaHoldings" | "sippHoldings" | "isaBalance" | "isaMonthlyContribution" | "sippBalance" | "sippMonthlyContribution" | "giaBalance" | "giaMonthlyContribution" | "isaGrowth" | "giaGrowth" | "sippGrowth">
>;

export interface ResolvedFireInputs extends BaseResolvedFireInputs {
  schemaVersion?: number;
  country: "uk" | "es" | "us";
  region: string;
  filingStatus: "single" | "married-joint";
  pensionStrategy?: PensionStrategy;
  pots: Record<string, Required<WrapperInput>>;
}

/** A wrapper's growth: derived from its holdings when present, else the manual
 *  scalar, else the global fallback. */
function growthFor(
  holdings: Holding[] | undefined,
  manual: number | undefined,
  fallback: number,
): number {
  if (holdings && holdings.length > 0) return holdingsNetGrowth(holdings);
  return manual ?? fallback;
}

export type FirePhase = "accumulation" | "bridge" | "sipp" | "state-pension";

export interface YearSnapshot {
  age: number;
  phase: FirePhase;
  pots: Record<string, { start: number; end: number }>;
  potWithdrawals: Record<string, { gross: number; taxFree: number }>;
  
  statePensionIncome: number;
  /** Gross rental income received this year (0 once the property is sold). */
  rentalIncome: number;
  /** Taxable part-time ("Barista") income received this year. */
  partTimeIncome: number;
  /** Cash released into the GIA this year from a property sale or downsize. */
  propertyCashReleased: number;
  rentalValueEnd: number;
  homeValueEnd: number;
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
  
  // Backward compatibility: map legacy UK fields to pots if pots is missing
  const pots: Record<string, Required<WrapperInput>> = {};
  if (inputs.pots) {
    for (const [key, pot] of Object.entries(inputs.pots)) {
      pots[key] = {
        balance: pot.balance,
        monthlyContribution: pot.monthlyContribution,
        growth: pot.growth ?? growthRate,
        holdings: pot.holdings ?? [],
      };
    }
  } else {
    pots["isa"] = {
      balance: inputs.isaBalance ?? 0,
      monthlyContribution: inputs.isaMonthlyContribution ?? 0,
      growth: growthFor(inputs.isaHoldings, inputs.isaGrowth, growthRate),
      holdings: inputs.isaHoldings ?? [],
    };
    pots["gia"] = {
      balance: inputs.giaBalance ?? 0,
      monthlyContribution: inputs.giaMonthlyContribution ?? 0,
      growth: growthFor(inputs.giaHoldings, inputs.giaGrowth, growthRate),
      holdings: inputs.giaHoldings ?? [],
    };
    pots["sipp"] = {
      balance: inputs.sippBalance ?? 0,
      monthlyContribution: inputs.sippMonthlyContribution ?? 0,
      growth: growthFor(inputs.sippHoldings, inputs.sippGrowth, growthRate),
      holdings: inputs.sippHoldings ?? [],
    };
  }

  return {
    ...inputs,
    schemaVersion: inputs.schemaVersion,
    country: inputs.country ?? "uk",
    region: inputs.region ?? "zero-tax",
    filingStatus: inputs.filingStatus ?? "single",
    pots,
    contributionsUntilAge: inputs.contributionsUntilAge ?? inputs.retirementAge,
    inflationRate: inputs.inflationRate ?? 0,
    growthRate,
    rentalValue: inputs.rentalValue ?? 0,
    rentalGrowth: inputs.rentalGrowth ?? growthRate,
    rentalMonthlyIncome: inputs.rentalMonthlyIncome ?? 0,
    rentalSaleAge: inputs.rentalSaleAge ?? 0,
    partTimeAnnualIncome: inputs.partTimeAnnualIncome ?? 0,
    partTimeUntilAge: inputs.partTimeUntilAge ?? 0,
    homeValue: inputs.homeValue ?? 0,
    homeGrowth: inputs.homeGrowth ?? growthRate,
    downsizeAge: inputs.downsizeAge ?? 0,
    downsizeReleaseFraction: inputs.downsizeReleaseFraction ?? 0,
    statePensionAnnual:
      inputs.statePensionAnnual ??
      (inputs.country === "us" ? usPack.quizDefaults.defaultStatePensionAnnual : DEFAULT_ASSUMPTIONS.statePensionAnnual),
    statePensionAge:
      inputs.statePensionAge ??
      (inputs.country === "us" ? usPack.quizDefaults.defaultStatePensionAge : DEFAULT_ASSUMPTIONS.statePensionAge),
    sippAccessAge:
      inputs.sippAccessAge ??
      (inputs.country === "us" ? usPack.quizDefaults.defaultPensionAccessAge : DEFAULT_ASSUMPTIONS.sippAccessAge),
    pensionStrategy:
      inputs.country === "us" ? undefined : (inputs.pensionStrategy ?? DEFAULT_ASSUMPTIONS.pensionStrategy),
    // Never below `currentAge`: the projection walks `currentAge`..this age, so
    // a lower value yields an *empty* timeline and every consumer that reads a
    // year out of it ("the pot at retirement", "the last year") reads
    // undefined. Reachable just by typing — the "Plan lasts to" field commits
    // each keystroke, so clearing it to retype 95 passes through 9 first.
    lifeExpectancyAge: Math.max(
      inputs.currentAge,
      inputs.lifeExpectancyAge ?? DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
    ),
  };
}

/**
 * The spending target grown to its nominal value at `atAge` (today's-money
 * target compounded by inflation from `currentAge`). Sub-simulations that move
 * `currentAge` forward — e.g. re-running the plan from retirement — must
 * pre-inflate the target to that age with this, or inflation silently resets.
 */
export function inflatedTargetAt(inputs: FireInputs, atAge: number): number {
  const inflationRate = inputs.inflationRate ?? 0;
  const years = Math.max(0, atAge - inputs.currentAge);
  return inputs.targetAnnualIncome * (1 + inflationRate) ** years;
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


export function simulateFire(rawInputs: FireInputs): FireSimulationResult {
  const inputs = resolveInputs(rawInputs);
  
  const {
    currentAge,
    retirementAge,
    targetAnnualIncome,
    inflationRate,
    statePensionAge,
    lifeExpectancyAge,
    country,
    pots
  } = inputs;

  const pack = country === "us" ? usPack : country === "es" ? esPack : ukPack;
  const regionObj = pack.regions.find(r => r.id === inputs.region);
  const taxSystem = pack.taxSystem(regionObj, inputs.filingStatus);

  let stateBalances: Record<string, number> = {};
  let stateBases: Record<string, number> = {};
  
  for (const [key, pot] of Object.entries(pots)) {
    stateBalances[key] = pot.balance;
    const wrapper = pack.wrappers.find(w => w.id === key);
    if (wrapper?.treatment === "taxable") {
      stateBases[key] = pot.balance;
    }
  }

  // Property. Rental basis assumes the starting value carries no embedded gain.
  let rentalValue = inputs.rentalValue;
  const rentalGrowth = inputs.rentalGrowth;
  const rentalMonthlyIncome = inputs.rentalMonthlyIncome;
  let rentalSold = false;
  const rentalSaleAge = inputs.rentalSaleAge;
  const rentalBasis = inputs.rentalValue;

  let homeValue = inputs.homeValue;
  const homeGrowth = inputs.homeGrowth;
  let homeDownsized = false;
  const downsizeAge = inputs.downsizeAge;
  const downsizeReleaseFraction = 0.5;

  const partTimeAnnualIncome = inputs.partTimeAnnualIncome;
  const partTimeUntilAge = inputs.partTimeUntilAge;

  let lumpSumTaken = false;
  const lumpSumAge = inputs.sippAccessAge ?? 57; // This is a bit UK specific, maybe configure via WrapperSpec? 
  
  // Actually, we can use the pack's taxFreeLifetimeCap
  const taxFreeCap = pack.wrappers.find(w => w.treatment === "tax-deferred")?.taxFreeLifetimeCap || 0;
  let taxFreeLumpSumAvailable = taxFreeCap;
  let totalLumpSumTaken = 0;
  let lumpThisYear = 0;

  const bridgeToSippTransitionAge: number | null = null;
  const depletedAges: Record<string, number | null> = {};
  const startBalances: Record<string, number> = { ...stateBalances };
  
  for (const w of pack.wrappers) {
    depletedAges[w.id] = null;
  }

  const timeline: YearSnapshot[] = [];
  let sustainableToLifeExpectancy = true;
  let totalTaxFreePension = 0;

  for (let age = currentAge; age <= lifeExpectancyAge; age++) {
    const isAccumulation = age < retirementAge;
    
    // 1. Snapshot Start Balances
    const potsSnap: Record<string, { start: number; end: number }> = {};
    for (const key of Object.keys(stateBalances)) {
      potsSnap[key] = { start: stateBalances[key], end: 0 };
    }

    if (isAccumulation) {
      const isContributing = age < inputs.contributionsUntilAge;
      for (const [key, pot] of Object.entries(pots)) {
        const contrib = isContributing ? pot.monthlyContribution * 12 : 0;
        stateBalances[key] = stateBalances[key] * (1 + pot.growth) + contrib;
        if (pack.wrappers.find(w => w.id === key)?.treatment === "taxable") {
          stateBases[key] = (stateBases[key] || 0) + contrib;
        }
      }
      rentalValue *= 1 + rentalGrowth;
      homeValue *= 1 + homeGrowth;

      for (const key of Object.keys(stateBalances)) {
        potsSnap[key].end = stateBalances[key];
      }

      const potWithdrawals: Record<string, { gross: number; taxFree: number }> = {};
      for (const w of pack.wrappers) {
        potWithdrawals[w.id] = { gross: 0, taxFree: 0 };
      }

      timeline.push({
        age,
        phase: "accumulation",
        pots: potsSnap,
        potWithdrawals,
        statePensionIncome: 0,
        rentalIncome: 0,
        partTimeIncome: 0,
        propertyCashReleased: 0,
        rentalValueEnd: rentalValue,
        homeValueEnd: homeValue,
        incomeTaxPaid: 0,
        capitalGainsTaxPaid: 0,
        netIncome: 0,
        shortfall: false,
      });
      continue;
    }

    // Reset yearly trackers
    lumpThisYear = 0;
    
    // DRAWDOWN PHASE
    const inflationFactor = (1 + inflationRate) ** (age - currentAge);
    const yearTarget = targetAnnualIncome * inflationFactor;
    
    // UK Tax Bands are currently frozen until April 2028. Assuming current year is 2024/2025, that's roughly 3-4 years. 
    // We will assume 4 years of frozen bands before they start inflating again.
    const taxBandsFrozenYears = 4; 
    const yearsOfTaxInflation = Math.max(0, (age - currentAge) - taxBandsFrozenYears);
    const taxInflationFactor = (1 + inflationRate) ** yearsOfTaxInflation;

    // Use UK flat state pension or US calculated
    const statePensionAnnual = pack.statePension({ yearsContributed: age - 22 }, age); // Simplification for now
    // Actually, UK State Pension was passed in via inputs.statePensionAnnual. We should use that if available, else fallback to pack.
    const statePensionIncomeAmount = inputs.statePensionAnnual ?? statePensionAnnual;
    
    const statePensionIncome = age >= statePensionAge ? statePensionIncomeAmount * inflationFactor : 0;

    let propertyCashReleased = 0;
    let propertyCgt = 0;
    
    // Find the taxable wrapper to drop proceeds into
    const taxableWrapperId = pack.wrappers.find(w => w.treatment === "taxable")?.id;

    if (!rentalSold && rentalSaleAge > 0 && age >= rentalSaleAge && rentalValue > 0) {
      const gain = Math.max(0, rentalValue - rentalBasis);
      // Property CGT is independent of portfolio CGT, but they stack on total income.
      const rentalIncomeCurrent = rentalMonthlyIncome * 12;
      const partTimeIncomeCurrent = partTimeAnnualIncome > 0 && age < partTimeUntilAge ? partTimeAnnualIncome * inflationFactor : 0;
      
      const combinedIncomes: Partial<Record<string, number>> = {
        "employment": statePensionIncome + rentalIncomeCurrent + partTimeIncomeCurrent,
        "realised-gains": gain,
      };
      
      const taxWithGain = calculateTax(combinedIncomes, taxSystem, age, taxInflationFactor);
      const taxWithoutGain = calculateTax({ "employment": combinedIncomes.employment }, taxSystem, age, taxInflationFactor);
      propertyCgt = taxWithGain.totalTax - taxWithoutGain.totalTax;
      
      const proceeds = rentalValue - propertyCgt;
      if (taxableWrapperId) {
        stateBalances[taxableWrapperId] = (stateBalances[taxableWrapperId] || 0) + proceeds;
        stateBases[taxableWrapperId] = (stateBases[taxableWrapperId] || 0) + proceeds;
      }
      propertyCashReleased += proceeds;
      rentalValue = 0;
      rentalSold = true;
    }
    
    if (!homeDownsized && downsizeAge > 0 && age >= downsizeAge && homeValue > 0) {
      const released = homeValue * downsizeReleaseFraction;
      if (taxableWrapperId) {
        stateBalances[taxableWrapperId] = (stateBalances[taxableWrapperId] || 0) + released;
        stateBases[taxableWrapperId] = (stateBases[taxableWrapperId] || 0) + released;
      }
      propertyCashReleased += released;
      homeValue -= released;
      homeDownsized = true;
    }
    
    const rentalIncome = rentalSold ? 0 : rentalMonthlyIncome * 12;
    const partTimeIncome = partTimeAnnualIncome > 0 && age < partTimeUntilAge ? partTimeAnnualIncome * inflationFactor : 0;
    
    // Other taxable income
    const otherTaxableIncome = statePensionIncome + rentalIncome + partTimeIncome;
    const otherTaxableTax = calculateTax({ "employment": otherTaxableIncome }, taxSystem, age, taxInflationFactor).totalTax;
    const otherTaxableNet = otherTaxableIncome - otherTaxableTax;
    const potNeed = Math.max(0, yearTarget - otherTaxableNet);
    
    // LUMP SUM Strategy
    if (inputs.pensionStrategy === "lump-sum" && age >= lumpSumAge && !lumpSumTaken) {
      const taxDeferredId = pack.wrappers.find(w => w.treatment === "tax-deferred")?.id;
      if (taxDeferredId && stateBalances[taxDeferredId] > 0) {
        const lump = Math.min(stateBalances[taxDeferredId] * 0.25, taxFreeLumpSumAvailable);
        stateBalances[taxDeferredId] -= lump;
        if (taxableWrapperId) {
          stateBalances[taxableWrapperId] = (stateBalances[taxableWrapperId] || 0) + lump;
          stateBases[taxableWrapperId] = (stateBases[taxableWrapperId] || 0) + lump;
        }
        taxFreeLumpSumAvailable -= lump;
        totalTaxFreePension += lump;
        totalLumpSumTaken += lump;
        lumpThisYear = lump;
        lumpSumTaken = true;
      }
    }

    // DRAWDOWN ENGINE EVALUATION
    const strategyName =
      inputs.country === "us"
        ? "brokerage->401k->roth"
        : inputs.country === "es"
        ? "pias->cuenta-valores->plan-pensiones"
        : "isa->gia->sipp";
    
    const availableWrappers = pack.wrappers.map(w => {
      const isPension = w.treatment === "tax-deferred";
      const defaultPensionAccessAge = country === "us" ? 59.5 : country === "es" ? 65 : 57;
      const accessAge = isPension ? (inputs.sippAccessAge ?? w.accessAge ?? defaultPensionAccessAge) : (w.accessAge ?? 0);
      if (age < accessAge) return null;
      
      let fraction = w.taxFreeFractionOnWithdrawal;
      if (w.treatment === "tax-deferred" && inputs.pensionStrategy === "lump-sum") {
        fraction = 0;
      }
      return { ...w, taxFreeFractionOnWithdrawal: fraction };
    }).filter(Boolean) as typeof pack.wrappers;
    
    const drawdownResult = executeDrawdownSequence(
      strategyName,
      potNeed,
      { balances: stateBalances, bases: stateBases },
      otherTaxableIncome,
      taxSystem,
      availableWrappers,
      taxFreeLumpSumAvailable,
      age,
      taxInflationFactor
    );
    
    stateBalances = drawdownResult.state.balances;
    stateBases = drawdownResult.state.bases;
    totalTaxFreePension += Object.values(drawdownResult.potWithdrawals).reduce((sum, w) => sum + w.taxFree, 0);
    
    const netIncome = drawdownResult.netIncomeFromPots + otherTaxableNet;
    const shortfall = netIncome < yearTarget - 0.01;

    for (const key of Object.keys(stateBalances)) {
      if (stateBalances[key] <= 0.01 && depletedAges[key] === null && startBalances[key] > 0) {
        depletedAges[key] = age;
      }
    }

    // Growth for next year
    for (const [key, pot] of Object.entries(pots)) {
      stateBalances[key] = (stateBalances[key] || 0) * (1 + pot.growth);
    }
    rentalValue *= 1 + rentalGrowth;
    homeValue *= 1 + homeGrowth;

    for (const key of Object.keys(stateBalances)) {
      potsSnap[key].end = stateBalances[key];
    }
    
    let phase = age < inputs.sippAccessAge! ? "bridge" : "sipp";
    if (age >= statePensionAge) phase = "state-pension";

    const finalPotWithdrawals = { ...drawdownResult.potWithdrawals };
    if (lumpThisYear > 0) {
      const taxDeferredId = pack.wrappers.find(w => w.treatment === "tax-deferred")?.id;
      if (taxDeferredId && finalPotWithdrawals[taxDeferredId]) {
        finalPotWithdrawals[taxDeferredId].gross += lumpThisYear;
        finalPotWithdrawals[taxDeferredId].taxFree += lumpThisYear;
      }
    }

    timeline.push({
      age,
      phase: phase as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      pots: potsSnap,
      potWithdrawals: finalPotWithdrawals,
      statePensionIncome,
      rentalIncome,
      partTimeIncome,
      propertyCashReleased,
      rentalValueEnd: rentalValue,
      homeValueEnd: homeValue,
      incomeTaxPaid: drawdownResult.incomeTaxPaid + otherTaxableTax,
      capitalGainsTaxPaid: drawdownResult.capitalGainsTaxPaid + propertyCgt,
      netIncome,
      shortfall,
    });
    
    if (shortfall) sustainableToLifeExpectancy = false;
  }

  return {
    inputs,
    timeline,
    taxFreeLumpSum: totalLumpSumTaken,
    totalTaxFreePension,
    bridgeToSippTransitionAge,
    isaDepletedAge: depletedAges["isa"] ?? null,
    giaDepletedAge: depletedAges["gia"] ?? null,
    sippDepletedAge: depletedAges["sipp"] ?? null,
    sustainableToLifeExpectancy
  };
}
