import { describe, expect, it } from "vitest";
import {
  buildChecklist,
  checklistProgress,
  type ChecklistFlags,
  nextChecklistStep,
} from "./checklist";
import type { FireInputs } from "./fire-engine";
import { FUND_BY_ID, fundToHolding } from "./vanguard-funds";

const noFlags: ChecklistFlags = { ranConfidence: false, viewedWithdrawals: false };

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
  it("marks only 'Plan created' done for a fresh quiz plan", () => {
    const steps = buildChecklist(fresh, noFlags, false);
    expect(steps.find((s) => s.id === "created")?.done).toBe(true);
    expect(steps.filter((s) => s.done)).toHaveLength(1);
  });

  it("completes 'balances' once any pot has a balance", () => {
    const steps = buildChecklist({ ...fresh, isaBalance: 20000 }, noFlags, false);
    expect(steps.find((s) => s.id === "balances")?.done).toBe(true);
  });

  it("completes 'funds' once a wrapper has a portfolio", () => {
    const steps = buildChecklist(
      { ...fresh, isaHoldings: [fundToHolding(FUND_BY_ID.vwrp, 1)] },
      noFlags,
      false,
    );
    expect(steps.find((s) => s.id === "funds")?.done).toBe(true);
  });

  it("completes 'confidence' and 'withdrawals' from engagement flags", () => {
    const steps = buildChecklist(
      fresh,
      { ranConfidence: true, viewedWithdrawals: true },
      false,
    );
    expect(steps.find((s) => s.id === "confidence")?.done).toBe(true);
    expect(steps.find((s) => s.id === "withdrawals")?.done).toBe(true);
  });

  it("completes 'save' only when signed in", () => {
    expect(
      buildChecklist(fresh, noFlags, true).find((s) => s.id === "save")?.done,
    ).toBe(true);
  });
});

describe("progress + next step", () => {
  it("counts completed steps", () => {
    const p = checklistProgress(buildChecklist({ ...fresh, isaBalance: 1 }, noFlags, false));
    expect(p).toEqual({ done: 2, total: 6, complete: false });
  });

  it("is complete when everything is done", () => {
    const done = buildChecklist(
      {
        ...fresh,
        isaBalance: 1,
        isaHoldings: [fundToHolding(FUND_BY_ID.vwrp, 1)],
      },
      { ranConfidence: true, viewedWithdrawals: true },
      true,
    );
    expect(checklistProgress(done).complete).toBe(true);
    expect(nextChecklistStep(done)).toBeNull();
  });

  it("points at the first incomplete step", () => {
    const steps = buildChecklist(fresh, noFlags, false);
    expect(nextChecklistStep(steps)?.id).toBe("balances");
  });
});
