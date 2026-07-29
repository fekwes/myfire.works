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

  // Helper to extract true currency figures near keywords while ignoring account/reference numbers
  function extractWrapperBalanceNearKeyword(rawText: string, keywords: string[]): number | undefined {
    const rawLines = rawText.split(/[\r\n]+/);
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].toLowerCase();
      // Skip non-isa lines when looking for ISA
      if (keywords.includes("isa") && line.includes("non-isa") && !keywords.includes("non-isa")) {
        continue;
      }

      if (keywords.some((kw) => line.includes(kw))) {
        // Priority 1: Check current line for exact balance (e.g. "SIPP: £337,856.00")
        const sameLineMatches = line.match(/(?:[£$]\s*)?\b\d[\d,]*(?:\.\d+)?[kKmM]?\b/g);
        if (sameLineMatches) {
          for (const m of sameLineMatches) {
            const isYearOrAccountNo = !m.includes("£") && !m.includes("$") && !m.includes(".") && (/^\d{7,10}$/.test(m.replace(/[,]/g, "")) || /^(?:19\d\d|20\d\d)$/.test(m));
            if (isYearOrAccountNo) continue;
            const val = parseAmount(m);
            if (val !== undefined && val >= 50 && val < 50_000_000) {
              return val;
            }
          }
        }

        // Priority 2: Section header line — scan section window (up to 8 lines) for section Total/Balance
        const sectionLines = rawLines.slice(i, i + 8);
        for (const secLine of sectionLines) {
          const lowerSec = secLine.toLowerCase().trim();
          if ((lowerSec.startsWith("total") || lowerSec.startsWith("balance") || lowerSec.includes("total £") || lowerSec.includes("balance £")) &&
              !lowerSec.includes("portfolio valuation") && !lowerSec.includes("portfolio total") && !lowerSec.includes("total portfolio")) {
            const matches = secLine.match(/(?:[£$]\s*)?\b\d[\d,]*(?:\.\d+)?[kKmM]?\b/g);
            if (matches) {
              for (const m of matches) {
                const val = parseAmount(m);
                if (val !== undefined && val >= 50 && val < 50_000_000) return val;
              }
            }
          }
        }

        // Priority 3: Fallback scan immediate next line
        const windowText = rawLines.slice(i, i + 2).join(" ");
        const moneyMatches = windowText.match(/(?:[£$]\s*)?\b\d[\d,]*(?:\.\d+)?[kKmM]?\b/g);
        if (moneyMatches) {
          for (const m of moneyMatches) {
            const isYearOrAccountNo = !m.includes("£") && !m.includes("$") && !m.includes(".") && (/^\d{7,10}$/.test(m.replace(/[,]/g, "")) || /^(?:19\d\d|20\d\d)$/.test(m));
            if (isYearOrAccountNo) continue;
            const val = parseAmount(m);
            if (val !== undefined && val >= 50 && val < 50_000_000) {
              return val;
            }
          }
        }
      }
    }
    return undefined;
  }

  // Extract lines for wrapper contribution matching
  const lines = cleaned.split(/[\r\n.]+/);

  // SIPP / Pension Balance & Monthly Contribution (Vanguard Personal Pension, NPR, Workplace Pension)
  plan.sippBalance = extractWrapperBalanceNearKeyword(cleaned, [
    "vanguard personal pension",
    "personal pension",
    "self-invested personal pension",
    "sipp",
    "workplace pension",
    "drawdown pension",
    "drawdown sipp",
    "stakeholder pension",
    "npr",
  ]);

  for (const line of lines) {
    if (/\b(?:sipp|pension|npr|wpp)\b/i.test(line)) {
      const idx = line.search(/\b(?:sipp|pension|npr|wpp)\b/i);
      const subLine = idx >= 0 ? line.slice(idx) : line;
      const match = subLine.match(/(?:contrib|put in|pay|add|deposit|monthly|\b)?\s*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly|\/month)/i);
      if (match) {
        const val = parseAmount(match[1]);
        if (val !== undefined && val > 0 && val < 50000) {
          plan.sippMonthlyContribution = val;
          break;
        }
      }
    }
  }

  // ISA Balance & Monthly Contribution
  plan.isaBalance = extractWrapperBalanceNearKeyword(cleaned, [
    "stocks/shares isa",
    "stocks and shares isa",
    "stocks & shares isa",
    "stocks/shares",
    "s&s isa",
    "lifetime isa",
    "cash isa",
    "junior isa",
    "lisa",
    "isa",
  ]);

  for (const line of lines) {
    if (/\b(?:isa|stocks\/shares|lisa|jisa)\b/i.test(line) && !line.includes("non-isa")) {
      const idx = line.search(/\b(?:isa|stocks\/shares|lisa|jisa)\b/i);
      const subLine = idx >= 0 ? line.slice(idx) : line;
      const match = subLine.match(/(?:contrib|put in|pay|add|deposit|monthly|\b)?\s*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly|\/month)/i);
      if (match) {
        const val = parseAmount(match[1]);
        if (val !== undefined && val > 0 && val < 50000) {
          plan.isaMonthlyContribution = val;
          break;
        }
      }
    }
  }

  // GIA / Taxable Brokerage Balance & Monthly Contribution (Non-ISA Savings, Personal Portfolio, Cash Accounts)
  plan.giaBalance = extractWrapperBalanceNearKeyword(cleaned, [
    "personal portfolio",
    "non-isa savings (cgt)",
    "non-isa since 2025",
    "non-isa savings",
    "non-isa",
    "general investment account",
    "fund & share account",
    "fund and share account",
    "dealing account",
    "trading account",
    "investment account",
    "taxable account",
    "taxable brokerage",
    "unwrapped account",
    "brokerage account",
    "cash savings pot",
    "cash savings",
    "current account",
    "gia",
    "taxable",
  ]);

  for (const line of lines) {
    if (/\b(?:gia|taxable|brokerage|personal portfolio|general investment account|fund & share account|fund and share account|dealing account|trading account|investment account)\b/i.test(line)) {
      const idx = line.search(/\b(?:gia|taxable|brokerage|personal portfolio|general investment account|fund & share account|fund and share account|dealing account|trading account|investment account)\b/i);
      const subLine = idx >= 0 ? line.slice(idx) : line;
      const match = subLine.match(/(?:contrib|put in|pay|add|deposit|monthly|\b)?\s*?([£$]?\d[\d,\.]*k?m?)\s*?(?:per month|\/mo|a month|monthly|\/month)/i);
      if (match) {
        const val = parseAmount(match[1]);
        if (val !== undefined && val > 0 && val < 50000) {
          plan.giaMonthlyContribution = val;
          break;
        }
      }
    }
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
