import { describe, expect, it } from "vitest";
import { parseTextPlanFallback } from "./plan-import-fallback";

describe("parseTextPlanFallback UK Broker Statements", () => {
  it("extracts Vanguard UK multi-wrapper statement accurately without account number pollution", () => {
    const vanguardStatement = `
      Vanguard Asset Management
      Client name: Alberto Bernabe Saez
      Account number: VG0220641

      Portfolio Value by Product Wrapper as at 29 July 2026
      NPR / Vanguard Personal Pension
      Investment name Asset sector Quantity Original cost £ Current price £ Current value £
      Vanguard Global Equity Income Fund £101,888.84
      FTSE 250 UCITS ETF £47,927.40
      Vanguard Global Emerging Markets £47,128.95
      Total £337,856.14

      Personal Portfolio / Non-ISA Savings (CGT)
      Sterling Short-Term Money Market £36,506.56
      Vanguard Global Small-Cap Index £37,801.34
      Total £196,717.05

      Stocks/Shares ISA
      Vanguard Global Equity Income Fund £111,204.27
      Vanguard Global Small-Cap £38,651.20
      Total £166,720.37
    `;

    const plan = parseTextPlanFallback(vanguardStatement);
    expect(plan.sippBalance).toBe(337856.14);
    expect(plan.giaBalance).toBe(196717.05);
    expect(plan.isaBalance).toBe(166720.37);
  });

  it("extracts Hargreaves Lansdown statements with SIPP, ISA, and Active Savings", () => {
    const hlStatement = `
      Hargreaves Lansdown Portfolio Valuation
      Account Reference: 80012345
      SIPP Balance: £245,000.00
      Stocks and Shares ISA: £85,500.50
      Fund & Share Account (GIA): £42,100.00
      Monthly Contribution: SIPP £800/mo, ISA £500/mo
    `;

    const plan = parseTextPlanFallback(hlStatement);
    expect(plan.sippBalance).toBe(245000);
    expect(plan.isaBalance).toBe(85500.5);
    expect(plan.giaBalance).toBe(42100);
    expect(plan.sippMonthlyContribution).toBe(800);
    expect(plan.isaMonthlyContribution).toBe(500);
  });

  it("filters out 8-digit account numbers so they are never mistaken for balances", () => {
    const textWithAccNo = `
      Vanguard Personal Pension Account 80022064 Total £337,856.14
      ISA Account 50012345 Total £166,720.37
    `;

    const plan = parseTextPlanFallback(textWithAccNo);
    expect(plan.sippBalance).toBe(337856.14);
    expect(plan.isaBalance).toBe(166720.37);
  });

  it("extracts Fidelity UK statements with Workplace Pension, Stocks & Shares ISA, and Investment Account", () => {
    const fidelityStatement = `
      Fidelity Personal Investing Portfolio Valuation
      Account Overview:
      Workplace Pension: £185,000.00
      Stocks and Shares ISA: £92,000.00
      Investment Account: £34,500.00
    `;

    const plan = parseTextPlanFallback(fidelityStatement);
    expect(plan.sippBalance).toBe(185000);
    expect(plan.isaBalance).toBe(92000);
    expect(plan.giaBalance).toBe(34500);
  });

  it("extracts Interactive Investor statements with SIPP, Trading ISA, and Trading Account", () => {
    const iiStatement = `
      Interactive Investor Portfolio Statement
      Self-Invested Personal Pension: £295,000.00
      Stocks and Shares ISA: £140,000.00
      Trading Account: £65,000.00
    `;

    const plan = parseTextPlanFallback(iiStatement);
    expect(plan.sippBalance).toBe(295000);
    expect(plan.isaBalance).toBe(140000);
    expect(plan.giaBalance).toBe(65000);
  });

  it("extracts modern Vanguard UK terms including Non-ISA Since 2025", () => {
    const modernVanguardText = `
      Vanguard Investor Summary
      Vanguard Personal Pension £210,000.00
      Stocks & Shares ISA £80,000.00
      Non-ISA Since 2025 £45,000.00
    `;

    const plan = parseTextPlanFallback(modernVanguardText);
    expect(plan.sippBalance).toBe(210000);
    expect(plan.isaBalance).toBe(80000);
    expect(plan.giaBalance).toBe(45000);
  });

  it("extracts Nutmeg & digital wealth manager portfolios", () => {
    const nutmegText = `
      Nutmeg Portfolio Summary
      Personal Pension Pot: £120,000.00
      Stocks & Shares ISA: £65,000.00
      Unwrapped Account: £25,000.00
    `;

    const plan = parseTextPlanFallback(nutmegText);
    expect(plan.sippBalance).toBe(120000);
    expect(plan.isaBalance).toBe(65000);
    expect(plan.giaBalance).toBe(25000);
  });

  it("extracts UK Bank cash savings & current account balances", () => {
    const bankStatementText = `
      Barclays / Monzo Account Overview
      Cash ISA: £20,000.00
      Cash Savings Pot: £15,000.00
      Workplace Pension: £110,000.00
    `;

    const plan = parseTextPlanFallback(bankStatementText);
    expect(plan.isaBalance).toBe(20000);
    expect(plan.giaBalance).toBe(15000);
    expect(plan.sippBalance).toBe(110000);
  });

  it("calculates wrapper balances mathematically from Product Wrapper Allocation pie chart percentages", () => {
    const pieChartText = `
      Total Portfolio Value: £701,293.56
      Product Wrapper Allocation:
      Vanguard Personal Pension: 48.18%
      ISA: 23.77%
      Non-ISA Savings (CGT): 18.13%
      Non-ISA Since 2025 (CGT): 9.92%
    `;

    const plan = parseTextPlanFallback(pieChartText);
    expect(plan.sippBalance).toBeCloseTo(337883.24, 0);
    expect(plan.isaBalance).toBeCloseTo(166697.48, 0);
    expect(plan.giaBalance).toBeCloseTo(196712.84, 0);
  });
});

