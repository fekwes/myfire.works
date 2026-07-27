import { smallestPassing } from "./bisect";
import {
  type FireInputs,
  type FireSimulationResult,
  inflatedTargetAt,
  simulateFire,
} from "./fire-engine";

export interface CoastFireResult {
  /** True if current assets, with NO further contributions, sustain the plan. */
  isCoastFire: boolean;
  /** The projection assuming contributions stop today. */
  coastingResult: FireSimulationResult;
  /** Total invested across ISA + GIA + SIPP today. */
  currentInvested: number;
  /** Minimum total needed today (no contributions) to sustain the plan. */
  coastNumber: number;
  /** currentInvested − coastNumber. Negative means a shortfall. */
  surplus: number;
  /**
   * Earliest age at which you could stop contributing and still sustain the
   * plan. Equals currentAge if already coasting; null if the plan doesn't
   * sustain even while contributing right up to retirement.
   */
  coastAge: number | null;
}

function zeroContributions(inputs: FireInputs): FireInputs {
  return {
    ...inputs,
    isaMonthlyContribution: 0,
    giaMonthlyContribution: 0,
    sippMonthlyContribution: 0,
  };
}

function totalInvested(inputs: FireInputs): number {
  return inputs.isaBalance + (inputs.giaBalance ?? 0) + inputs.sippBalance;
}

/**
 * Minimum total invested today (with no further contributions) that sustains
 * the plan, allocated across the pots in the user's current proportions (or a
 * sensible default if they have nothing invested yet). Found by bisection —
 * the plan is monotonic in the starting balance.
 */
function solveCoastNumber(inputs: FireInputs, currentInvested: number): number {
  const total = currentInvested;
  const weights =
    total > 0
      ? {
          isa: inputs.isaBalance / total,
          gia: (inputs.giaBalance ?? 0) / total,
          sipp: inputs.sippBalance / total,
        }
      : { isa: 0.4, gia: 0, sipp: 0.6 };

  const sustainsAt = (amount: number) =>
    simulateFire(
      zeroContributions({
        ...inputs,
        isaBalance: amount * weights.isa,
        giaBalance: amount * weights.gia,
        sippBalance: amount * weights.sipp,
      }),
    ).sustainableToLifeExpectancy;

  return (
    smallestPassing(sustainsAt, {
      initialHi: Math.max(currentInvested * 2, inputs.targetAnnualIncome * 40, 1e6),
      maxHi: 1e9,
    }) ?? 1e9
  );
}

/**
 * The earliest age at which contributions could stop. For each candidate age,
 * we take the balances the contributing plan reaches by that age and re-run
 * the projection from there with contributions switched off.
 */
function solveCoastAge(inputs: FireInputs): number | null {
  const full = simulateFire(inputs);
  const lastAge = Math.min(inputs.retirementAge, inputs.currentAge + 80);

  for (let age = inputs.currentAge; age <= lastAge; age++) {
    const snap = full.timeline.find((y) => y.age === age);
    const isa = snap ? snap.isaBalanceStart : inputs.isaBalance;
    const gia = snap ? snap.giaBalanceStart : (inputs.giaBalance ?? 0);
    const sipp = snap ? snap.sippBalanceStart : inputs.sippBalance;

    const sustains = simulateFire(
      zeroContributions({
        ...inputs,
        currentAge: age,
        // Carry inflation accrued up to this age (moving currentAge forward
        // would otherwise reset the target's inflation baseline).
        targetAnnualIncome: inflatedTargetAt(inputs, age),
        isaBalance: isa,
        giaBalance: gia,
        sippBalance: sipp,
      }),
    ).sustainableToLifeExpectancy;

    if (sustains) return age;
  }
  return null;
}

export function computeCoastFire(inputs: FireInputs): CoastFireResult {
  const coastingResult = simulateFire(zeroContributions(inputs));
  const currentInvested = totalInvested(inputs);
  const coastNumber = solveCoastNumber(inputs, currentInvested);

  return {
    isCoastFire: coastingResult.sustainableToLifeExpectancy,
    coastingResult,
    currentInvested,
    coastNumber,
    surplus: currentInvested - coastNumber,
    coastAge: solveCoastAge(inputs),
  };
}
