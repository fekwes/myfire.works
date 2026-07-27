/**
 * Measures the cost of one dashboard render's worth of derived figures.
 *
 * The planner recomputes every one of these synchronously whenever the plan
 * changes, and `NumberInput` commits on each keystroke — so this number is
 * roughly the per-keystroke cost of typing in Quick levers. Run it before and
 * after touching any bisection.
 *
 *   npx tsx scripts/bench-solvers.ts
 */
import { computeCoastFire } from "../lib/coast-fire";
import { DEFAULT_INFLATION_RATE, type FireInputs } from "../lib/fire-engine";
import { computeFireNumber } from "../lib/fire-number";
import { retirementSensitivity } from "../lib/what-if";

// A plan with every feature switched on — property, part-time work, a GIA and
// per-wrapper growth — so the walk is as long as a real one gets.
const PLAN: FireInputs = {
  currentAge: 38,
  retirementAge: 55,
  targetAnnualIncome: 40000,
  inflationRate: DEFAULT_INFLATION_RATE,
  isaBalance: 85000,
  isaMonthlyContribution: 1200,
  giaBalance: 20000,
  giaMonthlyContribution: 200,
  sippBalance: 140000,
  sippMonthlyContribution: 900,
  isaGrowth: 0.055,
  giaGrowth: 0.05,
  sippGrowth: 0.05,
  rentalValue: 220000,
  rentalMonthlyIncome: 950,
  homeValue: 400000,
  partTimeAnnualIncome: 8000,
  partTimeUntilAge: 60,
  lifeExpectancyAge: 95,
};

function time(label: string, fn: () => void, runs = 20): number {
  fn(); // warm up
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn();
  const ms = (performance.now() - t0) / runs;
  console.log(`${label.padEnd(28)} ${ms.toFixed(2)} ms`);
  return ms;
}

const fire = time("computeFireNumber", () => void computeFireNumber(PLAN));
const what = time("retirementSensitivity", () => void retirementSensitivity(PLAN));
const coast = time("computeCoastFire", () => void computeCoastFire(PLAN));

console.log("-".repeat(40));
console.log(`${"total per keystroke".padEnd(28)} ${(fire + what + coast).toFixed(2)} ms`);
