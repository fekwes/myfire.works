import { describe, expect, it } from "vitest";
import { calculateTax } from "./tax";
import { ukPack } from "../countries/uk";
import { calculateUkIncomeTax, calculateCapitalGainsTax, BASIC_RATE_CEILING } from "../fire-engine";

describe("Generic Tax Engine vs UK Hardcoded Engine", () => {
  const taxSys = ukPack.taxSystem(undefined, undefined);

  it("matches income tax exactly for various incomes", () => {
    const incomesToTest = [12000, 30000, 60000, 110000, 125140, 200000];
    
    for (const income of incomesToTest) {
      const genericResult = calculateTax({ "employment": income }, taxSys);
      const hardcodedResult = calculateUkIncomeTax(income);
      expect(genericResult.taxByBase["income"]).toBeCloseTo(hardcodedResult, 2);
    }
  });

  it("matches CGT exactly for various gains and other incomes", () => {
    // 1. Gain within exempt amount
    let genericResult = calculateTax({ "employment": 0, "realised-gains": 1000 }, taxSys);
    expect(genericResult.taxByBase["cgt"]).toBe(0);

    // 2. Gain with basic rate remaining
    genericResult = calculateTax({ "employment": 0, "realised-gains": 10000 }, taxSys);
    let hardcodedResult = calculateCapitalGainsTax(10000, BASIC_RATE_CEILING);
    expect(genericResult.taxByBase["cgt"]).toBeCloseTo(hardcodedResult, 2);

    // 3. Gain with NO basic rate remaining (income is at 60k)
    // Wait, the generic engine stacks on "income". 
    // In our generic engine, `stackedIncome` is the routed base income. So if employment is 60k, it will stack.
    genericResult = calculateTax({ "employment": 60000, "realised-gains": 10000 }, taxSys);
    // Hardcoded logic for CGT uses `remainingBasicBand`. With 60k income, remaining is 0.
    hardcodedResult = calculateCapitalGainsTax(10000, Math.max(0, BASIC_RATE_CEILING - 60000));
    expect(genericResult.taxByBase["cgt"]).toBeCloseTo(hardcodedResult, 2);

    // 4. Split gain
    genericResult = calculateTax({ "employment": 47270, "realised-gains": 20000 }, taxSys);
    // remaining basic band = 50270 - 47270 = 3000
    hardcodedResult = calculateCapitalGainsTax(20000, 3000);
    expect(genericResult.taxByBase["cgt"]).toBeCloseTo(hardcodedResult, 2);

    // 5. Large gain with zero income: taxable gain = 47000. Basic rate band is 37700 @ 18%, remaining 9300 @ 24%
    genericResult = calculateTax({ "employment": 0, "realised-gains": 50000 }, taxSys);
    // 37700 * 0.18 + 9300 * 0.24 = 6786 + 2232 = 9018
    expect(genericResult.taxByBase["cgt"]).toBeCloseTo(9018, 2);

    // 6. High CGT with income > 100k: verify CGT does NOT taper Personal Allowance on income
    const highCgtResult = calculateTax({ "employment": 90000, "realised-gains": 50000 }, taxSys);
    // Income tax on 90k should be identical whether CGT is 0 or 50k
    const noCgtResult = calculateTax({ "employment": 90000 }, taxSys);
    expect(highCgtResult.taxByBase["income"]).toBeCloseTo(noCgtResult.taxByBase["income"], 2);
  });
});
