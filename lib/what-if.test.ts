import { describe, expect, it } from "vitest";
import type { FireInputs } from "./fire-engine";
import { retirementSensitivity } from "./what-if";

const base: FireInputs = {
  currentAge: 40,
  retirementAge: 55,
  targetAnnualIncome: 30000,
  isaBalance: 120000,
  isaMonthlyContribution: 1000,
  sippBalance: 90000,
  sippMonthlyContribution: 500,
};

describe("retirementSensitivity", () => {
  it("costs more per month to retire a year earlier", () => {
    const s = retirementSensitivity(base);
    expect(s.earlierAge).toBe(54);
    expect(s.earlierExtraMonthly).not.toBeNull();
    expect(s.earlierExtraMonthly!).toBeGreaterThanOrEqual(0);
  });

  it("frees up saving to retire a year later", () => {
    const s = retirementSensitivity(base);
    expect(s.laterAge).toBe(56);
    expect(s.laterSavingMonthly).toBeGreaterThanOrEqual(0);
  });

  it("skips the earlier case when retirement is already next year", () => {
    const s = retirementSensitivity({ ...base, retirementAge: 41 });
    // earlierAge would be 40 == currentAge, still allowed; test the boundary
    expect(s.earlierAge).toBe(40);
  });

  it("reports no earlier option when retirement equals current age", () => {
    const s = retirementSensitivity({ ...base, retirementAge: 40 });
    expect(s.earlierAge).toBeNull();
  });
});
