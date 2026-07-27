import { smallestPassing } from "./bisect";
import {
  type FireInputs,
  inflatedTargetAt,
  simulateFire,
} from "./fire-engine";

export interface FireNumberResult {
  projectedAtRetirement: number;
  fireNumber: number;
  bridgeRequired: number;
  pensionRequired: number;
  bridgeGap: number;
  surplus: number;
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

  const targetAtRetirement = inflatedTargetAt(inputs, retirementAge);

  let bridgeRequired = 0;
  let pensionRequired = 0;
  const sippAccessAge = inputs.sippAccessAge ?? 57;

  if (retirementAge >= sippAccessAge) {
    const sustainsPension = (amount: number) =>
      simulateFire(
        zeroContributions({
          ...inputs,
          currentAge: retirementAge,
          targetAnnualIncome: targetAtRetirement,
          isaBalance: 0,
          giaBalance: 0,
          sippBalance: amount,
        })
      ).sustainableToLifeExpectancy;

    pensionRequired =
      smallestPassing(sustainsPension, {
        initialHi: Math.max(total * 2, inputs.targetAnnualIncome * 40, 1e6),
        maxHi: 1e9,
      }) ?? 1e9;
  } else {
    // Stage 1: Bridge
    const bridgeRatio = weights.isa + weights.gia > 0 ? weights.isa / (weights.isa + weights.gia) : 1;
    const giaRatio = 1 - bridgeRatio;

    const sustainsBridge = (amount: number) => {
      const sim = simulateFire(
        zeroContributions({
          ...inputs,
          currentAge: retirementAge,
          targetAnnualIncome: targetAtRetirement,
          isaBalance: amount * bridgeRatio,
          giaBalance: amount * giaRatio,
          sippBalance: 0,
        })
      );
      return !sim.timeline
        .filter((y) => y.age >= retirementAge && y.age < sippAccessAge)
        .some((y) => y.shortfall);
    };

    bridgeRequired =
      smallestPassing(sustainsBridge, {
        initialHi: Math.max(total, inputs.targetAnnualIncome * 10, 1e5),
        maxHi: 1e9,
      }) ?? 0;

    // Stage 2: Pension
    // Calculate the total required using the fixed proportions, 
    // to avoid the 45% SIPP tax overshoot caused by forcing the pension leg into 100% SIPP.
    const sustainsTotal = (amount: number) =>
      simulateFire(
        zeroContributions({
          ...inputs,
          currentAge: retirementAge,
          targetAnnualIncome: targetAtRetirement,
          isaBalance: amount * weights.isa,
          giaBalance: amount * weights.gia,
          sippBalance: amount * weights.sipp,
        })
      ).sustainableToLifeExpectancy;

    const baseFireNumber =
      smallestPassing(sustainsTotal, {
        initialHi: Math.max(total * 2, inputs.targetAnnualIncome * 40, 1e6),
        maxHi: 1e9,
      }) ?? 1e9;
    
    pensionRequired = Math.max(0, baseFireNumber - bridgeRequired);
  }

  const fireNumber = bridgeRequired + pensionRequired;
  const bridgeGap = Math.max(0, bridgeRequired - (isa + gia));

  return {
    projectedAtRetirement,
    fireNumber,
    bridgeRequired,
    pensionRequired,
    bridgeGap,
    surplus: projectedAtRetirement - fireNumber,
    onTrack: projectedAtRetirement >= fireNumber,
  };
}
