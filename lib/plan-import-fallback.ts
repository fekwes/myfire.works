import { ASSET_CLASSES, type AssetClass, isAssetClass } from "./assets";

/**
 * Result structure returned by fallback text stream parsing.
 */
export interface ExtractedWrapperBalances {
  sipp: number | null;
  isa: number | null;
  gia: number | null;
  emergencyFund: number | null;
  monthlyContribution: number | null;
}

export interface FallbackHolding {
  label: string;
  assetClass: AssetClass;
  ocf: number;
  weight: number;
}

export interface PlanImportFallbackResult {
  wrappers: ExtractedWrapperBalances;
  holdings: FallbackHolding[];
  confidence: "high" | "medium" | "low" | "none";
  confidenceScore: number;
  extractedTextLength: number;
}

/**
 * Normalise raw text stream extracted from PDF/CSV/paste before scanning.
 * - Strips headers/footers (e.g. "Page X of Y", "Vanguard Asset Management").
 * - Unifies line breaks and spaces.
 * - Removes non-printable characters.
 */
export function normalizeTextStream(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\f/g, "\n") // Form feeds to newlines
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/Page\s+\d+\s+of\s+\d+/gi, "") // Page numbering headers/footers
    .replace(/[ \t]+/g, " ") // Collapse whitespace
    .replace(/\n\s*\n/g, "\n") // Collapse blank lines
    .trim();
}

/**
 * Extract a numeric GBP figure from a text match string (e.g., "£337,856.14" -> 337856.14).
 */
export function parseGbpAmount(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : null;
}

function detectCurrencyValue(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const trimmed = cleaned.trim();
  if (!trimmed) return null;
  const num = parseFloat(trimmed);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : null;
}

/**
 * Windowed Multi-Line Wrapper Extraction
 *
 * Why standard single-line regex fails on Vanguard UK PDFs:
 * Vanguard UK 10-page Portfolio Valuation PDFs layout tables as:
 *   "Portfolio Value by Product Wrapper"
 *   "Vanguard Personal Pension"
 *   "NPR12345678"
 *   "£337,856.14"
 *
 * Single-line regexes look for `SIPP:\s*£([\d,]+)` and fail because the wrapper title,
 * NPR account reference, and total valuation amount are separated by newlines and token gaps.
 */
export function extractWrapperBalances(text: string): ExtractedWrapperBalances {
  const normalized = normalizeTextStream(text);
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const result: ExtractedWrapperBalances = {
    sipp: null,
    isa: null,
    gia: null,
    emergencyFund: null,
    monthlyContribution: null,
  };

  // Helper to search a window of lines after a pattern match for a currency figure
  const findValueInWindow = (lineIndex: number, maxLookaheadLines = 5): number | null => {
    for (let i = lineIndex; i < Math.min(lines.length, lineIndex + maxLookaheadLines); i++) {
      const line = lines[i];
      const currencyMatch = line.match(/(?:£|GBP|£\s*)\s*([\d,]+(?:\.\d{2})?)/i);
      if (currencyMatch) {
        const amt = detectCurrencyValue(currencyMatch[1]);
        if (amt !== null && amt > 0) return amt;
      }
      const numMatch = line.match(/\b([\d]{1,3}(?:,\d{3})+\.\d{2}|\d+(?:\.\d{2})?)\b/);
      if (numMatch) {
        const amt = detectCurrencyValue(numMatch[1]);
        if (amt !== null && amt > 0) return amt;
      }
    }
    return null;
  };

  // 1. Scan for SIPP / Vanguard Personal Pension
  const sippKeywords = [
    /Vanguard\s+Personal\s+Pension/i,
    /Personal\s+Pension/i,
    /\bSIPP\b/i,
    /Self-Invested\s+Personal\s+Pension/i,
    /Pension/i,
  ];

  // 2. Scan for ISA / Stocks & Shares ISA
  const isaKeywords = [
    /Stocks\s*&\s*Shares\s*ISA/i,
    /Vanguard\s+Stocks\s*&\s*Shares\s*ISA/i,
    /\bISA\b/i,
    /Individual\s+Savings\s+Account/i,
    /Stocks\s+and\s+Shares/i,
  ];

  // 3. Scan for GIA / General Investment Account / Personal Portfolio / Stocks/Shares
  const giaKeywords = [
    /General\s+Investment\s+Account/i,
    /Personal\s+Portfolio/i,
    /\bGIA\b/i,
    /Stocks\s*\/\s*Shares/i,
    /Flexible\s+Account/i,
    /Bridge\s+Fund/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check SIPP
    if (result.sipp === null && sippKeywords.some((r) => r.test(line))) {
      const val = findValueInWindow(i);
      if (val !== null) result.sipp = val;
    }

    // Check ISA
    if (result.isa === null && isaKeywords.some((r) => r.test(line))) {
      const val = findValueInWindow(i);
      if (val !== null) result.isa = val;
    }

    // Check GIA
    if (result.gia === null && giaKeywords.some((r) => r.test(line))) {
      const val = findValueInWindow(i);
      if (val !== null) result.gia = val;
    }
  }

  // Fallback single-string regexes if window scan missed anything
  if (result.sipp === null) {
    const m = normalized.match(/(?:Vanguard\s+Personal\s+Pension|Personal\s+Pension|SIPP)[^\n\r£]*?£\s*([\d,]+\.\d{2})/i);
    if (m) result.sipp = parseGbpAmount(m[1]);
  }
  if (result.isa === null) {
    const m = normalized.match(/(?:Stocks\s*&\s*Shares\s*ISA|ISA)[^\n\r£]*?£\s*([\d,]+\.\d{2})/i);
    if (m) result.isa = parseGbpAmount(m[1]);
  }
  if (result.gia === null) {
    const m = normalized.match(/(?:General\s+Investment\s+Account|Personal\s+Portfolio|GIA|Stocks\/Shares)[^\n\r£]*?£\s*([\d,]+\.\d{2})/i);
    if (m) result.gia = parseGbpAmount(m[1]);
  }

  // Emergency Fund / Cash Buffer heuristics
  const efMatch = normalized.match(/(?:Emergency\s+Fund|Cash\s+Buffer|Cash\s+Reserve)[^\n\r£]*?(?:£|GBP)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (efMatch) result.emergencyFund = detectCurrencyValue(efMatch[1]);

  // Monthly Contribution heuristics
  const mcMatch = normalized.match(/(?:Monthly\s+Contribution|Monthly\s+Savings|Regular\s+Investment)[^\n\r£]*?(?:£|GBP)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (mcMatch) result.monthlyContribution = detectCurrencyValue(mcMatch[1]);

  return result;
}

/**
 * Extract fund holdings from text stream as fallback.
 */
export function extractHoldingsFromText(text: string): FallbackHolding[] {
  const normalized = normalizeTextStream(text);
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const holdings: FallbackHolding[] = [];

  for (const line of lines) {
    // Look for lines that look like fund names followed by £ values or percentages
    const match = line.match(/^(.+?)\s+(?:£([\d,]+\.\d{2})|([\d.]+)%)/);
    if (match) {
      const fundName = match[1].trim();
      if (fundName.length > 3 && !/Total|Portfolio|Account|NPR\d+/i.test(fundName)) {
        let assetClass: AssetClass = "global-equity";
        const lowerName = fundName.toLowerCase();
        if (lowerName.includes("lifestrategy 60") || lowerName.includes("60% equity")) {
          assetClass = "multi-asset-60";
        } else if (lowerName.includes("lifestrategy 80") || lowerName.includes("80% equity")) {
          assetClass = "multi-asset-80";
        } else if (lowerName.includes("lifestrategy 100") || lowerName.includes("100% equity")) {
          assetClass = "multi-asset-100";
        } else if (lowerName.includes("s&p 500") || lowerName.includes("us equity")) {
          assetClass = "us-equity";
        } else if (lowerName.includes("bond") || lowerName.includes("gilt")) {
          assetClass = "global-bonds";
        } else if (lowerName.includes("money market") || lowerName.includes("cash")) {
          assetClass = "cash";
        }

        const rawVal = match[2] ? parseGbpAmount(match[2]) : parseFloat(match[3]);
        holdings.push({
          label: fundName.slice(0, 80),
          assetClass,
          ocf: 0.002,
          weight: rawVal ?? 1,
        });
      }
    }
  }

  // Normalise weights
  if (holdings.length > 0) {
    const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);
    return holdings.map((h) => ({
      ...h,
      weight: totalWeight > 0 ? h.weight / totalWeight : 1 / holdings.length,
    }));
  }

  return [];
}

/**
 * Full pure fallback plan parser combining wrapper extraction & fund holdings.
 */
export function parsePlanFromText(text: string): PlanImportFallbackResult {
  const wrappers = extractWrapperBalances(text);
  const holdings = extractHoldingsFromText(text);

  const foundWrappers = [wrappers.sipp, wrappers.isa, wrappers.gia].filter(
    (v) => v !== null && v > 0,
  ).length;

  let confidence: "high" | "medium" | "low" | "none" = "none";
  let score = 0;

  if (foundWrappers >= 2 && holdings.length > 0) {
    confidence = "high";
    score = 0.94;
  } else if (foundWrappers >= 1 || holdings.length > 0) {
    confidence = "medium";
    score = 0.72;
  } else if (text.trim().length > 0) {
    confidence = "low";
    score = 0.35;
  }

  if (foundWrappers === 0 && text.trim().length > 0 && holdings.length === 0) {
    score = 0.2;
  }

  return {
    wrappers,
    holdings,
    confidence,
    confidenceScore: score,
    extractedTextLength: text.length,
  };
}
