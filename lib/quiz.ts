import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_INFLATION_RATE,
  type FireInputs,
} from "./fire-engine";
import { deriveMinimumPensionAge, deriveStatePensionAge } from "./pension-ages";

/** Nominal growth the quiz applies to the investment pots (editable later). */
export const QUIZ_POT_GROWTH = 0.05;
/** Property grows more slowly than the pots by default. */
export const QUIZ_PROPERTY_GROWTH = 0.025;

/** Placeholder starting contributions so the first plan isn't flat-zero. */
const QUIZ_DEFAULT_ISA_MONTHLY = 500;
const QUIZ_DEFAULT_SIPP_MONTHLY = 300;

/**
 * UK PLSA Retirement Living Standards 2025 (single person, outside London,
 * excluding housing costs). The recognised institutional benchmark for "how
 * much income does a given lifestyle cost in retirement", from Loughborough
 * University for the Pensions and Lifetime Savings Association.
 */
export const PLSA_LIFESTYLES = [
  {
    id: "minimum",
    label: "Minimum",
    amount: 13400,
    blurb: "Covers all your needs, with a little left over for fun.",
  },
  {
    id: "moderate",
    label: "Moderate",
    amount: 31700,
    blurb: "More financial security and flexibility.",
  },
  {
    id: "comfortable",
    label: "Comfortable",
    amount: 43900,
    blurb: "Financial freedom and some luxuries.",
  },
] as const;

export type LifestyleId = (typeof PLSA_LIFESTYLES)[number]["id"] | "custom";

/** Take-home income for a lifestyle (custom falls back to the custom amount). */
export function lifestyleIncome(id: LifestyleId, customAmount: number): number {
  if (id === "custom") return customAmount;
  return PLSA_LIFESTYLES.find((l) => l.id === id)!.amount;
}

/**
 * How you get to financial independence — a genuine strategy choice.
 *
 * Note the deliberate omission of "Lean" and "Fat" FIRE. Those archetypes
 * differ from Standard FIRE *only* by how much you plan to spend each year,
 * which the quiz asks directly (and far more precisely) in the spending-target
 * step. Offering them as a separate question asked the same thing twice and
 * silently overwrote the user's own number. Lean vs. fat is now simply where
 * you land on the target — these three are the choices that actually change
 * the shape of the plan.
 */
export type StrategyId = "standard" | "coast" | "barista";

export interface FireStrategy {
  id: StrategyId;
  label: string;
  /** One-line concept — this is the educational payload. */
  tagline: string;
}

export const FIRE_STRATEGIES: FireStrategy[] = [
  {
    id: "standard",
    label: "Retire fully",
    tagline:
      "Keep investing until you stop working, then live off the pots. The classic FIRE path.",
  },
  {
    id: "coast",
    label: "Coast to it",
    tagline:
      "Save hard now, then stop adding and let compounding finish the job on its own.",
  },
  {
    id: "barista",
    label: "Go part-time first",
    tagline:
      "Leave full-time work early and let part-time earnings bridge you to the State Pension.",
  },
];

export const STRATEGY_BY_ID: Record<StrategyId, FireStrategy> =
  Object.fromEntries(FIRE_STRATEGIES.map((s) => [s.id, s])) as Record<
    StrategyId,
    FireStrategy
  >;

/** Default part-time income applied to the "go part-time first" strategy. */
export const BARISTA_ANNUAL_INCOME = 15000;

/** Retirement age the quiz starts from when the user hasn't set one yet. */
export const DEFAULT_RETIREMENT_AGE = 55;

/** The answers the quiz collects — spending target, ages, strategy, savings. */
export interface QuizState {
  strategy: StrategyId;
  lifestyle: LifestyleId;
  /** Only meaningful when lifestyle === "custom". */
  customIncome: number;
  currentAge: number;
  /** When contributions stop (Coast FIRE). Undefined means they stop at retirementAge. */
  contributionsUntilAge?: number;
  retirementAge: number;
  /**
   * Part-time work until this age. Undefined means no part-time work.
   */
  partTimeUntilAge?: number;
  /** Annual income from part-time work */
  partTimeAnnualIncome: number;
  /** Rough total already saved. Only seeded when `savingsProvided` is true. */
  savings: number;
  /** True if user entered savings manually instead of skipping. */
  savingsProvided: boolean;
  /** If the user used the AI import, the resulting partial inputs are stored here. */
  importedPlan?: Partial<FireInputs>;
}

/** Initial answers — sensible middle-of-the-road defaults, all steps valid. */
export function initialQuizState(): QuizState {
  return {
    strategy: "standard",
    lifestyle: "moderate",
    customIncome: 40000,
    currentAge: 35,
    retirementAge: DEFAULT_RETIREMENT_AGE,
    partTimeAnnualIncome: BARISTA_ANNUAL_INCOME,
    savings: 0,
    savingsProvided: false,
  };
}

/**
 * Turn the quiz answers into a complete `FireInputs`. Target income comes from
 * the chosen lifestyle (PLSA) or a custom figure; the strategy shapes the plan
 * ("go part-time first" adds part-time income to State Pension age; "coast to
 * it" is a normal plan whose Coast FIRE card lights up). Contributions start at
 * modest placeholders. Any savings the user gave seed the ISA balance — a
 * single combined figure can't say how it's split across ISA/SIPP/GIA, and ISA
 * is the accessible FIRE staple, so parking it there keeps the *net worth*
 * exactly right without fabricating pension money locked until 57. The user
 * splits it properly later, in the planner.
 */
export function assembleQuizInputs(state: QuizState): FireInputs {
  const targetAnnualIncome = lifestyleIncome(state.lifestyle, state.customIncome);
  const statePensionAge = deriveStatePensionAge(state.currentAge);
  const sippAccessAge = deriveMinimumPensionAge(state.currentAge);

  const barista = state.strategy === "barista";
  const partTimeAnnualIncome = barista ? state.partTimeAnnualIncome : 0;
  const partTimeUntilAge = barista ? state.partTimeUntilAge ?? statePensionAge : 0;

  const coast = state.strategy === "coast";
  const contributionsUntilAge = coast ? state.contributionsUntilAge : undefined;

  const isaBalance = state.savingsProvided ? Math.max(0, state.savings) : 0;

  return {
    currentAge: state.currentAge,
    retirementAge: state.retirementAge,
    targetAnnualIncome,
    contributionsUntilAge,
    partTimeAnnualIncome,
    partTimeUntilAge,

    isaBalance,
    isaMonthlyContribution: QUIZ_DEFAULT_ISA_MONTHLY,
    sippBalance: 0,
    sippMonthlyContribution: QUIZ_DEFAULT_SIPP_MONTHLY,
    giaBalance: 0,
    giaMonthlyContribution: 0,

    inflationRate: DEFAULT_INFLATION_RATE,
    growthRate: QUIZ_POT_GROWTH,
    isaGrowth: QUIZ_POT_GROWTH,
    giaGrowth: QUIZ_POT_GROWTH,
    sippGrowth: QUIZ_POT_GROWTH,

    // Property — optional, added later.
    homeValue: 0,
    homeGrowth: QUIZ_PROPERTY_GROWTH,
    downsizeAge: 0,
    downsizeReleaseFraction: 0,
    rentalValue: 0,
    rentalGrowth: QUIZ_PROPERTY_GROWTH,
    rentalMonthlyIncome: 0,
    rentalSaleAge: 0,

    statePensionAnnual: DEFAULT_ASSUMPTIONS.statePensionAnnual,
    statePensionAge,
    sippAccessAge,
    pensionStrategy: DEFAULT_ASSUMPTIONS.pensionStrategy,
    lifeExpectancyAge: DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
    ...state.importedPlan, // override with extracted figures
  };
}
