import { smallestPassing } from "./bisect";
import { type FireInputs, simulateFire } from "./fire-engine";
import { computeFireNumber } from "./fire-number";

/**
 * Minimum total monthly contribution (ISA + SIPP, split in the plan's current
 * proportions) that makes the plan sustainable to life expectancy at a given
 * retirement age. `simulateFire` is monotonic in contributions, so we bisect.
 * Returns `Infinity` if no amount of saving can make that age work.
 */
export function minMonthlyForSustainable(
  inputs: FireInputs,
  retireAge: number,
): number {
  const currentTotal =
    inputs.isaMonthlyContribution + inputs.sippMonthlyContribution;
  const isaFrac =
    currentTotal > 0 ? inputs.isaMonthlyContribution / currentTotal : 0.5;

  const sustainsAt = (monthly: number) =>
    simulateFire({
      ...inputs,
      retirementAge: retireAge,
      isaMonthlyContribution: monthly * isaFrac,
      sippMonthlyContribution: monthly * (1 - isaFrac),
    }).sustainableToLifeExpectancy;

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
  const currentTotal = inputs.isaMonthlyContribution + (inputs.giaMonthlyContribution ?? 0) + inputs.sippMonthlyContribution;
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
    const currentTotalIsaSipp = inputs.isaMonthlyContribution + inputs.sippMonthlyContribution;
    const isaFrac = currentTotalIsaSipp > 0 ? inputs.isaMonthlyContribution / currentTotalIsaSipp : 0.5;
    extraIsaGia = extraNeeded * isaFrac;
    extraSipp = extraNeeded * (1 - isaFrac);
  }

  const sippAccessAge = inputs.sippAccessAge ?? 57;
  // Handle zero-length bridge case
  if (inputs.retirementAge >= sippAccessAge) {
    extraIsaGia = 0;
    extraSipp = extraNeeded;
  }

  return { total: needed, extraNeeded, extraIsaGia, extraSipp };
}

export interface RetirementSensitivity {
  currentRetirementAge: number;
  currentMonthly: number;
  /** Retiring one year earlier: extra £/mo needed to stay on track, or null
   *  if no amount of extra saving can make it work (or the age is < today). */
  earlierAge: number | null;
  earlierExtraMonthly: number | null;
  /** Retiring one year later: £/mo you could stop contributing and stay on track. */
  laterAge: number;
  laterSavingMonthly: number;
}

/**
 * "What if I retire a year earlier / later?" — the extra monthly saving needed
 * to pull retirement forward a year, and the saving you could drop by pushing
 * it back a year, both while keeping the plan sustainable.
 */
export function retirementSensitivity(
  inputs: FireInputs,
): RetirementSensitivity {
  const currentMonthly =
    inputs.isaMonthlyContribution + inputs.sippMonthlyContribution;
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
