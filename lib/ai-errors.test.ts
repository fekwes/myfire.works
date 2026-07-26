import { describe, expect, it } from "vitest";
import { isQuotaExhausted } from "./ai-errors";

describe("isQuotaExhausted", () => {
  it("detects a 429 status field", () => {
    expect(isQuotaExhausted({ status: 429 })).toBe(true);
  });

  it("detects RESOURCE_EXHAUSTED / 429 / quota in the message", () => {
    expect(isQuotaExhausted(new Error("429 RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isQuotaExhausted(new Error("You exceeded your current quota"))).toBe(true);
    expect(isQuotaExhausted("Rate limit reached for the model")).toBe(true);
  });

  it("does not fire on ordinary failures", () => {
    expect(isQuotaExhausted(new Error("network timeout"))).toBe(false);
    expect(isQuotaExhausted({ status: 500 })).toBe(false);
    expect(isQuotaExhausted(null)).toBe(false);
    expect(isQuotaExhausted(undefined)).toBe(false);
  });
});
