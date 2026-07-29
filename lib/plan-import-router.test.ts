import { describe, expect, it } from "vitest";
import { buildImportPlanFallbackPayload, mergePlanImportResults } from "./plan-import-router";
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
});
