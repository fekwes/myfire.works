import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_INFLATION_RATE,
  type FireInputs,
} from "./fire-engine";

/** Nominal growth the quiz applies to the investment pots (editable later). */
export const QUIZ_POT_GROWTH = 0.05;
/** Property grows more slowly than the pots by default. */
export const QUIZ_PROPERTY_GROWTH = 0.03;

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

export type PersonaId = "standard" | "lean" | "fat" | "coast" | "barista";

export interface FirePersona {
  id: PersonaId;
  label: string;
  /** One-line concept — this is the educational payload. */
  tagline: string;
  /** Which lifestyle the persona pre-selects. */
  defaultLifestyle: LifestyleId;
  /** Custom target used when defaultLifestyle is "custom" (e.g. Fat FIRE). */
  customIncome?: number;
  /** Suggested retirement age for this archetype. */
  retirementAge: number;
}

export const FIRE_PERSONAS: FirePersona[] = [
  {
    id: "standard",
    label: "Standard FIRE",
    tagline: "Retire early and live comfortably off your savings.",
    defaultLifestyle: "comfortable",
    retirementAge: 55,
  },
  {
    id: "lean",
    label: "Lean FIRE",
    tagline: "Retire as early as possible on a lean, frugal budget.",
    defaultLifestyle: "minimum",
    retirementAge: 50,
  },
  {
    id: "fat",
    label: "Fat FIRE",
    tagline: "Retire early with plenty to spare for the good life.",
    defaultLifestyle: "custom",
    customIncome: 60000,
    retirementAge: 55,
  },
  {
    id: "coast",
    label: "Coast FIRE",
    tagline: "Save hard early, then coast — let it grow without adding more.",
    defaultLifestyle: "moderate",
    retirementAge: 60,
  },
  {
    id: "barista",
    label: "Barista FIRE",
    tagline: "Leave full-time work early; part-time covers the rest.",
    defaultLifestyle: "moderate",
    retirementAge: 50,
  },
];

export const PERSONA_BY_ID: Record<PersonaId, FirePersona> = Object.fromEntries(
  FIRE_PERSONAS.map((p) => [p.id, p]),
) as Record<PersonaId, FirePersona>;

/** Default part-time income + end age applied to the Barista persona. */
export const BARISTA_ANNUAL_INCOME = 15000;

/** The answers the redesigned quiz collects — persona, lifestyle, and ages. */
export interface QuizState {
  persona: PersonaId;
  lifestyle: LifestyleId;
  /** Only meaningful when lifestyle === "custom". */
  customIncome: number;
  currentAge: number;
  retirementAge: number;
}

/** Initial answers, seeded from the default persona so every step is valid. */
export function initialQuizState(): QuizState {
  const persona = FIRE_PERSONAS[0];
  return {
    persona: persona.id,
    lifestyle: persona.defaultLifestyle,
    customIncome: persona.customIncome ?? 40000,
    currentAge: 35,
    retirementAge: persona.retirementAge,
  };
}

/** Apply a persona's defaults (lifestyle, custom income, retirement age). */
export function applyPersona(state: QuizState, personaId: PersonaId): QuizState {
  const persona = PERSONA_BY_ID[personaId];
  return {
    ...state,
    persona: personaId,
    lifestyle: persona.defaultLifestyle,
    customIncome: persona.customIncome ?? state.customIncome,
    retirementAge: persona.retirementAge,
  };
}

/**
 * Turn the quiz answers into a complete `FireInputs`. Target income comes from
 * the chosen lifestyle (PLSA) or a custom figure; the persona sets the strategy
 * (Barista adds part-time income to State Pension age; Coast is a normal plan
 * whose coast card lights up). Balances start at 0 and contributions at modest
 * placeholders — the user fills real numbers in later, in the planner.
 */
export function assembleQuizInputs(state: QuizState): FireInputs {
  const targetAnnualIncome = lifestyleIncome(state.lifestyle, state.customIncome);
  const statePensionAge = DEFAULT_ASSUMPTIONS.statePensionAge;

  const barista = state.persona === "barista";

  return {
    currentAge: state.currentAge,
    retirementAge: state.retirementAge,
    targetAnnualIncome,

    isaBalance: 0,
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

    // Barista FIRE: part-time work bridges income until the State Pension.
    partTimeAnnualIncome: barista ? BARISTA_ANNUAL_INCOME : 0,
    partTimeUntilAge: barista ? statePensionAge : 0,

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
    sippAccessAge: DEFAULT_ASSUMPTIONS.sippAccessAge,
    pensionStrategy: DEFAULT_ASSUMPTIONS.pensionStrategy,
    lifeExpectancyAge: DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
  };
}
