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

  it.each(Object.keys(valid))("rejects a non-finite %s", (key) => {
    expect(sanitisePlanInput({ ...valid, [key]: Number.NaN })).toBeNull();
    expect(sanitisePlanInput({ ...valid, [key]: null })).toBeNull();
    expect(sanitisePlanInput({ ...valid, [key]: "40" })).toBeNull();
  });

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
