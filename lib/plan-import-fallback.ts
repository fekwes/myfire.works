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
 * Comprehensive deterministic text parser for financial plan imports.
 * Extracts ages, target income, wrapper balances, contributions, property, and rental details.
 */
export function parseTextPlanFallback(text: string): ExtractedPlan {
  const plan: ExtractedPlan = {};
  const cleaned = text.toLowerCase();

  // Current Age (e.g. "i am 35", "age 35", "35 years old", "35 yo", "current age: 40")
  const currentAgeMatch =
    cleaned.match(/\b(?:i am|age|current age|i'm)\s*?:?\s*?(\d{2})\b/i) ||
    cleaned.match(/\b(\d{2})\s*?(?:years old|yo|y\/o|yrs old)\b/i);
  if (currentAgeMatch) {
    const age = parseInt(currentAgeMatch[1], 10);
    if (age >= 18 && age <= 80) plan.currentAge = age;
  }

  // Target Retirement Age (e.g. "retire at 55", "fire age 50", "retirement age 55", "retire in 20 years")
  const retireAgeMatch =
    cleaned.match(/\b(?:retire at|retire age|retirement age|fire age|fire at)\s*?:?\s*?(\d{2})\b/i) ||
    cleaned.match(/\b(?:retire in)\s*?(\d{1,2})\s*?(?:years|yrs)\b/i);
  if (retireAgeMatch) {
    const matchedVal = parseInt(retireAgeMatch[1], 10);
    if (cleaned.includes("retire in") && plan.currentAge) {
      plan.retirementAge = plan.currentAge + matchedVal;
    } else if (matchedVal >= 30 && matchedVal <= 75) {
      plan.retirementAge = matchedVal;
    }
  }

  // Target Annual Income (e.g. "need 30k a year", "target 35000/yr", "spending 2.5k a month", "target income 40k")
  const incomeAnnualMatch =
    cleaned.match(/(?:target|need|spending|live on|income|annual income)[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:a year|\/yr|per year|annually|a yr)/i) ||
    cleaned.match(/(?:target income|target spending|annual target)[^\d]*?([£$]?\d[\d,\.]*k?m?)/i);
  if (incomeAnnualMatch) {
    const val = parseAmount(incomeAnnualMatch[1]);
    if (val !== undefined && val > 0) plan.targetAnnualIncome = val;
  } else {
    // Check monthly income target (e.g. "spend 2.5k a month")
    const incomeMonthlyMatch = cleaned.match(/(?:target|need|spending|live on)[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:a month|\/mo|per month|monthly)/i);
    if (incomeMonthlyMatch) {
      const val = parseAmount(incomeMonthlyMatch[1]);
      if (val !== undefined && val > 0) plan.targetAnnualIncome = val * 12;
    }
  }

  // SIPP / Pension Balance & Monthly Contribution (Vanguard Personal Pension, NPR, Workplace Pension)
  const sippMatch =
    cleaned.match(/\b(?:vanguard personal pension|personal pension|sipp|workplace pension|npr|401k|ira)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)[^\d]*?\b(?:vanguard personal pension|personal pension|sipp|401k|ira)\b/i);
  if (sippMatch) {
    const val = parseAmount(sippMatch[1] || sippMatch[2]);
    if (val !== undefined && val > 0) plan.sippBalance = val;
  }

  const sippContrib =
    cleaned.match(/(?:sipp|pension)[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)[^\d]*?(?:sipp|pension)/i);
  if (sippContrib) {
    const val = parseAmount(sippContrib[1]);
    if (val !== undefined && val > 0) plan.sippMonthlyContribution = val;
  }

  // ISA Balance & Monthly Contribution
  const isaMatch =
    cleaned.match(/\b(?:stocks\/shares|stocks and shares isa|s&s isa|\bisa\b)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)[^\d]*?\b(?:stocks\/shares|\bisa\b)\b/i);
  if (isaMatch) {
    const val = parseAmount(isaMatch[1] || isaMatch[2]);
    if (val !== undefined && val > 0) plan.isaBalance = val;
  }

  const isaContrib =
    cleaned.match(/isa[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)[^\d]*?isa/i);
  if (isaContrib) {
    const val = parseAmount(isaContrib[1]);
    if (val !== undefined && val > 0) plan.isaMonthlyContribution = val;
  }

  // GIA / Taxable Brokerage Balance & Monthly Contribution (Non-ISA Savings, Personal Portfolio)
  const giaMatch =
    cleaned.match(/\b(?:non-isa|personal portfolio|gia|taxable|brokerage|general investment account|cuenta valores)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i) ||
    cleaned.match(/([£$]?\d[\d,\.]*k?m?)[^\d]*?\b(?:non-isa|personal portfolio|gia|taxable|brokerage)\b/i);
  if (giaMatch) {
    const val = parseAmount(giaMatch[1] || giaMatch[2]);
    if (val !== undefined && val > 0) plan.giaBalance = val;
  }

  const giaContrib =
    cleaned.match(/(?:gia|taxable|brokerage)[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)/i);
  if (giaContrib) {
    const val = parseAmount(giaContrib[1]);
    if (val !== undefined && val > 0) plan.giaMonthlyContribution = val;
  }

  // Real Estate: Home Property Value
  const homeMatch = cleaned.match(/\b(?:home|house|primary residence)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i);
  if (homeMatch) {
    const val = parseAmount(homeMatch[1]);
    if (val !== undefined && val > 0) plan.homeValue = val;
  }

  // Real Estate: Rental Property Value & Rental Monthly Income
  const rentalValMatch = cleaned.match(/\b(?:rental property|buy to let|btl|rental value)\b[^\d]*?([£$]?\d[\d,\.]*k?m?)/i);
  if (rentalValMatch) {
    const val = parseAmount(rentalValMatch[1]);
    if (val !== undefined && val > 0) plan.rentalValue = val;
  }

  const rentalIncomeMatch = cleaned.match(/(?:rent|rental income)[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)/i);
  if (rentalIncomeMatch) {
    const val = parseAmount(rentalIncomeMatch[1]);
    if (val !== undefined && val > 0) plan.rentalMonthlyIncome = val;
  }

  // Part-time / Side Hustle Income
  const sideHustleMatch = cleaned.match(/(?:side hustle|part time|freelance)[^\d]*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly)/i);
  if (sideHustleMatch) {
    const val = parseAmount(sideHustleMatch[1]);
    if (val !== undefined && val > 0) plan.partTimeAnnualIncome = val * 12;
  }

  // Pension Access Age
  const accessAgeMatch = cleaned.match(/(?:pension access|sipp access|access age)[^\d]*?(\d{2})\b/i);
  if (accessAgeMatch) {
    const age = parseInt(accessAgeMatch[1], 10);
    if (age >= 50 && age <= 68) plan.sippAccessAge = age;
  }

  // State Pension Age
  const statePensionMatch = cleaned.match(/(?:state pension age|state pension)[^\d]*?(\d{2})\b/i);
  if (statePensionMatch) {
    const age = parseInt(statePensionMatch[1], 10);
    if (age >= 60 && age <= 70) plan.statePensionAge = age;
  }

  return plan;
}
