import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FireInputs } from "./fire-engine";
import { clearPlanLocal, loadPlanLocal, savePlanLocal } from "./plan-storage";

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
});
