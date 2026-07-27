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

function testInputsWithPots(inputs: FireInputs, isa: number, gia: number, sipp: number): FireInputs {
  const newInputs = { ...inputs };
  newInputs.isaBalance = isa;
  newInputs.giaBalance = gia;
  newInputs.sippBalance = sipp;
  newInputs.isaMonthlyContribution = 0;
  newInputs.giaMonthlyContribution = 0;
  newInputs.sippMonthlyContribution = 0;

  if (newInputs.pots) {
    newInputs.pots = { ...newInputs.pots };
    if (newInputs.pots.isa) {
      newInputs.pots.isa = { ...newInputs.pots.isa, balance: isa, monthlyContribution: 0 };
    }
    if (newInputs.pots.gia) {
      newInputs.pots.gia = { ...newInputs.pots.gia, balance: gia, monthlyContribution: 0 };
    }
    if (newInputs.pots.sipp) {
      newInputs.pots.sipp = { ...newInputs.pots.sipp, balance: sipp, monthlyContribution: 0 };
    }
  }
  return newInputs;
}

export function computeFireNumber(inputs: FireInputs): FireNumberResult {
  const retirementAge = Math.max(inputs.retirementAge, inputs.currentAge);
  const full = simulateFire(inputs);

  const atRetirement =
    full.timeline.find((y) => y.age === retirementAge) ?? full.timeline[0];
  const isa = atRetirement?.pots.isa.start ?? (inputs.pots?.isa?.balance ?? inputs.isaBalance ?? 0);
  const gia = atRetirement?.pots.gia.start ?? (inputs.pots?.gia?.balance ?? inputs.giaBalance ?? 0) ?? 0;
  const sipp = atRetirement?.pots.sipp.start ?? (inputs.pots?.sipp?.balance ?? inputs.sippBalance ?? 0);
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
        testInputsWithPots(
          { ...inputs, currentAge: retirementAge, targetAnnualIncome: targetAtRetirement },
          0,
          0,
          amount
        )
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
        testInputsWithPots(
          { ...inputs, currentAge: retirementAge, targetAnnualIncome: targetAtRetirement },
          amount * bridgeRatio,
          amount * giaRatio,
          0
        )
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
        testInputsWithPots(
          { ...inputs, currentAge: retirementAge, targetAnnualIncome: targetAtRetirement },
          amount * weights.isa,
          amount * weights.gia,
          amount * weights.sipp
        )
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
