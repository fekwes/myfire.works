import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_INFLATION_RATE,
  type FireInputs,
} from "./fire-engine";
import { FUND_BY_ID, netGrowth } from "./vanguard-funds";

/**
 * The onboarding quiz collects only the handful of inputs that materially move
 * the projection; everything else is filled with documented silent defaults in
 * {@link assembleQuizInputs}. It's a partial `FireInputs` built up step by step.
 */
export type QuizState = Partial<FireInputs>;

/** Nominal growth the quiz applies to the investment pots (editable later). */
export const QUIZ_POT_GROWTH = 0.05;
/** Property grows more slowly than the pots by default. */
export const QUIZ_PROPERTY_GROWTH = 0.03;

/**
 * Lifestyle presets shown as chips on the target-income step. Take-home
 * figures in today's money — deliberately round, illustrative numbers, not tax
 * thresholds.
 */
export const TARGET_PRESETS = [
  { label: "Modest", amount: 25000, hint: "~£25k" },
  { label: "Comfortable", amount: 40000, hint: "~£40k" },
  { label: "Luxury", amount: 60000, hint: "~£60k" },
] as const;

/**
 * Investing-style presets for the onboarding step. Each maps to a real
 * Vanguard UK fund so the quiz can seed a fee-aware growth rate; "Not sure"
 * keeps the neutral {@link QUIZ_POT_GROWTH} default. Refinable per-wrapper
 * later in Your Finances.
 */
export const QUIZ_INVESTING_STYLES = [
  {
    id: "adventurous",
    label: "All-in on shares",
    hint: "100% global equity",
    fundId: "vwrp",
  },
  {
    id: "mostly-shares",
    label: "Mostly shares",
    hint: "80% shares / 20% bonds",
    fundId: "lifestrategy-80",
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "60% shares / 40% bonds",
    fundId: "lifestrategy-60",
  },
  {
    id: "unsure",
    label: "Not sure yet",
    hint: "use a sensible default",
    fundId: null,
  },
] as const;

export type InvestingStyleId = (typeof QUIZ_INVESTING_STYLES)[number]["id"];

/** The net-of-fees pot growth for an investing-style choice. */
export function growthForInvestingStyle(styleId: InvestingStyleId): number {
  const style = QUIZ_INVESTING_STYLES.find((s) => s.id === styleId);
  if (!style?.fundId) return QUIZ_POT_GROWTH;
  return netGrowth(FUND_BY_ID[style.fundId]);
}

/** Neutral starting answers so each step renders a valid control from step 1. */
export const QUIZ_INITIAL_STATE: QuizState = {
  currentAge: 35,
  retirementAge: 55,
  targetAnnualIncome: 40000,
  isaBalance: 0,
  isaMonthlyContribution: 0,
  sippBalance: 0,
  sippMonthlyContribution: 0,
  giaBalance: 0,
  homeValue: 0,
  rentalValue: 0,
  rentalMonthlyIncome: 0,
};

/** Treat `undefined`/`NaN` (e.g. a cleared number field) as a missing answer. */
function num(value: number | undefined, fallback: number): number {
  return value === undefined || Number.isNaN(value) ? fallback : value;
}

/**
 * Turn the quiz answers into a complete, valid `FireInputs`. The ~6 collected
 * inputs are carried over; everything the quiz doesn't ask is filled with the
 * documented silent defaults (statutory ages, growth, pension strategy, life
 * expectancy) — all of which stay editable in the full planner.
 */
export function assembleQuizInputs(
  state: QuizState,
  potGrowth: number = QUIZ_POT_GROWTH,
): FireInputs {
  return {
    // Collected in the quiz.
    currentAge: num(state.currentAge, QUIZ_INITIAL_STATE.currentAge!),
    retirementAge: num(state.retirementAge, QUIZ_INITIAL_STATE.retirementAge!),
    targetAnnualIncome: num(
      state.targetAnnualIncome,
      QUIZ_INITIAL_STATE.targetAnnualIncome!,
    ),
    isaBalance: num(state.isaBalance, 0),
    isaMonthlyContribution: num(state.isaMonthlyContribution, 0),
    sippBalance: num(state.sippBalance, 0),
    sippMonthlyContribution: num(state.sippMonthlyContribution, 0),
    giaBalance: num(state.giaBalance, 0),

    // Not asked — sensible silent defaults.
    giaMonthlyContribution: 0,
    inflationRate: DEFAULT_INFLATION_RATE,
    growthRate: potGrowth,
    isaGrowth: potGrowth,
    giaGrowth: potGrowth,
    sippGrowth: potGrowth,

    // Property — optional, grows slower, never auto-sold/downsized.
    homeValue: num(state.homeValue, 0),
    homeGrowth: QUIZ_PROPERTY_GROWTH,
    downsizeAge: 0,
    downsizeReleaseFraction: 0,
    rentalValue: num(state.rentalValue, 0),
    rentalGrowth: QUIZ_PROPERTY_GROWTH,
    rentalMonthlyIncome: num(state.rentalMonthlyIncome, 0),
    rentalSaleAge: 0,

    // Statutory ages + pension strategy — the engine's documented defaults.
    statePensionAnnual: DEFAULT_ASSUMPTIONS.statePensionAnnual,
    statePensionAge: DEFAULT_ASSUMPTIONS.statePensionAge,
    sippAccessAge: DEFAULT_ASSUMPTIONS.sippAccessAge,
    pensionStrategy: DEFAULT_ASSUMPTIONS.pensionStrategy,
    lifeExpectancyAge: DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
  };
}
