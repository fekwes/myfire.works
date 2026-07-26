import { describe, expect, it } from "vitest";
import {
  describeProfileError,
  findProfileByName,
  formatSavedAt,
  isValidProfileName,
  MAX_PROFILE_NAME,
  nextCopyName,
  normaliseProfileName,
  parseProfileRows,
  type Profile,
  profileInputsForLoad,
  sortProfiles,
} from "./profiles";

const profile = (name: string, updated_at?: string): Profile => ({
  id: name,
  name,
  inputs: {} as Profile["inputs"],
  updated_at,
});

describe("normaliseProfileName", () => {
  it("trims and collapses whitespace", () => {
    expect(normaliseProfileName("  My   plan \n")).toBe("My plan");
  });

  it("caps the length", () => {
    expect(normaliseProfileName("x".repeat(200))).toHaveLength(MAX_PROFILE_NAME);
  });

  it("returns an empty string for whitespace only", () => {
    expect(normaliseProfileName("   ")).toBe("");
  });
});

describe("isValidProfileName", () => {
  it("rejects blank names", () => {
    expect(isValidProfileName("")).toBe(false);
    expect(isValidProfileName("   ")).toBe(false);
  });

  it("accepts real names", () => {
    expect(isValidProfileName(" Retire at 55 ")).toBe(true);
  });
});

describe("findProfileByName", () => {
  const plans = [profile("Plan A"), profile("Retire at 55")];

  it("matches case-insensitively and ignores padding", () => {
    expect(findProfileByName(plans, "  plan a ")?.name).toBe("Plan A");
  });

  it("returns undefined when absent", () => {
    expect(findProfileByName(plans, "Nope")).toBeUndefined();
  });
});

describe("nextCopyName", () => {
  it("keeps the name when it's free", () => {
    expect(nextCopyName("Plan B", [profile("Plan A")])).toBe("Plan B");
  });

  it("suffixes until it finds a free name", () => {
    const plans = [profile("Plan"), profile("Plan (2)")];
    expect(nextCopyName("Plan", plans)).toBe("Plan (3)");
  });

  it("never collides with an existing profile", () => {
    const plans = [profile("Plan"), profile("Plan (2)"), profile("Plan (3)")];
    expect(findProfileByName(plans, nextCopyName("Plan", plans))).toBeUndefined();
  });

  it("falls back to a placeholder for a blank base", () => {
    expect(nextCopyName("   ", [])).toBe("Untitled plan");
  });
});

describe("sortProfiles", () => {
  it("orders newest first and puts unknown timestamps last", () => {
    const rows = [
      profile("old", "2026-01-01T00:00:00Z"),
      profile("unknown"),
      profile("new", "2026-06-01T00:00:00Z"),
    ];
    expect(sortProfiles(rows).map((p) => p.name)).toEqual([
      "new",
      "old",
      "unknown",
    ]);
  });

  it("does not mutate the input", () => {
    const rows = [profile("a", "2026-01-01T00:00:00Z"), profile("b", "2026-02-01T00:00:00Z")];
    sortProfiles(rows);
    expect(rows.map((p) => p.name)).toEqual(["a", "b"]);
  });
});

describe("describeProfileError", () => {
  it("returns null when there is no error", () => {
    expect(describeProfileError(null)).toBeNull();
  });

  it("explains a missing table", () => {
    expect(describeProfileError({ code: "42P01" })).toMatch(/aren't set up/i);
  });

  it("explains a permission failure", () => {
    expect(describeProfileError({ code: "42501" })).toMatch(/permission/i);
  });

  it("explains a duplicate name", () => {
    expect(describeProfileError({ code: "23505" })).toMatch(/already have a plan/i);
  });

  it("falls back to the raw message", () => {
    expect(describeProfileError({ message: "boom" })).toBe("Couldn't save: boom");
  });

  it("always returns something for an unknown error", () => {
    expect(describeProfileError({})).toBeTruthy();
  });

  // A failed read used to be described as a failed save, which sends someone
  // hunting for a save problem they don't have.
  it("describes a read failure as a read, not a save", () => {
    expect(describeProfileError({ message: "boom" }, "read")).toBe(
      "Couldn't load your saved plans: boom",
    );
    expect(describeProfileError({ code: "42P01" }, "read")).toMatch(
      /nothing to load/i,
    );
    expect(describeProfileError({ code: "42501" }, "read")).toMatch(
      /permission to load/i,
    );
  });

  it("describes a delete failure as a delete", () => {
    expect(describeProfileError({ message: "boom" }, "delete")).toBe(
      "Couldn't delete that: boom",
    );
  });
});

/**
 * A row's `inputs` is a `jsonb` blob that an older build, a hand-edited row or
 * a mid-edit save could have written — untrusted input, exactly like
 * localStorage and share links. Before this ran through `sanitisePlanInput`,
 * one bad row rendered `£NaN` across the projection.
 */
describe("parseProfileRows", () => {
  const validInputs = {
    currentAge: 40,
    retirementAge: 55,
    targetAnnualIncome: 30000,
    isaBalance: 50000,
    isaMonthlyContribution: 500,
    sippBalance: 80000,
    sippMonthlyContribution: 400,
  };
  const row = (over: Record<string, unknown> = {}) => ({
    id: "row-1",
    name: "My plan",
    inputs: validInputs,
    updated_at: "2026-06-01T00:00:00Z",
    ...over,
  });

  it("keeps a well-formed row", () => {
    const { profiles, dropped } = parseProfileRows([row()]);
    expect(dropped).toBe(0);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].inputs.currentAge).toBe(40);
  });

  it("returns nothing for a null or non-array payload", () => {
    expect(parseProfileRows(null)).toEqual({ profiles: [], dropped: 0 });
    expect(parseProfileRows({ id: "x" })).toEqual({ profiles: [], dropped: 0 });
  });

  it("drops a row whose inputs are missing an essential figure", () => {
    const { profiles, dropped } = parseProfileRows([
      row({ id: "bad", inputs: { retirementAge: 55, targetAnnualIncome: 30000 } }),
      row(),
    ]);
    expect(dropped).toBe(1);
    expect(profiles.map((p) => p.id)).toEqual(["row-1"]);
  });

  it("drops a row whose essential figure is not finite", () => {
    // `NaN` serialises to `null` in JSON, which is how this arrives in practice.
    const { dropped } = parseProfileRows([
      row({ inputs: { ...validInputs, currentAge: null } }),
    ]);
    expect(dropped).toBe(1);
  });

  it("strips a non-finite non-essential figure rather than dropping the row", () => {
    const { profiles, dropped } = parseProfileRows([
      row({ inputs: { ...validInputs, giaBalance: Number.POSITIVE_INFINITY } }),
    ]);
    expect(dropped).toBe(0);
    expect(profiles[0].inputs.giaBalance).toBeUndefined();
  });

  it("drops rows without a usable id or name", () => {
    const { dropped, profiles } = parseProfileRows([
      row({ id: 42 }),
      row({ name: null }),
      "not a row",
      null,
    ]);
    expect(profiles).toHaveLength(0);
    expect(dropped).toBe(4);
  });

  it("returns the survivors newest first", () => {
    const { profiles } = parseProfileRows([
      row({ id: "old", updated_at: "2026-01-01T00:00:00Z" }),
      row({ id: "new", updated_at: "2026-06-01T00:00:00Z" }),
    ]);
    expect(profiles.map((p) => p.id)).toEqual(["new", "old"]);
  });

  it("normalises a missing timestamp to null", () => {
    const { profiles } = parseProfileRows([row({ updated_at: 12345 })]);
    expect(profiles[0].updated_at).toBeNull();
  });
});

describe("profileInputsForLoad", () => {
  it("returns validated inputs for a good profile", () => {
    const profile = {
      id: "a",
      name: "a",
      inputs: {
        currentAge: 40,
        retirementAge: 55,
        targetAnnualIncome: 30000,
      },
    } as unknown as Profile;
    expect(profileInputsForLoad(profile)?.retirementAge).toBe(55);
  });

  it("returns null rather than handing junk to the engine", () => {
    const profile = { id: "a", name: "a", inputs: { currentAge: 40 } } as unknown as Profile;
    expect(profileInputsForLoad(profile)).toBeNull();
  });
});

describe("formatSavedAt", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("is empty for missing or unparseable input", () => {
    expect(formatSavedAt(null, now)).toBe("");
    expect(formatSavedAt("not a date", now)).toBe("");
  });

  it("describes recent saves", () => {
    expect(formatSavedAt("2026-06-01T11:59:30Z", now)).toBe("just now");
    expect(formatSavedAt("2026-06-01T11:30:00Z", now)).toBe("30m ago");
    expect(formatSavedAt("2026-06-01T09:00:00Z", now)).toBe("3h ago");
    expect(formatSavedAt("2026-05-30T12:00:00Z", now)).toBe("2d ago");
  });

  it("falls back to a date for old saves", () => {
    expect(formatSavedAt("2026-01-05T12:00:00Z", now)).toMatch(/2026/);
  });
});
