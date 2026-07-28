export type TaxTreatment = "tax-free" | "tax-deferred" | "taxable";

export type IncomeBucket =
  | "employment"
  | "pension-withdrawal"
  | "rental"
  | "interest"
  | "dividends"
  | "realised-gains"
  | "state-pension"
  | "other";

export interface WrapperSpec {
  id: string;
  label: string;
  treatment: TaxTreatment;
  accessAge?: number;
  annualContributionLimit?: number;
  /** Minimum holding period before the tax treatment applies */
  minimumHoldYears?: number;
  /** UK's 25% PCLS */
  taxFreeFractionOnWithdrawal?: number;
  taxFreeLifetimeCap?: number;
  /** Which income bucket a withdrawal lands in */
  withdrawalBucket: IncomeBucket;
  forcedMinimumFraction?: (age: number) => number; // RMD, RRIF
}

export interface TaxBase {
  id: string;
  schedule: { upTo: number | ((allowance: number) => number); rate: number }[];
  allowance?: (totalIncome: number) => number;
  /** Income in `stacksOn` is added first to decide which band applies */
  stacksOn?: string;
}

export interface Surtax {
  id: string;
  apply: (income: number, routing: Record<string, number>, age: number) => number;
}

export interface TaxSystem {
  bases: TaxBase[];
  /** Where each bucket lands, and how much of it counts. */
  routing: Partial<Record<IncomeBucket, { base: string; inclusion?: number }>>;
  /** Applied after the bases: NIIT, regional surcharges. */
  surtaxes?: Surtax[];
}

export interface ContributionHistory {
  yearsContributed?: number;
  // Add other fields as needed for specific countries (e.g. 35 year earnings history for US)
}

export type FilingStatus = "single" | "married-joint";

export type PlanConstraint =
  | { kind: "taper"; on: IncomeBucket[]; threshold: number; rate: number }
  | { kind: "cliff"; on: IncomeBucket[]; threshold: number; lossAtThreshold: number }
  | { kind: "step"; on: IncomeBucket[]; steps: { above: number; cost: number }[] }
  | { kind: "floor"; on: IncomeBucket[]; threshold: number };

export type DrawdownStrategy = string;

export interface Region {
  id: string;
  label: string;
}

/** Lifestyle tiers shown in the onboarding quiz spending step. */
export interface LifestyleTier {
  id: string;
  label: string;
  amount: number;
  blurb: string;
}

/** Region-appropriate defaults for the onboarding quiz. */
export interface QuizDefaults {
  customIncome: number;
  baristaAnnualIncome: number;
  defaultIsaMonthly: number;
  defaultSippMonthly: number;
  /** Default Social Security / State Pension annual amount for the quiz. */
  defaultStatePensionAnnual: number;
  /** Default retirement account access age (SIPP: 57, 401k: 59.5). */
  defaultPensionAccessAge: number;
  /** Default state/social-security pension age. */
  defaultStatePensionAge: number;
}

/**
 * All user-facing labels that change between regions. Components read these
 * instead of hard-coding UK terminology.
 */
export interface PackLabels {
  /** What the country calls its government retirement benefit. */
  statePension: string;
  /** Short name for the tax-free wrapper (ISA / Roth IRA). */
  taxFreeWrapper: string;
  /** Short name for the tax-deferred wrapper (SIPP / 401(k)). */
  taxDeferredWrapper: string;
  /** Short name for the taxable wrapper (GIA / Taxable Brokerage). */
  taxableWrapper: string;
  /** Whether the pension-strategy toggle (UFPLS vs lump sum) applies. */
  hasPensionStrategyToggle: boolean;
  /** Retirement-age tooltip copy. */
  retirementAgeTooltip: string;
  /** Target-income tooltip copy. */
  targetIncomeTooltip: string;
  /** Part-time tooltip copy. */
  partTimeTooltip: string;
  /** Rental sale tooltip. */
  rentalSaleTooltip: string;
  /** Home/downsize tooltip. */
  homeTooltip: string;
  /** Quiz savings helper text. */
  savingsHelper: string;
  /** Quiz savings hint text. */
  savingsHint: string;
  /** Barista strategy tagline. */
  baristaTagline: string;
  /** Strategy why text. */
  strategyWhy: string;
  /** Checklist savings hint. */
  checklistSavingsHint: string;
  /** PLSA / benchmark name for the helper text. */
  lifestyleBenchmarkName: string;
}

export interface CountryPack {
  id: string;
  currency: { code: string; locale: string; symbol?: string };
  regions: Region[];
  wrappers: WrapperSpec[];
  labels: PackLabels;
  lifestyleTiers: LifestyleTier[];
  quizDefaults: QuizDefaults;
  taxSystem: (region: Region | undefined, filing: FilingStatus | undefined) => TaxSystem;
  statePension: (history: ContributionHistory, claimAge: number) => number;
  constraints: PlanConstraint[];
  disposalPolicy: "fifo" | "specific-id" | "average";
  drawdownCandidates: DrawdownStrategy[];
}
