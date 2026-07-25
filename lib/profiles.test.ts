import { describe, expect, it } from "vitest";
import {
  describeProfileError,
  findProfileByName,
  formatSavedAt,
  isValidProfileName,
  MAX_PROFILE_NAME,
  nextCopyName,
  normaliseProfileName,
  type Profile,
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
