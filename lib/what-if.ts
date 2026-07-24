import { type FireInputs, simulateFire } from "./fire-engine";

/**
 * Minimum total monthly contribution (ISA + SIPP, split in the plan's current
 * proportions) that makes the plan sustainable to life expectancy at a given
 * retirement age. `simulateFire` is monotonic in contributions, so we bisect.
 * Returns `Infinity` if no amount of saving can make that age work.
 */
function minMonthlyForSustainable(
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
  let lo = 0;
  let hi = Math.max(currentTotal * 2, 5000);
  while (!sustainsAt(hi) && hi < 1e6) hi *= 2;
  if (!sustainsAt(hi)) return Infinity;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (sustainsAt(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
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
