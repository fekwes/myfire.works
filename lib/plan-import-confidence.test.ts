import { describe, expect, it } from "vitest";
import { scoreExtractedPlan } from "./plan-import-confidence";

describe("scoreExtractedPlan", () => {
  it("scores complete multi-wrapper plan with high confidence (>= 0.8)", () => {
    const scored = scoreExtractedPlan({
      sippBalance: 337856,
      isaBalance: 166720,
      giaBalance: 196717,
    });
    expect(scored.confidence).toBeGreaterThanOrEqual(0.85);
    expect(scored.fieldsExtracted).toContain("sippBalance");
    expect(scored.fieldsExtracted).toContain("isaBalance");
    expect(scored.fieldsExtracted).toContain("giaBalance");
    expect(scored.warningMessage).toBeUndefined();
  });

  it("scores single wrapper plan with partial confidence (< 0.8)", () => {
    const scored = scoreExtractedPlan({
      isaBalance: 45000,
    });
    expect(scored.confidence).toBeLessThan(0.8);
    expect(scored.warningMessage).toBe(
      "We caught some figures, but please verify these fields before continuing."
    );
  });

  it("scores zero/empty plan with 0.0 confidence and warning", () => {
    const scored = scoreExtractedPlan({});
    expect(scored.confidence).toBe(0);
    expect(scored.warningMessage).toBe(
      "No financial wrapper balances were detected automatically. Please verify or enter your figures below."
    );
  });
});
