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
    // Zero out ALL pots first to ensure we don't accidentally leave US, ES or other country pots with their full balances
    for (const key of Object.keys(newInputs.pots)) {
      newInputs.pots[key] = { ...newInputs.pots[key], balance: 0, monthlyContribution: 0 };
    }
    
    // Then assign the test amounts to the UK aliases
    if (newInputs.pots.isa) newInputs.pots.isa.balance = isa;
    if (newInputs.pots.gia) newInputs.pots.gia.balance = gia;
    if (newInputs.pots.sipp) newInputs.pots.sipp.balance = sipp;
    
    // US pots
    if (newInputs.country === "us") {
      if (newInputs.pots.brokerage) newInputs.pots.brokerage.balance = isa + gia;
      if (newInputs.pots["401k"]) newInputs.pots["401k"].balance = sipp;
    }

    // Spain pots
    if (newInputs.country === "es") {
      if (newInputs.pots.pias) newInputs.pots.pias.balance = isa;
      if (newInputs.pots["cuenta-valores"]) newInputs.pots["cuenta-valores"].balance = gia;
      if (newInputs.pots["plan-pensiones"]) newInputs.pots["plan-pensiones"].balance = sipp;
    }
  }
  return newInputs;
}

export function computeFireNumber(inputs: FireInputs): FireNumberResult {
  const retirementAge = Math.max(inputs.retirementAge, inputs.currentAge);
  const full = simulateFire(inputs);

  const atRetirement =
    full.timeline.find((y) => y.age === retirementAge) ?? full.timeline[0];
  
  let projectedAtRetirement = 0;
  if (atRetirement) {
    for (const key of Object.keys(atRetirement.pots)) {
      projectedAtRetirement += atRetirement.pots[key].start;
    }
  }

  const total = projectedAtRetirement;
  
  // Weights for bridge vs pension split when testing requirements
  const isUS = inputs.country === "us";
  const isES = inputs.country === "es";
  const bridgePots = isUS ? ["brokerage"] : isES ? ["pias", "cuenta-valores"] : ["isa", "gia"];
  const pensionPots = isUS ? ["401k", "roth"] : isES ? ["plan-pensiones"] : ["sipp"];
  
  let bridgeBalance = 0;
  let pensionBalance = 0;
  
  if (atRetirement) {
    for (const key of bridgePots) {
      if (atRetirement.pots[key]) bridgeBalance += atRetirement.pots[key].start;
    }
    for (const key of pensionPots) {
      if (atRetirement.pots[key]) pensionBalance += atRetirement.pots[key].start;
    }
  }

  const weights =
    total > 0
      ? { isa: bridgeBalance / total, gia: 0, sipp: pensionBalance / total }
      : { isa: 0.4, gia: 0, sipp: 0.6 };

  const targetAtRetirement = inflatedTargetAt(inputs, retirementAge);

  let bridgeRequired = 0;
  let pensionRequired = 0;
  const sippAccessAge = inputs.sippAccessAge ?? (isES ? 65 : 57);

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
  const bridgeGap = Math.max(0, bridgeRequired - bridgeBalance);

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
