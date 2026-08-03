import type { AssetClass } from "./assets";

export interface ExtractedPlan {
  currentAge?: number;
  retirementAge?: number;
  targetAnnualIncome?: number;
  isaBalance?: number;
  isaMonthlyContribution?: number;
  sippBalance?: number;
  sippMonthlyContribution?: number;
  giaBalance?: number;
  giaMonthlyContribution?: number;
  homeValue?: number;
  rentalValue?: number;
  rentalMonthlyIncome?: number;
  partTimeAnnualIncome?: number;
  sippAccessAge?: number;
  statePensionAge?: number;
}

export interface ExtractedWrapperBalances {
  sipp: number | null;
  sippMonthlyContribution: number | null;
  isa: number | null;
  isaMonthlyContribution: number | null;
  gia: number | null;
  giaMonthlyContribution: number | null;
  emergencyFund: number | null;
  /** Kept for callers that only know a total monthly saving amount. */
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
export function formatExtractedTotalsSummary(plan: Partial<ExtractedPlan>, currencySymbol = "£"): string {
  const items: string[] = [];
  const formatValue = (value: number) => `${currencySymbol}${value.toLocaleString("en-GB")}`;

  if (plan.isaBalance) items.push(`ISA: ${formatValue(plan.isaBalance)}`);
  if (plan.isaMonthlyContribution) items.push(`ISA Contrib: ${formatValue(plan.isaMonthlyContribution)}/mo`);
  if (plan.sippBalance) items.push(`SIPP: ${formatValue(plan.sippBalance)}`);
  if (plan.sippMonthlyContribution) items.push(`SIPP Contrib: ${formatValue(plan.sippMonthlyContribution)}/mo`);
  if (plan.giaBalance) items.push(`GIA: ${formatValue(plan.giaBalance)}`);
  if (plan.giaMonthlyContribution) items.push(`GIA Contrib: ${formatValue(plan.giaMonthlyContribution)}/mo`);
  if (plan.homeValue) items.push(`Home: ${formatValue(plan.homeValue)}`);
  if (plan.rentalValue) items.push(`Rental: ${formatValue(plan.rentalValue)}`);
  if (plan.rentalMonthlyIncome) items.push(`Rental Rent: ${formatValue(plan.rentalMonthlyIncome)}/mo`);
  if (plan.partTimeAnnualIncome) items.push(`Side Income: ${formatValue(plan.partTimeAnnualIncome)}/yr`);

  if (items.length === 0) {
    return "Plan imported with AI! Asset balances and contributions have been updated in your finances below.";
  }

  return `Plan imported with AI! Updated totals: ${items.join(" • ")}`;
}

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
  const compact = val
    .trim()
    .replace(/(?:GBP|EUR|USD|[£€$])/gi, "")
    .replace(/\s/g, "");
  const unit = compact.match(/[km]$/i)?.[0]?.toLowerCase();
  const numeric = compact.replace(/[km]$/i, "").replace(/,/g, "");
  const num = Number(numeric);
  if (!Number.isFinite(num) || num < 0) return null;
  const multiplier = unit === "m" ? 1_000_000 : unit === "k" ? 1_000 : 1;
  return Math.round(num * multiplier * 100) / 100;
}

function detectCurrencyValue(value: string): number | null {
  return parseGbpAmount(value);
}

type WrapperKey = "sipp" | "isa" | "gia";

const WRAPPER_PATTERNS: Record<WrapperKey, RegExp[]> = {
  sipp: [
    /Vanguard\s+Personal\s+Pension/i,
    /Personal\s+Pension/i,
    /\bSIPP\b/i,
    /Self-Invested\s+Personal\s+Pension/i,
    /\bPension\b/i,
  ],
  isa: [
    /Vanguard\s+Stocks\s*(?:&|and)\s*Shares\s*ISA/i,
    /Stocks\s*(?:&|and|\/)\s*Shares\s*ISA/i,
    /\bISA\b/i,
    /Individual\s+Savings\s+Account/i,
  ],
  gia: [
    /General\s+Investment\s+Account/i,
    /Personal\s+Portfolio/i,
    /\bGIA\b/i,
    /Stocks\s*\/\s*Shares(?!\s*ISA)/i,
    /Flexible\s+Account/i,
    /Bridge\s+Fund/i,
  ],
};

const CONTRIBUTION_PATTERN =
  /(?:monthly|per\s+(?:calendar\s+)?month|\/\s*mo\b|each\s+month|regular\s+(?:investment|saving|contribution)|recurring\s+(?:investment|contribution)|(?:contrib(?:ution)?|adding|add|put\s+in|pay(?:ment|ing)?))/i;
const MONEY_TOKEN =
  /(?:(?:£|GBP|€|EUR|\$|USD)\s*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?[kKmM]?)(?:\s*(?:GBP|£|EUR|€|USD|\$))?/gi;

function wrapperOnLine(line: string, key: WrapperKey): boolean {
  return WRAPPER_PATTERNS[key].some((pattern) => pattern.test(line));
}

function detectedWrapper(line: string): WrapperKey | null {
  for (const key of ["sipp", "isa", "gia"] as const) {
    if (wrapperOnLine(line, key)) return key;
  }
  return null;
}

function isAccountReferenceLine(line: string): boolean {
  return /\b(?:NPR|account\s*(?:number|no\.?|ref(?:erence)?)?|client\s*ref|policy\s*(?:number|no\.?)?)\s*[:#-]?\s*[A-Z]*\d/i.test(
    line,
  );
}

function monetaryAmounts(line: string, allowPlain = false): number[] {
  if (isAccountReferenceLine(line)) return [];

  const amounts: number[] = [];
  for (const match of line.matchAll(MONEY_TOKEN)) {
    const token = match[0];
    const rawAmount = match[1];
    const hasCurrency = /(?:£|GBP|€|EUR|\$|USD)/i.test(token);
    const looksLikeAmount = /[,.]|[km]$/i.test(rawAmount);
    if (!hasCurrency && !allowPlain && !looksLikeAmount) continue;
    const amount = detectCurrencyValue(rawAmount);
    if (amount !== null && amount > 0) amounts.push(amount);
  }
  return amounts;
}

function findContributionAmount(line: string): number | null {
  const marker = line.match(CONTRIBUTION_PATTERN);
  if (!marker || marker.index === undefined) return null;

  const afterMarker = monetaryAmounts(line.slice(marker.index), true)[0];
  if (afterMarker !== undefined) return afterMarker;
  const beforeMarker = monetaryAmounts(line.slice(0, marker.index), true);
  return beforeMarker.at(-1) ?? null;
}

function isStandaloneAmountLine(line: string): boolean {
  return /^(?:(?:£|GBP|€|EUR|\$|USD)\s*)?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?[kKmM]?(?:\s*(?:GBP|£|EUR|€|USD|\$))?$/i.test(
    line.trim(),
  );
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
    sippMonthlyContribution: null,
    isa: null,
    isaMonthlyContribution: null,
    gia: null,
    giaMonthlyContribution: null,
    emergencyFund: null,
    monthlyContribution: null,
  };

  const findBalanceInWindow = (lineIndex: number, key: WrapperKey): number | null => {
    for (let index = lineIndex; index < Math.min(lines.length, lineIndex + 5); index++) {
      const line = lines[index];
      const otherWrapper = detectedWrapper(line);
      if (index > lineIndex && otherWrapper !== null && otherWrapper !== key) break;

      const contributionMatch = line.match(CONTRIBUTION_PATTERN);
      const beforeContribution = contributionMatch?.index
        ? monetaryAmounts(line.slice(0, contributionMatch.index), true)[0]
        : undefined;
      if (beforeContribution !== undefined) return beforeContribution;
      if (contributionMatch && !/\b(?:balance|value|valuation|worth|total)\b/i.test(line)) continue;

      const amounts = monetaryAmounts(line, index === lineIndex || isStandaloneAmountLine(line));
      if (amounts[0] !== undefined) return amounts[0];
    }
    return null;
  };

  const findContributionInWindow = (lineIndex: number, key: WrapperKey): number | null => {
    for (let index = lineIndex; index < Math.min(lines.length, lineIndex + 3); index++) {
      const line = lines[index];
      const otherWrapper = detectedWrapper(line);
      if (index > lineIndex && otherWrapper !== null && otherWrapper !== key) break;
      const contribution = findContributionAmount(line);
      if (contribution !== null) return contribution;
    }
    return null;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    for (const key of ["sipp", "isa", "gia"] as const) {
      if (!wrapperOnLine(line, key)) continue;

      const balanceKey = key;
      const contributionKey = `${key}MonthlyContribution` as const;
      if (result[balanceKey] === null) {
        result[balanceKey] = findBalanceInWindow(index, key);
      }
      if (result[contributionKey] === null) {
        result[contributionKey] = findContributionInWindow(index, key);
      }
    }
  }

  // Emergency Fund / Cash Buffer heuristics
  const efMatch = normalized.match(/(?:Emergency\s+Fund|Cash\s+Buffer|Cash\s+Reserve)[^\n\r]*?((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP)/i);
  if (efMatch) result.emergencyFund = detectCurrencyValue(efMatch[1]);

  // Legacy aggregate contribution, only when it was not associated with a wrapper.
  for (const line of lines) {
    if (detectedWrapper(line) !== null) continue;
    const contribution = findContributionAmount(line);
    if (contribution !== null) {
      result.monthlyContribution = contribution;
      break;
    }
  }

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

export function parseTextPlanFallback(text: string): Partial<ExtractedPlan> {
  const res = parsePlanFromText(text);
  const normalized = normalizeTextStream(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const safeLines = lines.filter(
    (line) => !/\b(?:system|override|ignore|instruction|prompt|delete|rules?)\b/i.test(line),
  );

  let currentAge: number | undefined;
  let retirementAge: number | undefined;
  let targetAnnualIncome: number | undefined;
  let homeValue: number | undefined;
  let rentalValue: number | undefined;
  let rentalMonthlyIncome: number | undefined;

  const safeText = safeLines.join("\n");
  const ageMatch = safeText.match(/(?:current age|i am|\bage)\D{0,12}(\d{2})\b/i);
  if (ageMatch) currentAge = parseInt(ageMatch[1], 10);

  const retMatch = safeText.match(/(?:retire|retirement age|retire at)\D{0,12}(\d{2})\b/i);
  if (retMatch) retirementAge = parseInt(retMatch[1], 10);

  for (const line of safeLines) {
    if (!/(?:target|need|want|desired|income|spend)/i.test(line)) continue;
    const annualMatch = line.match(/(?:£|GBP)?\s*(\d[\d,.]*[kKmM]?)\s*(?:\/\s*(?:yr|year)|per\s+year|a\s+year|annual(?:ly)?|in\s+retirement)/i);
    if (!annualMatch) continue;
    const value = parseGbpAmount(annualMatch[1]);
    if (value !== null && value > 0) {
      targetAnnualIncome = value;
      break;
    }
  }

  for (const line of safeLines) {
    if (homeValue === undefined && /\b(?:home|main residence|primary residence|house)\b/i.test(line)) {
      homeValue = monetaryAmounts(line, true)[0];
    }
    if (rentalValue === undefined && /\b(?:rental(?: property)?|buy[- ]to[- ]let)\b/i.test(line)) {
      rentalValue = monetaryAmounts(line, true)[0];
    }
    if (rentalMonthlyIncome === undefined && /\b(?:rent|rental income)\b/i.test(line)) {
      rentalMonthlyIncome = findContributionAmount(line) ?? monetaryAmounts(line, true).at(-1);
    }
  }

  return {
    currentAge,
    retirementAge,
    targetAnnualIncome,
    sippBalance: res.wrappers.sipp ?? undefined,
    sippMonthlyContribution: res.wrappers.sippMonthlyContribution ?? undefined,
    isaBalance: res.wrappers.isa ?? undefined,
    isaMonthlyContribution: res.wrappers.isaMonthlyContribution ?? undefined,
    giaBalance: res.wrappers.gia ?? undefined,
    giaMonthlyContribution: res.wrappers.giaMonthlyContribution ?? undefined,
    homeValue,
    rentalValue,
    rentalMonthlyIncome,
  };
}
