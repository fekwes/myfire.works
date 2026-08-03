import { describe, expect, it } from "vitest";
import {
  extractWrapperBalances,
  normalizeTextStream,
  parseGbpAmount,
  parsePlanFromText,
} from "./plan-import-fallback";

describe("lib/plan-import-fallback", () => {
  it("normalizes text streams by removing page headers and normalizing whitespace", () => {
    const raw = "Vanguard Statement \f Page 1 of 10 \r\n\r\n SIPP \t £100,000 ";
    const clean = normalizeTextStream(raw);
    expect(clean).toContain("Vanguard Statement");
    expect(clean).not.toContain("Page 1 of 10");
    expect(clean).toContain("SIPP £100,000");
  });

  it("parses GBP currency strings correctly", () => {
    expect(parseGbpAmount("£337,856.14")).toBe(337856.14);
    expect(parseGbpAmount("166,720.37")).toBe(166720.37);
    expect(parseGbpAmount("£196,717.05")).toBe(196717.05);
    expect(parseGbpAmount("invalid")).toBeNull();
  });

  it("extracts exact Vanguard UK portfolio values across multi-line layout and NPR references", () => {
    const vanguardUkStatementText = `
Vanguard Asset Management, Limited
Valuation Statement as at 31 March 2026

Portfolio Value by Product Wrapper

Product Wrapper        Account Number     Value
Vanguard Personal Pension
NPR84729104
£337,856.14

Stocks & Shares ISA
NPR91823471
£166,720.37

Personal Portfolio
NPR10293847
£196,717.05

Total Portfolio Value: £701,293.56
`;

    const balances = extractWrapperBalances(vanguardUkStatementText);

    expect(balances.sipp).toBe(337856.14);
    expect(balances.isa).toBe(166720.37);
    expect(balances.gia).toBe(196717.05);
  });

  it("handles alternative UK broker terms (SIPP, ISA, GIA, General Investment Account)", () => {
    const statementText = `
Account Summary:
SIPP Balance: £337,856.14
Individual Savings Account (ISA): £166,720.37
General Investment Account (GIA): £196,717.05
Emergency Fund: £15,000
Monthly Contribution: £1,500
`;

    const result = parsePlanFromText(statementText);
    expect(result.wrappers.sipp).toBe(337856.14);
    expect(result.wrappers.isa).toBe(166720.37);
    expect(result.wrappers.gia).toBe(196717.05);
    expect(result.wrappers.emergencyFund).toBe(15000);
    expect(result.wrappers.monthlyContribution).toBe(1500);
    expect(result.confidence).toBe("high");
    expect(result.confidenceScore).toBeGreaterThan(0.8);
  });

  it("extracts wrapper balances from messy pasted text with mixed currency formatting", () => {
    const messyText = `
Portfolio snapshot
Stocks & Shares ISA  166,720.37
SIPP 337856.14
Personal Portfolio 196717.05
Monthly contribution 1500
`;

    const result = parsePlanFromText(messyText);
    expect(result.wrappers.isa).toBe(166720.37);
    expect(result.wrappers.sipp).toBe(337856.14);
    expect(result.wrappers.gia).toBe(196717.05);
    expect(result.wrappers.monthlyContribution).toBe(1500);
  });

  it("keeps account references out of balances and maps each wrapper contribution", () => {
    const result = parsePlanFromText(`
Portfolio Value by Product Wrapper
Vanguard Personal Pension
NPR84729104
GBP 337856.14
Stocks & Shares ISA: £166,720.37 (adding £500/mo)
Bridge Fund: 20,000 GBP; regular investment £250 per month
`);

    expect(result.wrappers.sipp).toBe(337856.14);
    expect(result.wrappers.isa).toBe(166720.37);
    expect(result.wrappers.gia).toBe(20000);
    expect(result.wrappers.isaMonthlyContribution).toBe(500);
    expect(result.wrappers.giaMonthlyContribution).toBe(250);
  });
});
