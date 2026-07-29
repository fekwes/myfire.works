import type { ExtractedPlan } from "./plan-import-fallback";

export interface ScoredPlan {
  plan: Partial<ExtractedPlan>;
  confidence: number; // 0.0 to 1.0
  fieldsExtracted: string[];
  warningMessage?: string;
}

/**
 * Score an extracted plan based on recognized financial wrapper balances and contributions.
 */
export function scoreExtractedPlan(plan: Partial<ExtractedPlan>): ScoredPlan {
  const fieldsExtracted: string[] = [];
  let score = 0;

  if (typeof plan.sippBalance === "number" && plan.sippBalance > 0) {
    score += 0.35;
    fieldsExtracted.push("sippBalance");
  }
  if (typeof plan.isaBalance === "number" && plan.isaBalance > 0) {
    score += 0.35;
    fieldsExtracted.push("isaBalance");
  }
  if (typeof plan.giaBalance === "number" && plan.giaBalance > 0) {
    score += 0.25;
    fieldsExtracted.push("giaBalance");
  }
  if (typeof plan.homeValue === "number" && plan.homeValue > 0) {
    score += 0.15;
    fieldsExtracted.push("homeValue");
  }
  if (typeof plan.rentalValue === "number" && plan.rentalValue > 0) {
    score += 0.15;
    fieldsExtracted.push("rentalValue");
  }
  if (typeof plan.isaMonthlyContribution === "number" && plan.isaMonthlyContribution > 0) {
    score += 0.1;
    fieldsExtracted.push("isaMonthlyContribution");
  }
  if (typeof plan.sippMonthlyContribution === "number" && plan.sippMonthlyContribution > 0) {
    score += 0.1;
    fieldsExtracted.push("sippMonthlyContribution");
  }

  const confidence = Math.min(1.0, Math.round(score * 100) / 100);

  let warningMessage: string | undefined;
  if (confidence === 0) {
    warningMessage = "No financial wrapper balances were detected automatically. Please verify or enter your figures below.";
  } else if (confidence < 0.8) {
    warningMessage = "We caught some figures, but please verify these fields before continuing.";
  }

  return { plan, confidence, fieldsExtracted, warningMessage };
}
