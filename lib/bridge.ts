import { smallestPassing } from "./bisect";
import { type FireInputs, simulateFire } from "./fire-engine";

export interface SustainableIncomeResult {
  bridgeIncome: number | null;
  pensionIncome: number;
  headline: number;
}

function zeroContributions(inputs: FireInputs): FireInputs {
  return {
    ...inputs,
    isaMonthlyContribution: 0,
    giaMonthlyContribution: 0,
    sippMonthlyContribution: 0,
  };
}

export function sustainableIncomeFromPots(
  inputs: FireInputs,
): SustainableIncomeResult | null {
  if (
    inputs.isaBalance === 0 &&
    inputs.giaBalance === 0 &&
    inputs.sippBalance === 0
  ) {
    return null;
  }

  const retirementAge = Math.max(inputs.retirementAge, inputs.currentAge);
  const sippAccessAge = inputs.sippAccessAge ?? 57;

  let bridgeIncome: number | null = null;

  if (retirementAge < sippAccessAge) {
    const bridgeFailsAt = (target: number) => {
      const sim = simulateFire(
        zeroContributions({
          ...inputs,
          currentAge: inputs.currentAge,
          retirementAge: retirementAge,
          targetAnnualIncome: target,
          sippBalance: 0,
        }),
      );
      return sim.timeline
        .filter((y) => y.age >= retirementAge && y.age < sippAccessAge)
        .some((y) => y.shortfall);
    };

    const smallestFailing = smallestPassing(bridgeFailsAt, {
      initialHi: 10000,
      maxHi: 1000000,
    });
    bridgeIncome = smallestFailing === null ? 1000000 : Math.max(0, smallestFailing - 1);
  }

  const pensionFailsAt = (target: number) => {
    const sim = simulateFire(
      zeroContributions({
        ...inputs,
        currentAge: inputs.currentAge,
        retirementAge: sippAccessAge,
        targetAnnualIncome: target,
        isaBalance: 0,
        giaBalance: 0,
      }),
    );
    return !sim.sustainableToLifeExpectancy;
  };

  const smallestFailingPension = smallestPassing(pensionFailsAt, {
    initialHi: 10000,
    maxHi: 1000000,
  });
  const pensionIncome = smallestFailingPension === null ? 1000000 : Math.max(0, smallestFailingPension - 1);

  return {
    bridgeIncome,
    pensionIncome,
    headline: bridgeIncome !== null ? Math.min(bridgeIncome, pensionIncome) : pensionIncome,
  };
}
