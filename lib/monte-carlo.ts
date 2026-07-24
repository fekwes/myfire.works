import { simulateFire, type FireInputs } from "./fire-engine";

/**
 * Monte Carlo confidence model. The precise engine (`simulateFire`) is
 * deterministic and fully tax-aware; this layer re-uses it to derive the
 * starting position, then runs many stochastic decumulation paths with random
 * annual returns to estimate the probability the plan survives — and how three
 * withdrawal strategies compare under sequence-of-returns risk.
 *
 * Simplifications (documented on the methodology page): the invested pots are
 * modelled as one combined portfolio with a single random return each year,
 * guaranteed income (State Pension + rent) is treated as net, and pot
 * withdrawals carry a single effective tax rate taken from the deterministic
 * plan.
 */

// Nominal asset-class assumptions, interpolated by the equity fraction.
const EQUITY = { mean: 0.07, vol: 0.16 };
const BONDS = { mean: 0.025, vol: 0.06 };

const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

export function allocationToReturns(equityFraction: number): {
  mean: number;
  vol: number;
} {
  const e = clamp(equityFraction, 0, 1);
  return {
    mean: EQUITY.mean * e + BONDS.mean * (1 - e),
    vol: EQUITY.vol * e + BONDS.vol * (1 - e),
  };
}

export type StrategyKey = "flat" | "guard5" | "guard10";

export interface StrategyResult {
  key: StrategyKey;
  label: string;
  /** Fraction of paths that funded the target every year to life expectancy. */
  successRate: number;
  /** 10th / 50th / 90th percentile combined portfolio value by age. */
  percentiles: { age: number; p10: number; p50: number; p90: number }[];
}

export interface MonteCarloResult {
  equityFraction: number;
  mean: number;
  vol: number;
  sims: number;
  startAge: number;
  endAge: number;
  strategies: StrategyResult[];
}

export interface MonteCarloOptions {
  equityFraction?: number;
  sims?: number;
  seed?: number;
}

// Seedable RNG (mulberry32) + standard normal via Box–Muller.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNormal(rng: () => number): () => number {
  return () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(Math.floor(q * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}

const STRATEGIES: { key: StrategyKey; label: string; band: number }[] = [
  { key: "flat", label: "Flat", band: 0 },
  { key: "guard5", label: "Guardrails ±5%", band: 0.05 },
  { key: "guard10", label: "Guardrails ±10%", band: 0.1 },
];

export function runMonteCarlo(
  inputs: FireInputs,
  opts: MonteCarloOptions = {},
): MonteCarloResult {
  const { equityFraction = 0.8, sims = 1000, seed = 1234567 } = opts;
  const { mean, vol } = allocationToReturns(equityFraction);

  // Deterministic run gives us the starting pot, guaranteed income by age, and
  // the plan's effective tax rate on gross income.
  const det = simulateFire(inputs);
  const retired = det.timeline.filter((y) => y.phase !== "accumulation");
  const target = det.inputs.targetAnnualIncome;
  const startAge = retired[0]?.age ?? det.inputs.retirementAge;
  const endAge = det.inputs.lifeExpectancyAge;

  const first = retired[0];
  const startPot = first
    ? first.isaBalanceStart + first.giaBalanceStart + first.sippBalanceStart
    : 0;

  const guaranteedByAge = new Map<number, number>();
  let grossIncome = 0;
  let totalTax = 0;
  for (const y of retired) {
    guaranteedByAge.set(
      y.age,
      y.statePensionIncome + y.rentalIncome + y.partTimeIncome,
    );
    grossIncome +=
      y.isaWithdrawal +
      y.giaWithdrawal +
      y.sippGrossWithdrawal +
      y.statePensionIncome +
      y.rentalIncome +
      y.partTimeIncome;
    totalTax += y.incomeTaxPaid + y.capitalGainsTaxPaid;
  }
  const effTax = grossIncome > 0 ? clamp(totalTax / grossIncome, 0, 0.45) : 0;

  const baseRate = startPot > 0 ? target / startPot : 0;
  const normal = makeNormal(mulberry32(seed));
  const ages = Array.from({ length: endAge - startAge + 1 }, (_, i) => startAge + i);

  const strategies: StrategyResult[] = STRATEGIES.map(({ key, label, band }) => {
    let successes = 0;
    // valuesByAge[i] = array of portfolio values at ages[i] across sims.
    const valuesByAge: number[][] = ages.map(() => []);

    for (let s = 0; s < sims; s++) {
      let pot = startPot;
      let spend = target;
      let failed = false;

      for (let i = 0; i < ages.length; i++) {
        const age = ages[i];
        const r = clamp(mean + vol * normal(), -0.9, 2);
        pot *= 1 + r;

        // Guardrails: cut spending when the pot is stretched, recover toward
        // the target (never above it) when it's comfortable.
        if (band > 0 && pot > 0) {
          const rate = spend / pot;
          if (rate > baseRate * 1.15) spend = Math.max(target * 0.5, spend * (1 - band));
          else if (rate < baseRate * 0.85) spend = Math.min(target, spend * (1 + band));
        }

        const guaranteed = guaranteedByAge.get(age) ?? 0;
        const potNetNeed = Math.max(0, spend - guaranteed);
        const potGross = potNetNeed / (1 - effTax);

        if (potGross > pot) {
          failed = true;
          pot = 0;
        } else {
          pot -= potGross;
        }
        valuesByAge[i].push(pot);
      }

      if (!failed) successes++;
    }

    const percentiles = ages.map((age, i) => {
      const sorted = valuesByAge[i].slice().sort((a, b) => a - b);
      return {
        age,
        p10: Math.round(percentile(sorted, 0.1)),
        p50: Math.round(percentile(sorted, 0.5)),
        p90: Math.round(percentile(sorted, 0.9)),
      };
    });

    return { key, label, successRate: successes / sims, percentiles };
  });

  return { equityFraction, mean, vol, sims, startAge, endAge, strategies };
}
