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
 * - Normalises font-substituted decimals (e.g. "47,128o95" -> "47,128.95").
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
  const cleanDecimals = raw
    .replace(/(\d+),(\d{3})\s*o\s*(\d{2})/g, "$1,$2.$3")
    .replace(/(\d+)\s*o\s*(\d{2}\b)/g, "$1.$2");
  return cleanDecimals
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
  const cleanVal = val.replace(/(\d+)\s*o\s*(\d{2})$/, "$1.$2");
  const compact = cleanVal
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
    /^NPR$/i,
    /\bNPR\b/i,
    /\bSIPP\b/i,
    /Self-Invested\s+Personal\s+Pension/i,
    /\bPension\b/i,
  ],
  isa: [
    /Vanguard\s+Stocks\s*(?:&|and|\/)\s*Shares\s*ISA/i,
    /Stocks\s*(?:&|and|\/)\s*Shares/i,
    /\bISA\b/i,
    /Individual\s+Savings\s+Account/i,
  ],
  gia: [
    /General\s+Investment\s+Account/i,
    /\bInvestment\s+Account\b/i,
    /Fund\s+(?:and|&)\s+Share\s+Account/i,
    /Dealing\s+Account/i,
    /Personal\s+Portfolio/i,
    /Non-ISA\s+Savings/i,
    /Non-ISA\s+Since\s+2025/i,
    /\bNon-ISA\b/i,
    /\bGIA\b/i,
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
  // NPR as a standalone header is a SIPP wrapper, not an account number line like NPR12345
  if (/^NPR$/i.test(line.trim())) return false;
  return (
    /\b(?:account\s*(?:number|no\.?|ref(?:erence)?)?|client\s*ref|policy\s*(?:number|no\.?)?|po\s*box|bxc|edinburgh|eh3|phone|tel)\s*[:#-]?\s*[A-Z]*\d/i.test(
      line,
    ) || /\b(?:PO\s*Box|Bxc|VG\d+)\b/i.test(line)
  );
}

function sanitizeLineForAmounts(line: string): string {
  return line
    .replace(/\b(?:Account|Client|Policy)\s*(?:Number|No\.?|Ref(?:erence)?)?\s*[:#-]?\s*[A-Z0-9_-]+/gi, "")
    .replace(/\b(?:NPR|VG|Bxc)\d+\b/gi, "")
    .replace(/\bPO\s*Box\s*\d+\b/gi, "");
}

function monetaryAmounts(line: string, allowPlain = false): number[] {
  const sanitizedLine = sanitizeLineForAmounts(line);
  if (isAccountReferenceLine(sanitizedLine)) return [];

  const amounts: number[] = [];
  for (const match of sanitizedLine.matchAll(MONEY_TOKEN)) {
    const token = match[0];
    const rawAmount = match[1];
    const matchIdx = match.index ?? 0;

    // Ignore alphanumeric code tokens like V3mFF or code numbers like 24095910
    const charBefore = sanitizedLine[matchIdx - 1] || "";
    const charAfter = sanitizedLine[matchIdx + token.length] || "";
    if (/[a-zA-Z]/.test(charBefore) || /[a-zA-Z]/.test(charAfter)) continue;

    // Ignore alphanumeric code matches like V3mFF
    if (/[a-zA-Z]/.test(rawAmount) && !/[kKmM]$/.test(rawAmount)) continue;

    const hasCurrency = /(?:£|GBP|€|EUR|\$|USD)/i.test(token);
    const looksLikeAmount = /[,.]|[km]$/i.test(rawAmount);
    if (!hasCurrency && !allowPlain && !looksLikeAmount) continue;
    const amount = detectCurrencyValue(rawAmount);
    if (amount !== null && amount > 0 && amount <= 10_000_000) amounts.push(amount);
  }
  return amounts;
}

function findContributionAmount(line: string): number | null {
  if (!CONTRIBUTION_PATTERN.test(line)) return null;
  const amounts = monetaryAmounts(line, true);
  if (amounts.length === 0) return null;

  if (/\bper\s+year\b|\bannual(?:ly)?\b|\/\s*yr\b/i.test(line)) {
    return Math.round((amounts[0] / 12) * 100) / 100;
  }
  return amounts[amounts.length - 1];
}

function isStandaloneAmountLine(line: string): boolean {
  return /^\s*(?:(?:£|GBP|€|EUR|\$|USD)\s*)?[\d,.]+[kKmM]?(?:\s*(?:GBP|£|EUR|€|USD|\$))?\s*$/i.test(
    line,
  );
}

/**
 * Robust extraction for PDF/CSV statements.
 * Vanguard UK 10-page Portfolio Valuation PDFs layout tables as:
 *   "Portfolio Value by Product Wrapper"
 *   "Vanguard Personal Pension"
 *   "NPR"
 *   "£337,856.14"
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

  // Handle single-line multi-wrapper text pastes (e.g. "£45k ISA adding £750/mo, £180k SIPP adding £1200/mo")
  if (lines.length <= 3) {
    const fullText = lines.join(" ");
    const matches: Array<{ key: WrapperKey; index: number }> = [];
    for (const key of ["sipp", "isa", "gia"] as const) {
      for (const pattern of WRAPPER_PATTERNS[key]) {
        const m = fullText.match(pattern);
        if (m && m.index !== undefined) {
          matches.push({ key, index: m.index });
          break;
        }
      }
    }
    if (matches.length >= 2) {
      matches.sort((a, b) => a.index - b.index);
      for (let i = 0; i < matches.length; i++) {
        const curr = matches[i];
        const prevIndex = i > 0 ? matches[i - 1].index : 0;
        const nextIndex = i < matches.length - 1 ? matches[i + 1].index : fullText.length;

        const segmentBefore = fullText.slice(prevIndex, curr.index);
        const segmentAfter = fullText.slice(curr.index, nextIndex);
        const segment = fullText.slice(prevIndex, nextIndex);

        const contrib = findContributionAmount(segmentAfter) || findContributionAmount(segment);
        const amountsBefore = monetaryAmounts(segmentBefore, true);
        const amountsAfter = monetaryAmounts(segmentAfter, true);
        const allAmounts = [...amountsBefore, ...amountsAfter];
        const nonContrib = contrib !== null ? allAmounts.filter((a) => a !== contrib && a !== contrib * 12) : allAmounts;

        if (nonContrib.length > 0) {
          if (curr.key === "sipp" && !result.sipp) result.sipp = nonContrib[0];
          if (curr.key === "isa" && !result.isa) result.isa = nonContrib[0];
          if (curr.key === "gia" && !result.gia) result.gia = nonContrib[0];
        }
        if (contrib !== null) {
          if (curr.key === "sipp" && !result.sippMonthlyContribution) result.sippMonthlyContribution = contrib;
          if (curr.key === "isa" && !result.isaMonthlyContribution) result.isaMonthlyContribution = contrib;
          if (curr.key === "gia" && !result.giaMonthlyContribution) result.giaMonthlyContribution = contrib;
        }
      }
    }
  }

  const findBalanceInWindow = (lineIndex: number, key: WrapperKey): number | null => {
    // 1. First check if there is an explicit "Total £..." section total line in this section table (up to 45 lines ahead)
    for (let index = lineIndex; index < Math.min(lines.length, lineIndex + 45); index++) {
      const line = lines[index];
      if (/\bTotal\s+Portfolio\b/i.test(line)) continue;
      const otherWrapper = detectedWrapper(line);
      if (index > lineIndex && otherWrapper !== null && otherWrapper !== key) break;

      if (/\bTotal\b/i.test(line)) {
        const explicitCurrency = line.match(/(?:£|GBP|€|EUR|\$|USD)\s*([\d,.]+[kKmM]?)/i);
        if (explicitCurrency) {
          const val = detectCurrencyValue(explicitCurrency[1]);
          if (val !== null && val > 100) return val;
        }
        const amounts = monetaryAmounts(line, true);
        const filtered = amounts.filter((a) => a > 100);
        if (filtered[0] !== undefined) return filtered[0];
        if (amounts[0] !== undefined) return amounts[0];
      }
    }

    // 2. Standard window check (5 lines)
    for (let index = lineIndex; index < Math.min(lines.length, lineIndex + 5); index++) {
      const line = lines[index];
      if (/\bTotal\s+Portfolio\b/i.test(line)) continue;
      const otherWrapper = detectedWrapper(line);
      if (index > lineIndex && otherWrapper !== null && otherWrapper !== key) break;

      const contributionMatch = line.match(CONTRIBUTION_PATTERN);
      const beforeContribution = contributionMatch?.index
        ? monetaryAmounts(line.slice(0, contributionMatch.index), true)[0]
        : undefined;
      if (beforeContribution !== undefined) return beforeContribution;

      const explicitCurrency = line.match(/(?:£|GBP|€|EUR|\$|USD)\s*([\d,.]+[kKmM]?)/i);
      if (explicitCurrency) {
        const val = detectCurrencyValue(explicitCurrency[1]);
        if (val !== null && val > 100) return val;
      }

      const amounts = monetaryAmounts(line, index === lineIndex || isStandaloneAmountLine(line));
      const filtered = amounts.filter((a) => a > 100);
      if (filtered[0] !== undefined) return filtered[0];
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
  const efMatch = normalized.match(/(?:Emergency\s+Fund|Cash\s+Buffer|Cash\s+Reserve)[^\n\r]{0,150}?((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP)/i);
  if (efMatch) result.emergencyFund = detectCurrencyValue(efMatch[1]);

  const hasSuspiciouslyLowBalances = [result.sipp, result.isa, result.gia].some(v => v === null || v <= 100);
  if (hasSuspiciouslyLowBalances) {
    let totalPortfolio: number | null = null;
    for (const line of lines) {
      if (/\b(?:Total\s+Portfolio|Total\s+Value|Total\s+Valuation)\b/i.test(line)) {
        const amt = monetaryAmounts(line, true)[0];
        if (amt !== undefined && amt > 100) totalPortfolio = amt;
      }
    }

    if (totalPortfolio !== null && totalPortfolio > 0) {
      const wrapperPcts: Record<WrapperKey, number> = { sipp: 0, isa: 0, gia: 0 };
      for (const line of lines) {
        const pctMatch = line.match(/(?:^|\s)([\d.]+)\s*%/);
        const wrapper = detectedWrapper(line);
        if (pctMatch && wrapper) {
          const pct = parseFloat(pctMatch[1]);
          if (!isNaN(pct) && pct > 0 && pct <= 100) {
            wrapperPcts[wrapper] += pct;
          }
        }
      }

      for (const key of ["sipp", "isa", "gia"] as const) {
        if ((result[key] === null || result[key]! <= 100) && wrapperPcts[key] > 0) {
          result[key] = Math.round((totalPortfolio * wrapperPcts[key]) / 100 * 100) / 100;
        }
      }
    }
  }

  // Unallocated / Ambiguous portfolio total fallback:
  // If no wrapper balance was identified (sipp, isa, gia all 0/null), but an explicit portfolio valuation header exists:
  if (result.sipp === null && result.isa === null && result.gia === null) {
    let unallocatedTotal: number | null = null;
    for (const line of lines) {
      if (/\b(?:Total\s+Portfolio|Total\s+Valuation|Portfolio\s+Value|Total\s+Value|Net\s+Asset\s+Value|Account\s+Balance|Account\s+Valuation|Total\s+Investments)\b/i.test(line)) {
        const amt = monetaryAmounts(line, true)[0];
        if (amt !== undefined && amt > 100) {
          unallocatedTotal = amt;
          break;
        }
      }
    }

    if (unallocatedTotal !== null && unallocatedTotal > 0) {
      if (unallocatedTotal <= 100000) {
        result.isa = unallocatedTotal;
      } else {
        result.gia = unallocatedTotal;
      }
    }
  }

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
 * Scans text for user inputs like:
 * "I'm 38, want to retire at 55 on £45k/yr. SIPP balance is £120k adding £1000/mo..."
 */
export function parsePlanFromText(text: string): PlanImportFallbackResult {
  const normalized = normalizeTextStream(text);
  const plan: Partial<ExtractedPlan> = {};
  const extractedTextLength = normalized.length;

  // 1. Ages & Income heuristics
  const ageMatch = normalized.match(/(?:i['’]m|i\s+am|current\s+age|age)[:\s]*(\d{2})/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 18 && age <= 80) plan.currentAge = age;
  }

  const retAgeMatch = normalized.match(/(?:retire\s+at|retirement\s+age|retire)[:\s]*(\d{2})/i);
  if (retAgeMatch) {
    const age = parseInt(retAgeMatch[1], 10);
    if (age >= 40 && age <= 75) plan.retirementAge = age;
  }

  const incomeMatch = normalized.match(
    /(?:target|income|spend|live\s+on|need)[^\n\r\d]{0,100}?((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*(?:GBP|£|k|m)?)/i,
  );
  if (incomeMatch) {
    const inc = detectCurrencyValue(incomeMatch[1]);
    if (inc && inc >= 10000 && inc <= 300000) plan.targetAnnualIncome = inc;
  }

  // 2. Property & Rental heuristics
  const homeMatch = normalized.match(/(?:home|house|property)\s+(?:value|worth|val)[:\s]*((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP|[\d,.]+[kKmM]?)/i);
  if (homeMatch) plan.homeValue = detectCurrencyValue(homeMatch[1]) ?? undefined;

  const rentalValMatch = normalized.match(/(?:rental|buy\s+to\s+let)\s+(?:property|value|worth|val)[:\s]*((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP|[\d,.]+[kKmM]?)/i);
  if (rentalValMatch) plan.rentalValue = detectCurrencyValue(rentalValMatch[1]) ?? undefined;

  const rentalIncMatch = normalized.match(/(?:rental\s+income|\brent\b)[^\n\r\d]{0,100}?((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*(?:GBP|£|k|m)?)/i);
  if (rentalIncMatch) plan.rentalMonthlyIncome = detectCurrencyValue(rentalIncMatch[1]) ?? undefined;

  const sideIncMatch = normalized.match(/(?:side|part\s*time|consulting)\s+income[:\s]*((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP|[\d,.]+[kKmM]?)/i);
  if (sideIncMatch) plan.partTimeAnnualIncome = detectCurrencyValue(sideIncMatch[1]) ?? undefined;

  // 3. Account Wrappers
  const wrappers = extractWrapperBalances(text);
  if (wrappers.isa) plan.isaBalance = wrappers.isa;
  if (wrappers.isaMonthlyContribution) plan.isaMonthlyContribution = wrappers.isaMonthlyContribution;
  if (wrappers.sipp) plan.sippBalance = wrappers.sipp;
  if (wrappers.sippMonthlyContribution) plan.sippMonthlyContribution = wrappers.sippMonthlyContribution;
  if (wrappers.gia) plan.giaBalance = wrappers.gia;
  if (wrappers.giaMonthlyContribution) plan.giaMonthlyContribution = wrappers.giaMonthlyContribution;

  // 4. Holdings Extraction (Regex scanning for fund codes like VWRL, VUAG, VUSA or ISINs)
  const holdings: FallbackHolding[] = [];
  const fundRegex = /\b([A-Z]{3,5})\b[^\n\r]{0,150}?(\d{1,3}(?:\.\d+)?\s*%)/gi;
  for (const match of normalized.matchAll(fundRegex)) {
    const ticker = match[1].toUpperCase();
    const weightStr = match[2];
    const weight = parseFloat(weightStr);

    if (["VWRL", "VUAG", "VUSA", "VAGS", "VERX", "V3AM", "INRG"].includes(ticker)) {
      holdings.push({
        label: `${ticker} ETF`,
        assetClass: ticker === "VAGS" ? "global-bonds" : "global-equity",
        ocf: 0.22,
        weight: weight / 100,
      });
    }
  }

  // 5. Confidence scoring
  let score = 0;
  const wrapperCount = (plan.isaBalance ? 1 : 0) + (plan.sippBalance ? 1 : 0) + (plan.giaBalance ? 1 : 0);
  if (wrapperCount >= 3) score += 0.7;
  else if (wrapperCount === 2) score += 0.5;
  else if (wrapperCount === 1) score += 0.4;

  if (wrappers.emergencyFund || wrappers.monthlyContribution) score += 0.2;
  if (plan.currentAge || plan.retirementAge) score += 0.2;
  if (plan.targetAnnualIncome) score += 0.2;
  if (holdings.length > 0) score += 0.2;

  let confidence: "high" | "medium" | "low" | "none" = "none";
  if (score >= 0.7) confidence = "high";
  else if (score >= 0.4) confidence = "medium";
  else if (score >= 0.1) confidence = "low";

  return {
    wrappers,
    holdings,
    confidence,
    confidenceScore: Math.min(1.0, Math.max(0, score)),
    extractedTextLength,
  };
}

export function parseTextPlanFallback(text: string): Partial<ExtractedPlan> {
  const result = parsePlanFromText(text);
  const plan: Partial<ExtractedPlan> = {};
  if (result.wrappers.isa) plan.isaBalance = result.wrappers.isa;
  if (result.wrappers.isaMonthlyContribution) plan.isaMonthlyContribution = result.wrappers.isaMonthlyContribution;
  if (result.wrappers.sipp) plan.sippBalance = result.wrappers.sipp;
  if (result.wrappers.sippMonthlyContribution) plan.sippMonthlyContribution = result.wrappers.sippMonthlyContribution;
  if (result.wrappers.gia) plan.giaBalance = result.wrappers.gia;
  if (result.wrappers.giaMonthlyContribution) plan.giaMonthlyContribution = result.wrappers.giaMonthlyContribution;

  const parsedText = normalizeTextStream(text);
  const ageMatch = parsedText.match(/(?:i['’]m|i\s+am|current\s+age|age)[:\s]*(\d{2})/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 18 && age <= 80) plan.currentAge = age;
  }

  const retAgeMatch = parsedText.match(/(?:retire\s+at|retirement\s+age|retire)[:\s]*(\d{2})/i);
  if (retAgeMatch) {
    const age = parseInt(retAgeMatch[1], 10);
    if (age >= 40 && age <= 75) plan.retirementAge = age;
  }

  const incomeMatch = parsedText.match(
    /(?:target|income|spend|live\s+on|need)[^\n\r\d]{0,100}?((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*(?:GBP|£|k|m)?)/i,
  );
  if (incomeMatch) {
    const inc = detectCurrencyValue(incomeMatch[1]);
    if (inc && inc >= 10000 && inc <= 300000) plan.targetAnnualIncome = inc;
  }

  const homeMatch = parsedText.match(/(?:home|house|property)\s+(?:value|worth|val)[:\s]*((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP|[\d,.]+[kKmM]?)/i);
  if (homeMatch) plan.homeValue = detectCurrencyValue(homeMatch[1]) ?? undefined;

  const rentalValMatch = parsedText.match(/(?:rental|buy\s+to\s+let)\s+(?:property|value|worth|val)[:\s]*((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP|[\d,.]+[kKmM]?)/i);
  if (rentalValMatch) plan.rentalValue = detectCurrencyValue(rentalValMatch[1]) ?? undefined;

  const rentalIncMatch = parsedText.match(/(?:rental\s+income|\brent\b)[^\n\r\d]{0,100}?((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*(?:GBP|£|k|m)?)/i);
  if (rentalIncMatch) plan.rentalMonthlyIncome = detectCurrencyValue(rentalIncMatch[1]) ?? undefined;

  const sideIncMatch = parsedText.match(/(?:side|part\s*time|consulting)\s+income[:\s]*((?:£|GBP)\s*[\d,.]+[kKmM]?|[\d,.]+[kKmM]?\s*GBP|[\d,.]+[kKmM]?)/i);
  if (sideIncMatch) plan.partTimeAnnualIncome = detectCurrencyValue(sideIncMatch[1]) ?? undefined;

  return plan;
}

export function parseTextHoldingsFallback(text: string): FallbackHolding[] {
  return parsePlanFromText(text).holdings;
}
