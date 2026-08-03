import { describe, expect, it } from "vitest";
import {
  buildImportPlanFallbackPayload,
  mergePlanImportResults,
  routePlanImport,
  shouldRouteToLlm,
} from "./plan-import-router";
import { parsePlanFromText } from "./plan-import-fallback";

describe("plan-import-router", () => {
  it("preserves partial values and surfaces a verification warning", () => {
    const fallbackResult = parsePlanFromText(`
Portfolio Value by Product Wrapper
Vanguard Personal Pension
£337,856.14
Stocks & Shares ISA
£166,720.37
`);

    const payload = mergePlanImportResults({
      fallbackResult,
      aiWrappers: { sipp: 337856.14, isa: null, gia: null },
      aiHoldings: [],
      source: "fallback-text-parser",
    });

    expect(payload.wrappers.sipp).toBe(337856.14);
    expect(payload.wrappers.isa).toBe(166720.37);
    expect(payload.warning).toContain("please verify");
  });

  it("builds a fallback payload with a warning for low-confidence text", () => {
    const fallbackResult = parsePlanFromText(`
Only a single line was pasted.
`);

    const payload = buildImportPlanFallbackPayload(fallbackResult, "fallback-text-parser");
    expect(payload.warning).toContain("please verify");
    expect(payload.confidence).toBeLessThan(0.8);
  });

  it("uses the deterministic fast path only at the 0.8 confidence threshold", () => {
    const complete = routePlanImport(`
SIPP Balance: £250,000
Stocks & Shares ISA: £100,000
GIA: £50,000
`);
    const partial = routePlanImport("SIPP Balance: £250,000");

    expect(complete.route).toBe("deterministic");
    expect(complete.confidence).toBeGreaterThanOrEqual(0.8);
    expect(partial.route).toBe("llm");
    expect(shouldRouteToLlm(partial.confidence)).toBe(true);
  });

  it("merges a structured LLM plan without erasing deterministic contributions", () => {
    const fallbackResult = parsePlanFromText(`
SIPP Balance: £250,000, monthly contribution £1,000
Stocks & Shares ISA: £100,000, monthly contribution £500
`);

    const payload = mergePlanImportResults({
      fallbackResult,
      aiPlan: { isaBalance: 101000, giaBalance: 25000, giaMonthlyContribution: 200 },
      aiHoldings: [],
      source: "gemini-2.0-flash",
    });

    expect(payload.plan.sippBalance).toBe(250000);
    expect(payload.plan.sippMonthlyContribution).toBe(1000);
    expect(payload.plan.isaBalance).toBe(101000);
    expect(payload.plan.isaMonthlyContribution).toBe(500);
    expect(payload.plan.giaBalance).toBe(25000);
    expect(payload.plan.giaMonthlyContribution).toBe(200);
    expect(payload.warning).toContain("please verify");
  });
});
