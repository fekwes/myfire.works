import { describe, expect, it } from "vitest";
import type { FireInputs } from "./fire-engine";
import { decodePlan, encodePlan } from "./share";

const inputs: FireInputs = {
  currentAge: 40,
  retirementAge: 55,
  targetAnnualIncome: 30000,
  isaBalance: 120000,
  isaMonthlyContribution: 800,
  sippBalance: 90000,
  sippMonthlyContribution: 400,
  giaBalance: 15000,
  inflationRate: 0.025,
  pensionStrategy: "gradual",
  lifeExpectancyAge: 95,
};

describe("share encode/decode", () => {
  it("round-trips a plan", () => {
    expect(decodePlan(encodePlan(inputs))).toEqual(inputs);
  });

  it("produces a URL-safe string (no + / = )", () => {
    expect(encodePlan(inputs)).not.toMatch(/[+/=]/);
  });

  it("returns null for missing or junk input", () => {
    expect(decodePlan(null)).toBeNull();
    expect(decodePlan("")).toBeNull();
    expect(decodePlan("not-base64!!")).toBeNull();
  });

  it("returns null for JSON that isn't a plan", () => {
    expect(decodePlan(encodePlan({ hello: "world" } as never))).toBeNull();
  });

  /**
   * A share link is attacker-controlled. `typeof x === "number"` alone lets
   * Infinity through (JSON.parse("1e999")), which would propagate through the
   * whole projection, so decoding shares the plan validator.
   */
  it("rejects a link carrying a non-finite number", () => {
    const link = btoa(JSON.stringify({ ...inputs, currentAge: 1e999 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePlan(link)).toBeNull();
  });

  /**
   * Backward compatibility: a link from an older build (or one that simply
   * never carried a balance) still opens, with the money zero-filled. Only a
   * link missing something with no honest default is refused.
   */
  it("opens a link missing a balance, zero-filling it", () => {
    const withoutIsa: Record<string, unknown> = { ...inputs };
    delete withoutIsa.isaBalance;
    const decoded = decodePlan(encodePlan(withoutIsa as never));
    expect(decoded).not.toBeNull();
    expect(decoded?.isaBalance).toBe(0);
    expect(decoded?.currentAge).toBe(inputs.currentAge);
  });

  it("rejects a link missing an essential figure", () => {
    const withoutAge: Record<string, unknown> = { ...inputs };
    delete withoutAge.currentAge;
    expect(decodePlan(encodePlan(withoutAge as never))).toBeNull();
  });
});
