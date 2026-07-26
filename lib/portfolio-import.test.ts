import { describe, expect, it } from "vitest";
import { ASSET_CLASS_RETURN } from "./assets";
import {
  MAX_IMPORT_CHARS,
  parseEstimatedHoldings,
  parseHoldingsResponse,
  parseImportRequest,
} from "./portfolio-import";

const holding = (over: Record<string, unknown> = {}) => ({
  label: "Vanguard FTSE Global All Cap",
  assetClass: "global-equity",
  ocf: 0.0023,
  weight: 1,
  ...over,
});

describe("parseEstimatedHoldings", () => {
  it("keeps a well-formed holding", () => {
    const [h] = parseEstimatedHoldings([holding()]);
    expect(h).toEqual({
      label: "Vanguard FTSE Global All Cap",
      assetClass: "global-equity",
      ocf: 0.0023,
      weight: 1,
    });
  });

  it("returns nothing for a non-array", () => {
    expect(parseEstimatedHoldings(null)).toEqual([]);
    expect(parseEstimatedHoldings("holdings")).toEqual([]);
    expect(parseEstimatedHoldings({ holdings: [] })).toEqual([]);
  });

  // The model classifies; it never values. An invented class has no row in
  // ASSET_CLASS_RETURN, so accepting one would mean guessing a return.
  it("drops a holding whose asset class isn't a known one", () => {
    const out = parseEstimatedHoldings([
      holding({ assetClass: "crypto" }),
      holding({ assetClass: "emerging-markets" }),
      holding({ assetClass: null }),
      holding(),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].assetClass).toBe("global-equity");
  });

  it("only ever emits classes the engine can price", () => {
    const out = parseEstimatedHoldings([
      holding({ assetClass: "cash" }),
      holding({ assetClass: "multi-asset-60" }),
    ]);
    for (const h of out) {
      expect(ASSET_CLASS_RETURN[h.assetClass]).toBeTypeOf("number");
    }
  });

  it("clamps an absurd fee instead of poisoning the growth rate", () => {
    // A misread "22%" where 0.22% was meant.
    expect(parseEstimatedHoldings([holding({ ocf: 0.22 })])[0].ocf).toBe(0.03);
  });

  it("falls back to a default fee for an unusable one", () => {
    for (const ocf of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, "cheap", null]) {
      expect(parseEstimatedHoldings([holding({ ocf })])[0].ocf).toBe(0.002);
    }
  });

  it("keeps a zero fee, which is a real answer", () => {
    expect(parseEstimatedHoldings([holding({ ocf: 0 })])[0].ocf).toBe(0);
  });

  it("normalises weights that don't sum to 1", () => {
    const out = parseEstimatedHoldings([
      holding({ weight: 42000 }),
      holding({ assetClass: "cash", weight: 8000 }),
    ]);
    expect(out.map((h) => h.weight)).toEqual([0.84, 0.16]);
    expect(out.reduce((s, h) => s + h.weight, 0)).toBeCloseTo(1);
  });

  it("splits equally when no weight is usable", () => {
    const out = parseEstimatedHoldings([
      holding({ weight: 0 }),
      holding({ weight: "half" }),
      holding({ weight: Number.NaN }),
    ]);
    expect(out.map((h) => h.weight)).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  it("names an unlabelled holding rather than leaving it blank", () => {
    expect(parseEstimatedHoldings([holding({ label: "   " })])[0].label).toBe(
      "Holding",
    );
    expect(parseEstimatedHoldings([holding({ label: 42 })])[0].label).toBe(
      "Holding",
    );
  });

  it("truncates a runaway label", () => {
    const out = parseEstimatedHoldings([holding({ label: "x".repeat(500) })]);
    expect(out[0].label).toHaveLength(80);
  });

  it("caps how many holdings one import can produce", () => {
    const out = parseEstimatedHoldings(
      Array.from({ length: 200 }, () => holding()),
    );
    expect(out).toHaveLength(40);
  });

  it("survives junk entries mixed into the array", () => {
    const out = parseEstimatedHoldings([null, "text", 7, [], holding()]);
    expect(out).toHaveLength(1);
  });
});

describe("parseHoldingsResponse", () => {
  it("reads a valid reply", () => {
    const out = parseHoldingsResponse(
      JSON.stringify({ holdings: [holding()] }),
    );
    expect(out).toHaveLength(1);
  });

  // A model that ignores the schema and answers in prose must produce a
  // "couldn't read that" message, never an exception in the request handler.
  it("returns nothing for prose, truncation, or the wrong shape", () => {
    for (const raw of [
      "Sure! Here are your holdings:",
      '{"holdings": [{"label": "Vanguar',
      "[]",
      "null",
      '{"funds": []}',
      "",
      null,
      undefined,
    ]) {
      expect(parseHoldingsResponse(raw)).toEqual([]);
    }
  });
});

describe("parseImportRequest", () => {
  it("accepts a normal paste", () => {
    const result = parseImportRequest(JSON.stringify({ text: "Global All Cap 42000" }));
    expect(result).toEqual({ ok: true, text: "Global All Cap 42000" });
  });

  it("rejects an empty or missing text field", () => {
    for (const body of ['{"text":""}', '{"text":"   "}', '{"text":42}', "{}"]) {
      const result = parseImportRequest(body);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.status).toBe(400);
    }
  });

  it("rejects unparseable bodies without throwing", () => {
    const result = parseImportRequest("not json at all");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.status).toBe(400);
  });

  // Rejected on the raw body, so a huge paste is never JSON-parsed first.
  it("rejects an oversized body with 413", () => {
    const result = parseImportRequest("x".repeat(200_000));
    expect(result.ok === false && result.status).toBe(413);
  });

  it("truncates a body that is long but within the size limit", () => {
    const body = JSON.stringify({ text: "y".repeat(MAX_IMPORT_CHARS + 500) });
    const result = parseImportRequest(body);
    expect(result.ok && result.text).toHaveLength(MAX_IMPORT_CHARS);
  });
});
