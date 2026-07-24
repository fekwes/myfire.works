import { simulateFire, type FireInputs } from "./fire-engine";

export interface FireNumberResult {
  /** Projected invested pot (ISA + GIA + SIPP) at the start of retirement. */
  projectedAtRetirement: number;
  /**
   * Minimum invested pot at retirement age — held in the user's current pot
   * proportions, with no further contributions — that sustains the target to
   * life expectancy. The classic "FIRE number".
   */
  fireNumber: number;
  /** projectedAtRetirement − fireNumber. Negative means a shortfall. */
  surplus: number;
  /** True when the projection reaches retirement with at least the FIRE number. */
  onTrack: boolean;
}

function zeroContributions(inputs: FireInputs): FireInputs {
  return {
    ...inputs,
    isaMonthlyContribution: 0,
    giaMonthlyContribution: 0,
    sippMonthlyContribution: 0,
  };
}

/**
 * The pot needed at retirement to fund the plan without further saving. Because
 * `simulateFire` is monotonic in the starting balance, we bisect: re-run the
 * plan *from retirement age* with a candidate pot (split across ISA/GIA/SIPP in
 * the projected proportions) and no contributions, and find the smallest pot
 * that still sustains to life expectancy.
 */
export function computeFireNumber(inputs: FireInputs): FireNumberResult {
  const retirementAge = Math.max(inputs.retirementAge, inputs.currentAge);
  const full = simulateFire(inputs);

  const atRetirement =
    full.timeline.find((y) => y.age === retirementAge) ?? full.timeline[0];
  const isa = atRetirement?.isaBalanceStart ?? inputs.isaBalance;
  const gia = atRetirement?.giaBalanceStart ?? inputs.giaBalance ?? 0;
  const sipp = atRetirement?.sippBalanceStart ?? inputs.sippBalance;
  const projectedAtRetirement = isa + gia + sipp;

  const total = projectedAtRetirement;
  const weights =
    total > 0
      ? { isa: isa / total, gia: gia / total, sipp: sipp / total }
      : { isa: 0.4, gia: 0, sipp: 0.6 };

  // A candidate pot at retirement sustains the plan? Re-run from retirement.
  const sustainsAt = (amount: number) =>
    simulateFire(
      zeroContributions({
        ...inputs,
        currentAge: retirementAge,
        isaBalance: amount * weights.isa,
        giaBalance: amount * weights.gia,
        sippBalance: amount * weights.sipp,
      }),
    ).sustainableToLifeExpectancy;

  let lo = 0;
  let hi = Math.max(total * 2, inputs.targetAnnualIncome * 40, 1e6);
  while (!sustainsAt(hi) && hi < 1e9) hi *= 2;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (sustainsAt(mid)) hi = mid;
    else lo = mid;
  }
  const fireNumber = hi;

  return {
    projectedAtRetirement,
    fireNumber,
    surplus: projectedAtRetirement - fireNumber,
    onTrack: projectedAtRetirement >= fireNumber,
  };
}
