import { parseEstimatedHoldings, type EstimatedHolding } from "./portfolio-import";
import { parsePlanFromText, type PlanImportFallbackResult } from "./plan-import-fallback";

export interface ImportPlanWrappers {
  sipp: number | null;
  isa: number | null;
  gia: number | null;
  emergencyFund: number | null;
  monthlyContribution: number | null;
}

export interface ImportPlanPayload {
  wrappers: ImportPlanWrappers;
  holdings: EstimatedHolding[];
  source: string;
  confidence: number;
  warning?: string | null;
}

function clampNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? Math.max(0, value) : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed >= 0 ? Math.max(0, parsed) : 0;
    }
  }
  return null;
}

function normalizeWrappers(value: Record<string, unknown> | null | undefined): ImportPlanWrappers {
  return {
    sipp: clampNumber(value?.sipp),
    isa: clampNumber(value?.isa),
    gia: clampNumber(value?.gia),
    emergencyFund: clampNumber(value?.emergencyFund),
    monthlyContribution: clampNumber(value?.monthlyContribution),
  };
}

function hasUsableValues(wrappers: ImportPlanWrappers, holdings: EstimatedHolding[]): boolean {
  return (
    [wrappers.sipp, wrappers.isa, wrappers.gia, wrappers.emergencyFund, wrappers.monthlyContribution].some(
      (value) => value !== null && value > 0,
    ) || holdings.length > 0
  );
}

export function shouldRouteToLlm(
  fallbackResult: Pick<PlanImportFallbackResult, "confidenceScore">,
  minConfidence = 0.8,
): boolean {
  return fallbackResult.confidenceScore < minConfidence;
}

export function mergePlanImportResults({
  fallbackResult,
  aiWrappers,
  aiHoldings,
  source,
  warning,
}: {
  fallbackResult: PlanImportFallbackResult;
  aiWrappers?: Record<string, unknown> | null;
  aiHoldings?: unknown;
  source: string;
  warning?: string | null;
}): ImportPlanPayload {
  const normalizedAiWrappers = normalizeWrappers(aiWrappers ?? undefined);
  const normalizedFallbackWrappers = fallbackResult.wrappers;

  const mergedWrappers: ImportPlanWrappers = {
    sipp: normalizedAiWrappers.sipp ?? normalizedFallbackWrappers.sipp,
    isa: normalizedAiWrappers.isa ?? normalizedFallbackWrappers.isa,
    gia: normalizedAiWrappers.gia ?? normalizedFallbackWrappers.gia,
    emergencyFund: normalizedAiWrappers.emergencyFund ?? normalizedFallbackWrappers.emergencyFund,
    monthlyContribution:
      normalizedAiWrappers.monthlyContribution ?? normalizedFallbackWrappers.monthlyContribution,
  };

  const parsedAiHoldings = parseEstimatedHoldings(aiHoldings);
  const mergedHoldings = parsedAiHoldings.length > 0 ? parsedAiHoldings : fallbackResult.holdings;

  const usedFallback =
    [normalizedAiWrappers.sipp, normalizedAiWrappers.isa, normalizedAiWrappers.gia].some(
      (value) => value === null,
    ) &&
    [normalizedFallbackWrappers.sipp, normalizedFallbackWrappers.isa, normalizedFallbackWrappers.gia].some(
      (value) => value !== null,
    );

  const fallbackWarning =
    warning ??
    (hasUsableValues(mergedWrappers, mergedHoldings) && (fallbackResult.confidenceScore < 0.8 || usedFallback)
      ? "We caught some figures, but please verify these fields."
      : null);

  return {
    wrappers: mergedWrappers,
    holdings: mergedHoldings,
    source,
    confidence: fallbackResult.confidenceScore,
    warning: fallbackWarning,
  };
}

export function buildImportPlanFallbackPayload(
  fallbackResult: PlanImportFallbackResult,
  source: string,
): ImportPlanPayload {
  return mergePlanImportResults({
    fallbackResult,
    source,
    warning: fallbackResult.confidenceScore < 0.8 ? "We caught some figures, but please verify these fields." : null,
  });
}
