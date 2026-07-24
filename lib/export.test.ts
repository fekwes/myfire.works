import { describe, expect, it } from "vitest";
import { type FireInputs, simulateFire } from "./fire-engine";
import { CSV_COLUMN_COUNT, planInputsJson, planTimelineCsv } from "./export";

const inputs: FireInputs = {
  currentAge: 40,
  retirementAge: 55,
  targetAnnualIncome: 30000,
  isaBalance: 120000,
  isaMonthlyContribution: 800,
  sippBalance: 90000,
  sippMonthlyContribution: 400,
  lifeExpectancyAge: 95,
};

describe("planTimelineCsv", () => {
  const csv = planTimelineCsv(simulateFire(inputs));
  const lines = csv.split("\n");

  it("has a header plus one row per simulated year", () => {
    // ages 40..95 inclusive = 56 rows, + 1 header.
    expect(lines).toHaveLength(56 + 1);
  });

  it("has the documented column count on every row", () => {
    for (const line of lines) {
      expect(line.split(",")).toHaveLength(CSV_COLUMN_COUNT);
    }
  });

  it("starts at the current age and ends at life expectancy", () => {
    expect(lines[1].split(",")[0]).toBe("40");
    expect(lines.at(-1)?.split(",")[0]).toBe("95");
  });
});

describe("planInputsJson", () => {
  it("round-trips the inputs", () => {
    expect(JSON.parse(planInputsJson(inputs))).toEqual(inputs);
  });
});
