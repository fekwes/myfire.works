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
  apply: (income: number, routing: Record<IncomeBucket, number>) => number;
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

export interface CountryPack {
  id: string;
  currency: { code: string; locale: string };
  regions: Region[];
  wrappers: WrapperSpec[];
  taxSystem: (region: Region | undefined, filing: FilingStatus | undefined) => TaxSystem;
  statePension: (history: ContributionHistory, claimAge: number) => number;
  constraints: PlanConstraint[];
  disposalPolicy: "fifo" | "specific-id" | "average";
  drawdownCandidates: DrawdownStrategy[];
}
