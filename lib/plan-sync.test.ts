import { describe, expect, it } from "vitest";
import type { FireInputs } from "./fire-engine";
import { decidePlanSync } from "./plan-sync";
import type { Profile } from "./profiles";

const inputs = (currentAge: number) =>
  ({ currentAge, retirementAge: 55, targetAnnualIncome: 30000 }) as FireInputs;

const saved = (id: string, age: number): Profile => ({
  id,
  name: id,
  inputs: inputs(age),
  updated_at: "2026-06-01T00:00:00Z",
});

describe("decidePlanSync", () => {
  /**
   * The regression this policy exists for: the plan used to be saved at the
   * `signUp()` call, which only returns a session when the Supabase project has
   * email confirmation off. With confirmation on — the default, and how this
   * project is configured — the save never ran and nothing said so.
   */
  it("adopts the local plan for a brand-new account", () => {
    expect(decidePlanSync({ hasLocalPlan: true, saved: [] })).toEqual({
      kind: "adopt-local",
    });
  });

  it("does nothing for a new account with no local plan", () => {
    expect(decidePlanSync({ hasLocalPlan: false, saved: [] })).toEqual({
      kind: "none",
    });
  });

  it("restores the newest saved plan on a fresh browser", () => {
    const action = decidePlanSync({
      hasLocalPlan: false,
      saved: [saved("newest", 41), saved("older", 40)],
    });
    expect(action.kind).toBe("restore");
    expect(action.kind === "restore" && action.inputs.currentAge).toBe(41);
  });

  // Local could be newer, unsaved work. Replacing it is indistinguishable from
  // losing it, so an explicit Load is the only thing allowed to overwrite.
  it("never overwrites an existing local plan", () => {
    expect(
      decidePlanSync({ hasLocalPlan: true, saved: [saved("a", 40)] }),
    ).toEqual({ kind: "none" });
  });
});
