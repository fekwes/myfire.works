import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FireInputs } from "./fire-engine";
import {
  clearPlanLocal,
  loadPlanLocal,
  sanitisePlanInput,
  savePlanLocal,
} from "./plan-storage";

/** Minimal in-memory localStorage stand-in (tests run in a Node environment). */
function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe("plan-storage", () => {
  const sample: FireInputs = {
    currentAge: 40,
    retirementAge: 52,
    targetAnnualIncome: 30000,
    isaBalance: 120000,
    isaMonthlyContribution: 800,
    sippBalance: 90000,
    sippMonthlyContribution: 400,
    giaBalance: 15000,
    pensionStrategy: "gradual",
    lifeExpectancyAge: 95,
  };

  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createMemoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a plan through save → load", () => {
    savePlanLocal(sample);
    expect(loadPlanLocal()).toEqual(sample);
  });

  it("returns null when nothing has been saved", () => {
    expect(loadPlanLocal()).toBeNull();
  });

  it("clears a saved plan", () => {
    savePlanLocal(sample);
    clearPlanLocal();
    expect(loadPlanLocal()).toBeNull();
  });

  it("returns null on corrupt JSON rather than throwing", () => {
    window.localStorage.setItem("onfire:plan", "{ not json");
    expect(loadPlanLocal()).toBeNull();
  });

  /**
   * A field left mid-edit serialises as null (JSON has no NaN). Loading that
   * straight into the engine produced "£NaN" figures, so a plan missing a
   * required number is rejected outright.
   */
  it("rejects a stored plan whose required field went null", () => {
    window.localStorage.setItem(
      "onfire:plan",
      JSON.stringify({ ...sample, currentAge: null }),
    );
    expect(loadPlanLocal()).toBeNull();
  });

  it("drops a broken optional field instead of the whole plan", () => {
    window.localStorage.setItem(
      "onfire:plan",
      JSON.stringify({ ...sample, giaBalance: null, homeValue: 250000 }),
    );
    const loaded = loadPlanLocal();
    expect(loaded).not.toBeNull();
    expect(loaded).not.toHaveProperty("giaBalance");
    expect(loaded?.homeValue).toBe(250000);
    expect(loaded?.currentAge).toBe(40);
  });
});

describe("sanitisePlanInput — how forgiving it is, by field", () => {
  const essentials = {
    currentAge: 40,
    retirementAge: 52,
    targetAnnualIncome: 30000,
  };

  it("rejects a plan missing an essential figure", () => {
    for (const key of Object.keys(essentials)) {
      const partial: Record<string, unknown> = { ...essentials };
      delete partial[key];
      expect(sanitisePlanInput(partial)).toBeNull();
    }
  });

  /**
   * Old and partial links must still open. A plan carrying only the three
   * essentials is a real plan — someone with nothing saved yet — so the
   * balances fill in at zero rather than the link being refused.
   */
  it("opens a plan that carries only the essentials, zero-filling money", () => {
    const out = sanitisePlanInput(essentials);
    expect(out).not.toBeNull();
    expect(out?.currentAge).toBe(40);
    expect(out?.isaBalance).toBe(0);
    expect(out?.isaMonthlyContribution).toBe(0);
    expect(out?.sippBalance).toBe(0);
    expect(out?.sippMonthlyContribution).toBe(0);
  });

  it("zero-fills a balance that arrived unusable rather than rejecting", () => {
    const out = sanitisePlanInput({
      ...essentials,
      isaBalance: null,
      sippBalance: Number.NaN,
      isaMonthlyContribution: "600",
    });
    expect(out?.isaBalance).toBe(0);
    expect(out?.sippBalance).toBe(0);
    expect(out?.isaMonthlyContribution).toBe(0);
  });

  it("still refuses a non-finite essential", () => {
    expect(
      sanitisePlanInput({ ...essentials, currentAge: Number.POSITIVE_INFINITY }),
    ).toBeNull();
  });

  it("leaves real balances untouched", () => {
    const out = sanitisePlanInput({ ...essentials, isaBalance: 120000 });
    expect(out?.isaBalance).toBe(120000);
  });
});

describe("sanitisePlanInput", () => {
  const valid = {
    currentAge: 40,
    retirementAge: 52,
    targetAnnualIncome: 30000,
    isaBalance: 120000,
    isaMonthlyContribution: 800,
    sippBalance: 90000,
    sippMonthlyContribution: 400,
  };

  it("accepts a complete plan unchanged", () => {
    expect(sanitisePlanInput(valid)).toEqual(valid);
  });

  it("rejects non-objects", () => {
    for (const bad of [null, undefined, 42, "plan", [], true]) {
      expect(sanitisePlanInput(bad)).toBeNull();
    }
  });

  it.each(["currentAge", "retirementAge", "targetAnnualIncome"])(
    "rejects a non-finite %s",
    (key) => {
      expect(sanitisePlanInput({ ...valid, [key]: Number.NaN })).toBeNull();
      expect(sanitisePlanInput({ ...valid, [key]: null })).toBeNull();
      expect(sanitisePlanInput({ ...valid, [key]: "40" })).toBeNull();
    },
  );

  it("strips non-finite optional numbers so engine defaults apply", () => {
    const out = sanitisePlanInput({
      ...valid,
      inflationRate: Number.NaN,
      sippAccessAge: Number.POSITIVE_INFINITY,
      lifeExpectancyAge: 95,
    });
    expect(out).not.toHaveProperty("inflationRate");
    expect(out).not.toHaveProperty("sippAccessAge");
    expect(out?.lifeExpectancyAge).toBe(95);
  });

  it("keeps non-numeric fields the engine expects, like pensionStrategy", () => {
    const out = sanitisePlanInput({ ...valid, pensionStrategy: "lumpSum" });
    expect(out?.pensionStrategy).toBe("lumpSum");
  });
});

/**
 * Plans travel in `?p=` links, so a plan is something one person can hand
 * another. Finiteness alone doesn't bound the work the engine then does: it
 * builds an object per year from `currentAge` to `lifeExpectancyAge`, so
 * "live to 5,000,000" is a finite, valid-looking number that allocated five
 * million objects and took the recipient's tab down with it.
 */
describe("sanitisePlanInput — bounds, not just finiteness", () => {
  const valid = {
    currentAge: 40,
    retirementAge: 55,
    targetAnnualIncome: 30000,
  };

  it("clamps an absurd life expectancy so the projection stays bounded", () => {
    const out = sanitisePlanInput({ ...valid, lifeExpectancyAge: 5_000_000 });
    expect(out?.lifeExpectancyAge).toBe(120);
  });

  it("bounds every age field", () => {
    const out = sanitisePlanInput({
      ...valid,
      currentAge: -50,
      retirementAge: 1e9,
      statePensionAge: 500,
      sippAccessAge: -1,
      rentalSaleAge: 99999,
      partTimeUntilAge: 1e12,
      downsizeAge: -7,
    });
    for (const key of [
      "currentAge",
      "retirementAge",
      "statePensionAge",
      "sippAccessAge",
      "rentalSaleAge",
      "partTimeUntilAge",
      "downsizeAge",
    ] as const) {
      expect(out?.[key], key).toBeGreaterThanOrEqual(0);
      expect(out?.[key], key).toBeLessThanOrEqual(120);
    }
  });

  it("rounds ages to whole years", () => {
    const out = sanitisePlanInput({ ...valid, retirementAge: 55.7 });
    expect(out?.retirementAge).toBe(56);
  });

  it("bounds money fields and rejects negative balances", () => {
    const out = sanitisePlanInput({
      ...valid,
      isaBalance: -5000,
      sippBalance: 1e30,
      targetAnnualIncome: 1e40,
    });
    expect(out?.isaBalance).toBe(0);
    expect(out?.sippBalance).toBe(1e12);
    expect(out?.targetAnnualIncome).toBe(1e12);
  });

  it("bounds growth and inflation rates", () => {
    const out = sanitisePlanInput({
      ...valid,
      growthRate: 500,
      inflationRate: -3,
      isaGrowth: 1e9,
    });
    expect(out?.growthRate).toBe(1);
    expect(out?.inflationRate).toBe(-0.9);
    expect(out?.isaGrowth).toBe(1);
  });

  it("bounds the downsize release fraction to 0–1", () => {
    expect(
      sanitisePlanInput({ ...valid, downsizeReleaseFraction: 12 })
        ?.downsizeReleaseFraction,
    ).toBe(1);
  });

  it("leaves ordinary figures untouched", () => {
    const out = sanitisePlanInput({
      ...valid,
      isaBalance: 52_431.19,
      growthRate: 0.0512,
      lifeExpectancyAge: 95,
    });
    expect(out?.isaBalance).toBe(52_431.19);
    expect(out?.growthRate).toBe(0.0512);
    expect(out?.lifeExpectancyAge).toBe(95);
  });

  it("bounds a holding's fee, weight and label", () => {
    const out = sanitisePlanInput({
      ...valid,
      isaHoldings: [
        {
          assetClass: "global-equity",
          ocf: 5,
          weight: 1e308,
          label: "x".repeat(400),
        },
      ],
    });
    const holding = out?.isaHoldings?.[0];
    expect(holding?.ocf).toBe(0.1);
    expect(holding?.weight).toBe(1e6);
    expect(holding?.label).toHaveLength(120);
  });

  it("caps how many holdings one wrapper can carry", () => {
    const out = sanitisePlanInput({
      ...valid,
      isaHoldings: Array.from({ length: 5000 }, () => ({
        assetClass: "cash",
        ocf: 0.001,
        weight: 1,
      })),
    });
    expect(out?.isaHoldings).toHaveLength(100);
  });
});
