import { CountryPack, Region, WrapperSpec, TaxBase, Surtax } from "../types";
import { US_TAX_BANDS_2026, SS_BEND_POINTS_2026, US_STATE_TAXES, ACA_FPL_2025 } from "./constants";

const RMD_DIVISORS = [
  26.5, 25.5, 24.6, 23.7, 22.9, 22.0, 21.1, 20.2, 19.4, 18.5, // 73-82
  17.7, 16.8, 16.0, 15.2, 14.4, 13.7, 12.9, 12.2, 11.5, 10.8, // 83-92
  10.1, 9.5, 8.9 // 93-95
];

export const usRegions: Region[] = [
  { id: "zero-tax", label: "Zero Income Tax State (e.g. TX, FL, NV)" },
  { id: "ca", label: "California" },
  { id: "ny", label: "New York" },
];

const WRAPPERS: WrapperSpec[] = [
  {
    id: "401k",
    label: "401(k) / Traditional IRA",
    treatment: "tax-deferred",
    accessAge: 59.5,
    annualContributionLimit: 24500, // Updated 2026
    withdrawalBucket: "pension-withdrawal",
    forcedMinimumFraction: (age) => {
      if (age < 73) return 0;
      const index = Math.min(age - 73, RMD_DIVISORS.length - 1);
      return 1 / RMD_DIVISORS[index];
    },
  },
  {
    id: "roth",
    label: "Roth IRA / Roth 401(k)",
    treatment: "tax-free",
    accessAge: 59.5,
    annualContributionLimit: 7500, // Updated 2026
    withdrawalBucket: "other", // withdrawals are tax-free
  },
  {
    id: "brokerage",
    label: "Taxable Brokerage",
    treatment: "taxable",
    withdrawalBucket: "realised-gains",
  },
];

export const usPack: CountryPack = {
  id: "us",
  currency: { code: "USD", locale: "en-US", symbol: "$" },
  regions: usRegions,
  wrappers: WRAPPERS,
  labels: {
    statePension: "Social Security",
    taxFreeWrapper: "Roth IRA",
    taxDeferredWrapper: "401(k)",
    taxableWrapper: "Taxable Brokerage",
    hasPensionStrategyToggle: false,
    retirementAgeTooltip: "When you plan to stop working. Your Roth IRA / Brokerage bridges income until your 401(k) unlocks at 59½.",
    targetIncomeTooltip: "The take-home income you want to spend each year in retirement — after tax, in today's money. Your Social Security is already counted towards this.",
    partTimeTooltip: "Go part-time in early retirement to bridge the gap to Social Security.",
    rentalSaleTooltip: "Leave at 0 to keep it. Otherwise it's sold at this age (capital gains tax), proceeds go to your taxable brokerage, and the rent stops.",
    homeTooltip: "Counts as net worth and grows, but isn't drawn for income — unless you downsize, which releases tax-free cash (home sale exclusion up to $250k/$500k) into your brokerage.",
    savingsHelper: "A ballpark total across your 401(k), IRAs and other investments is fine. This is the one number that turns your result from a guess into a real verdict — but you can skip it.",
    savingsHint: "We'll add this to your Roth IRA to start — you can split it across your 401(k) in the planner.",
    baristaTagline: "Leave full-time work early and let part-time earnings bridge you to Social Security.",
    strategyWhy: "Your route changes the shape of the plan — when you stop adding money, and whether part-time work bridges you to Social Security.",
    checklistSavingsHint: "From your 401(k) provider, brokerage account or last statement — a rough figure is fine, you can refine it later.",
    lifestyleBenchmarkName: "US Bureau of Labor Statistics benchmarks",
  },
  lifestyleTiers: [
    {
      id: "minimum",
      label: "Basic",
      amount: 30000,
      blurb: "Covers essentials with a small buffer for extras.",
    },
    {
      id: "moderate",
      label: "Moderate",
      amount: 50000,
      blurb: "Comfortable living with room for travel and hobbies.",
    },
    {
      id: "comfortable",
      label: "Comfortable",
      amount: 80000,
      blurb: "Financial freedom and the lifestyle you want.",
    },
  ],
  quizDefaults: {
    customIncome: 60000,
    baristaAnnualIncome: 25000,
    defaultIsaMonthly: 600,
    defaultSippMonthly: 500,
    defaultStatePensionAnnual: 22900,
    defaultPensionAccessAge: 59.5,
    defaultStatePensionAge: 67,
  },
  disposalPolicy: "specific-id",
  drawdownCandidates: [
    "brokerage->401k->roth",
    "brokerage->roth->401k",
    "401k-to-standard-deduction->brokerage->roth",
  ],
  constraints: [], // Now implemented as Surtaxes for engine compatibility
  statePension: (history, claimAge) => {
    // 2026 exact Social Security PIA Formula
    // 1. Calculate AIME based on 35 years
    const yearsWorked = history.yearsContributed || 0;
    const assumedAnnualSalary = 60000; // Simplified assumption for the years worked
    
    // Total lifetime indexed earnings (simplified by assuming constant salary)
    const totalEarnings = assumedAnnualSalary * Math.min(yearsWorked, 35);
    
    // Divide by 420 months (35 years) to get AIME. 
    // Missing years count as $0 and directly reduce AIME.
    const aime = totalEarnings / 420;
    
    let pia = 0;
    const bp1 = SS_BEND_POINTS_2026.first;
    const bp2 = SS_BEND_POINTS_2026.second;
    const [r1, r2, r3] = SS_BEND_POINTS_2026.rates;

    if (aime <= bp1) {
      pia = aime * r1;
    } else if (aime <= bp2) {
      pia = (bp1 * r1) + ((aime - bp1) * r2);
    } else {
      pia = (bp1 * r1) + ((bp2 - bp1) * r2) + ((aime - bp2) * r3);
    }
    
    // Claiming age modifiers (simplified FRA = 67)
    const fra = 67;
    if (claimAge < fra) {
      pia *= 1 - ((fra - claimAge) * 0.0667); // roughly 6.67% reduction per year
    } else if (claimAge > fra) {
      pia *= 1 + ((Math.min(claimAge, 70) - fra) * 0.08); // 8% increase per year up to 70
    }
    
    return Math.floor(pia * 12); // Annualized and floored
  },
  taxSystem: (region, filing = "single") => {
    const isJoint = filing === "married-joint";
    const bands = isJoint ? US_TAX_BANDS_2026["married-joint"] : US_TAX_BANDS_2026.single;

    const ordinaryBase: TaxBase = {
      id: "ordinary",
      allowance: () => bands.standardDeduction,
      schedule: bands.brackets,
    };

    const ltcgBase: TaxBase = {
      id: "ltcg",
      stacksOn: "ordinary",
      schedule: bands.ltcg,
    };
    
    const surtaxes: Surtax[] = [];

    // 1. NIIT (Net Investment Income Tax)
    surtaxes.push({
      id: "niit",
      apply: (income: number, routing: Record<string, number>) => {
        const investmentIncome = (routing["dividends"] || 0) + (routing["interest"] || 0) + (routing["realised-gains"] || 0) + (routing["rental"] || 0);
        if (income > bands.niitThreshold && investmentIncome > 0) {
          const excess = income - bands.niitThreshold;
          return Math.min(investmentIncome, excess) * 0.038;
        }
        return 0;
      }
    });

    // 2. Early Withdrawal 10% Penalty (Pre-59.5)
    surtaxes.push({
      id: "early-withdrawal-penalty",
      apply: (income: number, routing: Record<string, number>, age: number) => {
        if (age < 59.5) {
          const pensionWithdrawal = routing["pension-withdrawal"] || 0;
          return pensionWithdrawal * 0.10;
        }
        return 0;
      }
    });

    // 3. ACA Premium Tax Credit Slope (Ages < 65)
    surtaxes.push({
      id: "aca-premiums",
      apply: (income: number, routing: Record<string, number>, age: number) => {
        if (age >= 65) return 0; // On Medicare
        const fpl = isJoint ? ACA_FPL_2025["married-joint"] : ACA_FPL_2025.single;
        const pctFpl = (income / fpl) * 100;
        
        let costPct = 0;
        if (pctFpl <= 150) costPct = 0;
        else if (pctFpl <= 200) costPct = 0.02; // simplified average of 0-2%
        else if (pctFpl <= 250) costPct = 0.04; // simplified average of 2-4%
        else if (pctFpl <= 300) costPct = 0.06;
        else if (pctFpl <= 400) costPct = 0.085;
        else costPct = 0.085; // 8.5% cap over 400% FPL

        // Assume benchmark silver plan costs $8,000/yr single, $16,000/yr joint
        const benchmarkCost = isJoint ? 16000 : 8000;
        const requiredContribution = income * costPct;
        return Math.min(requiredContribution, benchmarkCost); // Subsidy pays the rest
      }
    });

    // 4. Medicare IRMAA Surcharges (Ages 65+)
    surtaxes.push({
      id: "medicare-irmaa",
      apply: (income: number, routing: Record<string, number>, age: number) => {
        if (age < 65) return 0;
        // Simplified mapping using 2025 tiers based on MAGI
        // (In reality there's a 2 year lookback, we assume current income)
        const t1 = isJoint ? 212000 : 106000;
        const t2 = isJoint ? 266000 : 133000;
        const t3 = isJoint ? 334000 : 167000;
        const t4 = isJoint ? 400000 : 200000;
        const t5 = isJoint ? 750000 : 500000;

        let surcharge = 0;
        const annualBase = isJoint ? (2097 * 2) : 2097; // 2025 Base Part B is ~$174.70/mo

        if (income > t5) surcharge = annualBase * 2.4; // Tier 6 max
        else if (income > t4) surcharge = annualBase * 1.8; 
        else if (income > t3) surcharge = annualBase * 1.3;
        else if (income > t2) surcharge = annualBase * 0.8;
        else if (income > t1) surcharge = annualBase * 0.4;
        
        return surcharge;
      }
    });

    // 5. State Income Tax
    if (region && region.id !== "zero-tax") {
      const stateBrackets = US_STATE_TAXES[region.id as keyof typeof US_STATE_TAXES]?.brackets;
      if (stateBrackets) {
        surtaxes.push({
          id: `state-tax-${region.id}`,
          apply: (income: number) => {
            let tax = 0;
            let remaining = income;
            let prevUpTo = 0;
            for (const b of stateBrackets) {
              const width = b.upTo - prevUpTo;
              if (remaining > 0) {
                const portion = Math.min(remaining, width);
                tax += portion * b.rate;
                remaining -= portion;
              }
              prevUpTo = b.upTo;
            }
            return tax;
          }
        });
      }
    }

    return {
      bases: [ordinaryBase, ltcgBase],
      routing: {
        "employment": { base: "ordinary" },
        "pension-withdrawal": { base: "ordinary" },
        "rental": { base: "ordinary" },
        "interest": { base: "ordinary" },
        "dividends": { base: "ltcg" }, // Qualified dividends
        "realised-gains": { base: "ltcg" },
        "state-pension": { base: "ordinary", inclusion: 0.85 }, // Up to 85% is taxable
      },
      surtaxes
    };
  }
};
