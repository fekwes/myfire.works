import { describe, expect, test } from "vitest";
import { formatCurrency, formatCurrencyCompact } from "./format";

describe("formatCurrency", () => {
  test("formats GBP currency by default", () => {
    expect(formatCurrency(1250000)).toBe("£1,250,000");
    expect(formatCurrency(0)).toBe("£0");
  });

  test("formats GBP currency explicitly", () => {
    expect(formatCurrency(38000, "GBP")).toBe("£38,000");
  });

  test("formats USD currency explicitly", () => {
    expect(formatCurrency(1250000, "USD")).toBe("$1,250,000");
    expect(formatCurrency(55000, "USD")).toBe("$55,000");
  });
});

describe("formatCurrencyCompact", () => {
  test("formats GBP compact currency by default", () => {
    expect(formatCurrencyCompact(1250000)).toBe("£1.3m");
    expect(formatCurrencyCompact(450000)).toBe("£450k");
  });

  test("formats USD compact currency explicitly", () => {
    expect(formatCurrencyCompact(1250000, "USD")).toBe("$1.3M");
    expect(formatCurrencyCompact(450000, "USD")).toBe("$450K");
  });
});
