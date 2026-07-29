import { smallestPassing } from "./bisect";
import { type FireInputs, type WrapperInput, simulateFire } from "./fire-engine";
import { computeFireNumber } from "./fire-number";

function totalMonthlyContributions(inputs: FireInputs): number {
  if (inputs.pots) {
    return Object.values(inputs.pots).reduce((sum, p) => sum + (p.monthlyContribution ?? 0), 0);
  }
  return (inputs.isaMonthlyContribution ?? 0) + (inputs.giaMonthlyContribution ?? 0) + (inputs.sippMonthlyContribution ?? 0);
}

/**
 * Minimum total monthly contribution that makes the plan sustainable to life expectancy
 * at a given retirement age. Supports v2 pots and all country packs.
 */
export function minMonthlyForSustainable(
  inputs: FireInputs,
  retireAge: number,
): number {
  const currentTotal = totalMonthlyContributions(inputs);
  const isUS = inputs.country === "us";
  const isES = inputs.country === "es";

  let bridgeContrib = 0;
  let pensionContrib = 0;

  if (inputs.pots) {
    if (isUS) {
      bridgeContrib = inputs.pots.brokerage?.monthlyContribution ?? 0;
      pensionContrib = (inputs.pots["401k"]?.monthlyContribution ?? 0) + (inputs.pots["roth"]?.monthlyContribution ?? 0);
    } else if (isES) {
      bridgeContrib = (inputs.pots.pias?.monthlyContribution ?? 0) + (inputs.pots["cuenta-valores"]?.monthlyContribution ?? 0);
      pensionContrib = inputs.pots["plan-pensiones"]?.monthlyContribution ?? 0;
    } else {
      bridgeContrib = (inputs.pots.isa?.monthlyContribution ?? 0) + (inputs.pots.gia?.monthlyContribution ?? 0);
      pensionContrib = inputs.pots.sipp?.monthlyContribution ?? 0;
    }
  } else {
    bridgeContrib = (inputs.isaMonthlyContribution ?? 0) + (inputs.giaMonthlyContribution ?? 0);
    pensionContrib = inputs.sippMonthlyContribution ?? 0;
  }

  const bridgeFrac = currentTotal > 0 ? bridgeContrib / currentTotal : 0.4;
  const pensionFrac = currentTotal > 0 ? pensionContrib / currentTotal : 0.6;

  const sustainsAt = (monthly: number) => {
    const testInputs: FireInputs = {
      ...inputs,
      retirementAge: retireAge,
      isaMonthlyContribution: monthly * bridgeFrac,
      giaMonthlyContribution: 0,
      sippMonthlyContribution: monthly * pensionFrac,
    };

    if (testInputs.pots) {
      const pots: Record<string, WrapperInput> = { ...testInputs.pots };
      if (isUS) {
        if (pots.brokerage) pots.brokerage = { ...pots.brokerage, monthlyContribution: monthly * bridgeFrac };
        if (pots["401k"]) pots["401k"] = { ...pots["401k"], monthlyContribution: monthly * pensionFrac };
      } else if (isES) {
        if (pots.pias) pots.pias = { ...pots.pias, monthlyContribution: monthly * bridgeFrac };
        if (pots["plan-pensiones"]) pots["plan-pensiones"] = { ...pots["plan-pensiones"], monthlyContribution: monthly * pensionFrac };
      } else {
        if (pots.isa) pots.isa = { ...pots.isa, monthlyContribution: monthly * bridgeFrac };
        if (pots.sipp) pots.sipp = { ...pots.sipp, monthlyContribution: monthly * pensionFrac };
      }
      testInputs.pots = pots;
    }

    return simulateFire(testInputs).sustainableToLifeExpectancy;
  };

  if (sustainsAt(0)) return 0;
  return (
    smallestPassing(sustainsAt, {
      initialHi: Math.max(currentTotal * 2, 5000),
      maxHi: 1e6,
    }) ?? Infinity
  );
}

export interface RequiredContributions {
  total: number;
  extraNeeded: number;
  extraIsaGia: number;
  extraSipp: number;
}

export function requiredContributions(inputs: FireInputs): RequiredContributions | null {
  const currentTotal = totalMonthlyContributions(inputs);
  const needed = minMonthlyForSustainable(inputs, inputs.retirementAge);
  
  if (!Number.isFinite(needed)) {
    return null; // unreachable
  }

  const extraNeeded = Math.max(0, needed - currentTotal);
  if (extraNeeded === 0) {
    return { total: needed, extraNeeded: 0, extraIsaGia: 0, extraSipp: 0 };
  }

  // Split the extra.
  const fnRes = computeFireNumber(inputs);
  const bridgeGap = fnRes.bridgeGap;

  let extraIsaGia = 0;
  let extraSipp = 0;

  if (bridgeGap > 0) {
    extraIsaGia = extraNeeded; // Direct the extra to the bridge pots first
  } else {
    extraIsaGia = extraNeeded * 0.5;
    extraSipp = extraNeeded * 0.5;
  }

  const pensionAccessAge = inputs.sippAccessAge ?? (inputs.country === "es" ? 65 : 57);
  // Handle zero-length bridge case
  if (inputs.retirementAge >= pensionAccessAge) {
    extraIsaGia = 0;
    extraSipp = extraNeeded;
  }

  return { total: needed, extraNeeded, extraIsaGia, extraSipp };
}

export interface RetirementSensitivity {
  currentRetirementAge: number;
  currentMonthly: number;
  earlierAge: number | null;
  earlierExtraMonthly: number | null;
  laterAge: number;
  laterSavingMonthly: number;
}

export function retirementSensitivity(
  inputs: FireInputs,
): RetirementSensitivity {
  const currentMonthly = totalMonthlyContributions(inputs);
  const earlierAge = inputs.retirementAge - 1;
  const laterAge = inputs.retirementAge + 1;

  let earlierExtraMonthly: number | null = null;
  let earlierAgeOut: number | null = null;
  if (earlierAge >= inputs.currentAge) {
    earlierAgeOut = earlierAge;
    const needed = minMonthlyForSustainable(inputs, earlierAge);
    earlierExtraMonthly = Number.isFinite(needed)
      ? Math.max(0, needed - currentMonthly)
      : null;
  }

  const neededLater = minMonthlyForSustainable(inputs, laterAge);
  const laterSavingMonthly = Number.isFinite(neededLater)
    ? Math.max(0, currentMonthly - neededLater)
    : 0;

  return {
    currentRetirementAge: inputs.retirementAge,
    currentMonthly,
    earlierAge: earlierAgeOut,
    earlierExtraMonthly,
    laterAge,
    laterSavingMonthly,
  };
}
