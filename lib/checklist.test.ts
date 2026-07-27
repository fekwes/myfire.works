import { describe, expect, it } from "vitest";
import {
  buildChecklist,
  checklistProgress,
  nextChecklistStep,
} from "./checklist";
import type { FireInputs } from "./fire-engine";
import { FUND_BY_ID, fundToHolding } from "./vanguard-funds";

const fresh: FireInputs = {
  currentAge: 35,
  retirementAge: 55,
  targetAnnualIncome: 31700,
  isaBalance: 0,
  isaMonthlyContribution: 500,
  sippBalance: 0,
  sippMonthlyContribution: 300,
  giaBalance: 0,
  isaGrowth: 0.05,
  sippGrowth: 0.05,
  giaGrowth: 0.05,
};

describe("buildChecklist", () => {
  it("starts empty for a fresh quiz plan", () => {
    const steps = buildChecklist(fresh, false, true);
    expect(steps.filter((s) => s.done)).toHaveLength(0);
  });

  it("completes 'balances' once any pot has a balance", () => {
    const steps = buildChecklist({ ...fresh, isaBalance: 20000 }, false, true);
    expect(steps.find((s) => s.id === "balances")?.done).toBe(true);
  });

  it("completes 'funds' once a wrapper has a portfolio", () => {
    const steps = buildChecklist(
      { ...fresh, isaHoldings: [fundToHolding(FUND_BY_ID.vwrp, 1)] },
      false,
      true,
    );
    expect(steps.find((s) => s.id === "funds")?.done).toBe(true);
  });

  it("completes 'save' only when signed in", () => {
    expect(
      buildChecklist(fresh, true, true).find((s) => s.id === "save")?.done,
    ).toBe(true);
  });

  it("omits 'save' when auth is not configured", () => {
    const steps = buildChecklist(fresh, false, false);
    expect(steps.find((s) => s.id === "save")).toBeUndefined();
    expect(steps.length).toBe(2);
  });
});

describe("progress + next step", () => {
  it("counts completed steps", () => {
    const p = checklistProgress(buildChecklist({ ...fresh, isaBalance: 1 }, false, true));
    expect(p).toEqual({ done: 1, total: 3, complete: false });
  });

  it("is complete when everything is done", () => {
    const done = buildChecklist(
      {
        ...fresh,
        isaBalance: 1,
        isaHoldings: [fundToHolding(FUND_BY_ID.vwrp, 1)],
      },
      true,
      true,
    );
    expect(checklistProgress(done).complete).toBe(true);
    expect(nextChecklistStep(done)).toBeNull();
  });

  it("points at the first incomplete step", () => {
    const steps = buildChecklist(fresh, false, true);
    expect(nextChecklistStep(steps)?.id).toBe("balances");
  });
});
