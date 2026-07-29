export interface ExtractedPlan {
  isaBalance?: number;
  isaMonthlyContribution?: number;
  sippBalance?: number;
  sippMonthlyContribution?: number;
  giaBalance?: number;
  giaMonthlyContribution?: number;
  homeValue?: number;
  rentalValue?: number;
  rentalMonthlyIncome?: number;
}

function parseAmount(str: string): number | undefined {
  if (!str) return undefined;
  const cleaned = str.trim().toLowerCase().replace(/[,£$]/g, "");
  if (!cleaned) return undefined;
  
  let multiplier = 1;
  let numStr = cleaned;
  
  if (cleaned.endsWith("k")) {
    multiplier = 1_000;
    numStr = cleaned.slice(0, -1);
  } else if (cleaned.endsWith("m")) {
    multiplier = 1_000_000;
    numStr = cleaned.slice(0, -1);
  }
  
  const num = parseFloat(numStr);
  if (isNaN(num)) return undefined;
  return num * multiplier;
}

/**
 * Deterministic text parser for financial plan imports. Used as a fallback when AI
 * services are offline, unconfigured, or rate-limited. Extracts ISA, SIPP, GIA balances
 * and contributions directly using pattern matching.
 */
export function parseTextPlanFallback(text: string): ExtractedPlan {
  const plan: ExtractedPlan = {};
  const cleaned = text.toLowerCase();

  // ISA balance (e.g. "isa with 35k", "isa balance £50,000", "35k in my isa")
  const isaMatch =
    cleaned.match(/\bisa\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)[^\d]*?\bisa\b/i);
  if (isaMatch) {
    const val = parseAmount(isaMatch[1] || isaMatch[2]);
    if (val !== undefined && val > 0) plan.isaBalance = val;
  }

  // SIPP / Pension balance (e.g. "sipp with 150000", "pension £150k")
  const sippMatch =
    cleaned.match(/\b(sipp|pension|401k|ira)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)[^\d]*?\b(sipp|pension|401k|ira)\b/i);
  if (sippMatch) {
    const val = parseAmount(sippMatch[2] || sippMatch[1]);
    if (val !== undefined && val > 0) plan.sippBalance = val;
  }

  // GIA / Taxable balance
  const giaMatch =
    cleaned.match(/\b(gia|taxable|brokerage|general investment account)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)[^\d]*?\b(gia|taxable|brokerage)\b/i);
  if (giaMatch) {
    const val = parseAmount(giaMatch[2] || giaMatch[1]);
    if (val !== undefined && val > 0) plan.giaBalance = val;
  }

  // ISA monthly contribution
  const isaContrib =
    cleaned.match(/isa[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)[^\d]*?isa/i);
  if (isaContrib) {
    const val = parseAmount(isaContrib[1]);
    if (val !== undefined && val > 0) plan.isaMonthlyContribution = val;
  }

  // SIPP monthly contribution
  const sippContrib =
    cleaned.match(/(?:sipp|pension)[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)[^\d]*?(?:sipp|pension)/i);
  if (sippContrib) {
    const val = parseAmount(sippContrib[1]);
    if (val !== undefined && val > 0) plan.sippMonthlyContribution = val;
  }

  // Home value
  const homeMatch = cleaned.match(/\b(home|house|property value)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i);
  if (homeMatch) {
    const val = parseAmount(homeMatch[2]);
    if (val !== undefined && val > 0) plan.homeValue = val;
  }

  return plan;
}
