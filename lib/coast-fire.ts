import { smallestPassing } from "./bisect";
import {
  type FireInputs,
  type FireSimulationResult,
  type WrapperInput,
  inflatedTargetAt,
  simulateFire,
} from "./fire-engine";

export interface CoastFireResult {
  /** True if current assets, with NO further contributions, sustain the plan. */
  isCoastFire: boolean;
  /** The projection assuming contributions stop today. */
  coastingResult: FireSimulationResult;
  /** Total invested across all pots today. */
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
  const newInputs: FireInputs = {
    ...inputs,
    isaMonthlyContribution: 0,
    giaMonthlyContribution: 0,
    sippMonthlyContribution: 0,
    contributionsUntilAge: inputs.currentAge,
  };
  if (newInputs.pots) {
    const newPots: Record<string, WrapperInput> = {};
    for (const [key, pot] of Object.entries(newInputs.pots)) {
      newPots[key] = { ...pot, monthlyContribution: 0 };
    }
    newInputs.pots = newPots;
  }
  return newInputs;
}

function totalInvested(inputs: FireInputs): number {
  if (inputs.pots) {
    return Object.values(inputs.pots).reduce((sum, p) => sum + (p.balance ?? 0), 0);
  }
  return (inputs.isaBalance ?? 0) + (inputs.giaBalance ?? 0) + (inputs.sippBalance ?? 0);
}

/**
 * Minimum total invested today (with no further contributions) that sustains
 * the plan, allocated across the pots in the user's current proportions.
 */
function solveCoastNumber(inputs: FireInputs, currentInvested: number): number {
  const total = currentInvested;
  const isUS = inputs.country === "us";
  const isES = inputs.country === "es";
  
  let isaBal = 0;
  let giaBal = 0;
  let sippBal = 0;
  if (inputs.pots) {
    if (isUS) {
      isaBal = inputs.pots.brokerage?.balance ?? 0;
      sippBal = (inputs.pots["401k"]?.balance ?? 0) + (inputs.pots["roth"]?.balance ?? 0);
    } else if (isES) {
      isaBal = inputs.pots.pias?.balance ?? 0;
      giaBal = inputs.pots["cuenta-valores"]?.balance ?? 0;
      sippBal = inputs.pots["plan-pensiones"]?.balance ?? 0;
    } else {
      isaBal = inputs.pots.isa?.balance ?? 0;
      giaBal = inputs.pots.gia?.balance ?? 0;
      sippBal = inputs.pots.sipp?.balance ?? 0;
    }
  } else {
    isaBal = inputs.isaBalance ?? 0;
    giaBal = inputs.giaBalance ?? 0;
    sippBal = inputs.sippBalance ?? 0;
  }

  const weights =
    total > 0
      ? {
          isa: isaBal / total,
          gia: giaBal / total,
          sipp: sippBal / total,
        }
      : { isa: 0.4, gia: 0, sipp: 0.6 };

  const sustainsAt = (amount: number) => {
    const testInputs = zeroContributions({
      ...inputs,
      isaBalance: amount * weights.isa,
      giaBalance: amount * weights.gia,
      sippBalance: amount * weights.sipp,
    });

    if (testInputs.pots) {
      const pots: Record<string, WrapperInput> = { ...testInputs.pots };
      if (isUS) {
        if (pots.brokerage) pots.brokerage = { ...pots.brokerage, balance: amount * (weights.isa + weights.gia) };
        if (pots["401k"]) pots["401k"] = { ...pots["401k"], balance: amount * weights.sipp };
      } else if (isES) {
        if (pots.pias) pots.pias = { ...pots.pias, balance: amount * weights.isa };
        if (pots["cuenta-valores"]) pots["cuenta-valores"] = { ...pots["cuenta-valores"], balance: amount * weights.gia };
        if (pots["plan-pensiones"]) pots["plan-pensiones"] = { ...pots["plan-pensiones"], balance: amount * weights.sipp };
      } else {
        if (pots.isa) pots.isa = { ...pots.isa, balance: amount * weights.isa };
        if (pots.gia) pots.gia = { ...pots.gia, balance: amount * weights.gia };
        if (pots.sipp) pots.sipp = { ...pots.sipp, balance: amount * weights.sipp };
      }
      testInputs.pots = pots;
    }
    return simulateFire(testInputs).sustainableToLifeExpectancy;
  };

  return (
    smallestPassing(sustainsAt, {
      initialHi: Math.max(currentInvested * 2, inputs.targetAnnualIncome * 40, 1e6),
      maxHi: 1e9,
    }) ?? 1e9
  );
}

/**
 * The earliest age at which contributions could stop.
 */
function solveCoastAge(inputs: FireInputs): number | null {
  const full = simulateFire(inputs);
  const lastAge = Math.min(inputs.retirementAge, inputs.currentAge + 80);

  for (let age = inputs.currentAge; age <= lastAge; age++) {
    const snap = full.timeline.find((y) => y.age === age);
    
    const testInputs = zeroContributions({
      ...inputs,
      currentAge: age,
      targetAnnualIncome: inflatedTargetAt(inputs, age),
    });

    if (snap && testInputs.pots) {
      const pots: Record<string, WrapperInput> = {};
      for (const [key, potSnap] of Object.entries(snap.pots)) {
        pots[key] = {
          balance: potSnap.start,
          monthlyContribution: 0,
          growth: inputs.pots?.[key]?.growth,
        };
      }
      testInputs.pots = pots;
    }

    if (simulateFire(testInputs).sustainableToLifeExpectancy) return age;
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
