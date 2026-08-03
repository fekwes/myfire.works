import { parseEstimatedHoldings, type EstimatedHolding } from "./portfolio-import";
import { scoreExtractedPlan } from "./plan-import-confidence";
import {
  parsePlanFromText,
  parseTextPlanFallback,
  type ExtractedPlan,
  type PlanImportFallbackResult,
} from "./plan-import-fallback";

export const IMPORT_CONFIDENCE_THRESHOLD = 0.8;
export const PARTIAL_IMPORT_WARNING = "We caught some figures, but please verify these fields.";
export const EMPTY_IMPORT_WARNING =
  "We couldn't identify any balances automatically; please verify or enter your figures below.";

export type ImportRoute = "deterministic" | "llm";
export type ImportRecoveryStatus = "complete" | "partial" | "needs-input";

export interface ImportPlanWrappers {
  sipp: number | null;
  sippMonthlyContribution: number | null;
  isa: number | null;
  isaMonthlyContribution: number | null;
  gia: number | null;
  giaMonthlyContribution: number | null;
  emergencyFund: number | null;
  /** Legacy aggregate monthly contribution when no wrapper is identifiable. */
  monthlyContribution: number | null;
}

export interface ImportPlanPayload {
  plan: Partial<ExtractedPlan>;
  wrappers: ImportPlanWrappers;
  holdings: EstimatedHolding[];
  source: string;
  confidence: number;
  route: ImportRoute;
  recovery: ImportRecoveryStatus;
  warning: string | null;
}

export interface ImportRouteDecision {
  route: ImportRoute;
  confidence: number;
  fallbackResult: PlanImportFallbackResult;
  deterministicPlan: Partial<ExtractedPlan>;
}

type ImportPlanFields = Pick<
  ExtractedPlan,
  | "isaBalance"
  | "isaMonthlyContribution"
  | "sippBalance"
  | "sippMonthlyContribution"
  | "giaBalance"
  | "giaMonthlyContribution"
  | "homeValue"
  | "rentalValue"
  | "rentalMonthlyIncome"
>;

function clampNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : 0;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed >= 0 ? parsed : 0;
  }
  return null;
}

function toOptionalNumber(value: unknown): number | undefined {
  return clampNumber(value) ?? undefined;
}

function normalizeWrappers(
  value: Partial<ImportPlanWrappers> | Record<string, unknown> | null | undefined,
): ImportPlanWrappers {
  return {
    sipp: clampNumber(value?.sipp),
    sippMonthlyContribution: clampNumber(value?.sippMonthlyContribution),
    isa: clampNumber(value?.isa),
    isaMonthlyContribution: clampNumber(value?.isaMonthlyContribution),
    gia: clampNumber(value?.gia),
    giaMonthlyContribution: clampNumber(value?.giaMonthlyContribution),
    emergencyFund: clampNumber(value?.emergencyFund),
    monthlyContribution: clampNumber(value?.monthlyContribution),
  };
}

function normalizePlan(value: Record<string, unknown> | null | undefined): Partial<ImportPlanFields> {
  return {
    isaBalance: toOptionalNumber(value?.isaBalance),
    isaMonthlyContribution: toOptionalNumber(value?.isaMonthlyContribution),
    sippBalance: toOptionalNumber(value?.sippBalance),
    sippMonthlyContribution: toOptionalNumber(value?.sippMonthlyContribution),
    giaBalance: toOptionalNumber(value?.giaBalance),
    giaMonthlyContribution: toOptionalNumber(value?.giaMonthlyContribution),
    homeValue: toOptionalNumber(value?.homeValue),
    rentalValue: toOptionalNumber(value?.rentalValue),
    rentalMonthlyIncome: toOptionalNumber(value?.rentalMonthlyIncome),
  };
}

function definedFields<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<T>;
}

function planFromWrappers(wrappers: ImportPlanWrappers): Partial<ImportPlanFields> {
  return definedFields({
    sippBalance: wrappers.sipp ?? undefined,
    sippMonthlyContribution: wrappers.sippMonthlyContribution ?? undefined,
    isaBalance: wrappers.isa ?? undefined,
    isaMonthlyContribution: wrappers.isaMonthlyContribution ?? undefined,
    giaBalance: wrappers.gia ?? undefined,
    giaMonthlyContribution: wrappers.giaMonthlyContribution ?? undefined,
  });
}

function wrappersFromPlan(
  plan: Partial<ImportPlanFields>,
  fallbackWrappers: ImportPlanWrappers,
): ImportPlanWrappers {
  return {
    sipp: plan.sippBalance ?? null,
    sippMonthlyContribution: plan.sippMonthlyContribution ?? null,
    isa: plan.isaBalance ?? null,
    isaMonthlyContribution: plan.isaMonthlyContribution ?? null,
    gia: plan.giaBalance ?? null,
    giaMonthlyContribution: plan.giaMonthlyContribution ?? null,
    emergencyFund: fallbackWrappers.emergencyFund,
    monthlyContribution: fallbackWrappers.monthlyContribution,
  };
}

function hasUsableValues(plan: Partial<ImportPlanFields>, holdings: EstimatedHolding[]): boolean {
  return (
    Object.values(plan).some((value) => typeof value === "number" && value > 0) ||
    holdings.length > 0
  );
}

function usedFallbackValue(
  fallbackPlan: Partial<ImportPlanFields>,
  aiPlan: Partial<ImportPlanFields>,
): boolean {
  return Object.entries(fallbackPlan).some(
    ([key, fallbackValue]) =>
      typeof fallbackValue === "number" &&
      fallbackValue > 0 &&
      aiPlan[key as keyof ImportPlanFields] === undefined,
  );
}

/**
 * Builds the single deterministic decision used by the API route. The service
 * availability check deliberately happens later, so a missing API key never
 * changes the confidence score or suppresses the recovery result.
 */
export function routePlanImport(
  text: string,
  minConfidence = IMPORT_CONFIDENCE_THRESHOLD,
): ImportRouteDecision {
  const fallbackResult = parsePlanFromText(text);
  const deterministicPlan = parseTextPlanFallback(text);
  const confidence = scoreExtractedPlan(deterministicPlan).confidence;
  return {
    route: confidence < minConfidence ? "llm" : "deterministic",
    confidence,
    fallbackResult,
    deterministicPlan,
  };
}

export function shouldRouteToLlm(
  value: Pick<PlanImportFallbackResult, "confidenceScore"> | number,
  minConfidence = IMPORT_CONFIDENCE_THRESHOLD,
): boolean {
  const confidence = typeof value === "number" ? value : value.confidenceScore;
  return confidence < minConfidence;
}

/**
 * Merge deterministic and model values without allowing an empty model field
 * to erase a known value. Model output is expected in the explicit `plan`
 * shape, while `aiWrappers` remains accepted for compatibility with callers
 * using the previous API schema.
 */
export function mergePlanImportResults({
  fallbackResult,
  deterministicPlan,
  aiPlan,
  aiWrappers,
  aiHoldings,
  source,
  route = "llm",
  warning,
}: {
  fallbackResult: PlanImportFallbackResult;
  deterministicPlan?: Partial<ExtractedPlan>;
  aiPlan?: Record<string, unknown> | null;
  aiWrappers?: Record<string, unknown> | null;
  aiHoldings?: unknown;
  source: string;
  route?: ImportRoute;
  warning?: string | null;
}): ImportPlanPayload {
  const fallbackWrappers = normalizeWrappers(fallbackResult.wrappers);
  const fallbackPlan = {
    ...planFromWrappers(fallbackWrappers),
    ...definedFields(deterministicPlan ?? {}),
  };
  const legacyAiPlan = planFromWrappers(normalizeWrappers(aiWrappers));
  const normalizedAiPlan = {
    ...legacyAiPlan,
    ...definedFields(normalizePlan(aiPlan)),
  };
  const plan = {
    ...fallbackPlan,
    ...normalizedAiPlan,
  } as Partial<ExtractedPlan>;
  const parsedAiHoldings = parseEstimatedHoldings(aiHoldings);
  const holdings = parsedAiHoldings.length > 0 ? parsedAiHoldings : fallbackResult.holdings;
  const confidence = scoreExtractedPlan(plan).confidence;
  const hasValues = hasUsableValues(plan, holdings);
  const fallbackUsed = usedFallbackValue(fallbackPlan, normalizedAiPlan);
  const recovery: ImportRecoveryStatus = !hasValues
    ? "needs-input"
    : confidence < IMPORT_CONFIDENCE_THRESHOLD || fallbackUsed
      ? "partial"
      : "complete";

  return {
    plan,
    wrappers: wrappersFromPlan(plan, fallbackWrappers),
    holdings,
    source,
    confidence,
    route,
    recovery,
    warning:
      warning ??
      (recovery === "needs-input" ? EMPTY_IMPORT_WARNING : recovery === "partial" ? PARTIAL_IMPORT_WARNING : null),
  };
}

export function buildImportPlanFallbackPayload(
  fallbackResult: PlanImportFallbackResult,
  source: string,
  deterministicPlan?: Partial<ExtractedPlan>,
): ImportPlanPayload {
  return mergePlanImportResults({
    fallbackResult,
    deterministicPlan,
    source,
    route: "deterministic",
  });
}
