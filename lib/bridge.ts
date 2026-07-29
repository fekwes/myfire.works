import { smallestPassing } from "./bisect";
import { type FireInputs, simulateFire } from "./fire-engine";

export interface SustainableIncomeResult {
  bridgeIncome: number | null;
  pensionIncome: number;
  headline: number;
}

function prepareSubInputs(
  inputs: FireInputs,
  zeroPots: string[],
): FireInputs {
  const next = { ...inputs };
  next.isaMonthlyContribution = 0;
  next.giaMonthlyContribution = 0;
  next.sippMonthlyContribution = 0;

  if (zeroPots.includes("isa")) next.isaBalance = 0;
  if (zeroPots.includes("gia")) next.giaBalance = 0;
  if (zeroPots.includes("sipp")) next.sippBalance = 0;

  if (next.pots) {
    next.pots = { ...next.pots };
    for (const key of Object.keys(next.pots)) {
      const pot = next.pots[key];
      const shouldZeroBalance = zeroPots.includes(key);
      next.pots[key] = {
        ...pot,
        monthlyContribution: 0,
        balance: shouldZeroBalance ? 0 : pot.balance,
      };
    }
  }

  return next;
}

export function sustainableIncomeFromPots(
  inputs: FireInputs,
): SustainableIncomeResult | null {
  const country = inputs.country ?? "uk";
  const bridgePotKeys =
    country === "us"
      ? ["brokerage"]
      : country === "es"
      ? ["pias", "cuenta-valores"]
      : ["isa", "gia"];
  const pensionPotKeys =
    country === "us"
      ? ["401k", "roth"]
      : country === "es"
      ? ["plan-pensiones"]
      : ["sipp"];

  const getPotBalance = (key: string) => {
    if (inputs.pots?.[key] !== undefined) return inputs.pots[key].balance;
    if (key === "isa") return inputs.isaBalance ?? 0;
    if (key === "gia") return inputs.giaBalance ?? 0;
    if (key === "sipp") return inputs.sippBalance ?? 0;
    return 0;
  };

  const bridgeBalance = bridgePotKeys.reduce((sum, k) => sum + getPotBalance(k), 0);
  const pensionBalance = pensionPotKeys.reduce((sum, k) => sum + getPotBalance(k), 0);

  if (bridgeBalance <= 0 && pensionBalance <= 0) {
    return null;
  }

  const retirementAge = Math.max(inputs.retirementAge, inputs.currentAge);
  const defaultPensionAccess = country === "us" ? 59.5 : country === "es" ? 65 : 57;
  const sippAccessAge = inputs.sippAccessAge ?? defaultPensionAccess;

  let bridgeIncome: number | null = null;
  const hasBridge = retirementAge < sippAccessAge;

  if (hasBridge) {
    const bridgeFailsAt = (target: number) => {
      const sim = simulateFire(
        prepareSubInputs(
          {
            ...inputs,
            currentAge: inputs.currentAge,
            retirementAge: retirementAge,
            targetAnnualIncome: target,
          },
          pensionPotKeys,
        ),
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

  const pensionRetirementAge = Math.max(retirementAge, sippAccessAge);
  const pensionFailsAt = (target: number) => {
    const sim = simulateFire(
      prepareSubInputs(
        {
          ...inputs,
          currentAge: inputs.currentAge,
          retirementAge: pensionRetirementAge,
          targetAnnualIncome: target,
        },
        hasBridge ? bridgePotKeys : [],
      ),
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
