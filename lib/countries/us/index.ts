import { CountryPack, Region, WrapperSpec, TaxBase } from "../types";
import { US_TAX_BANDS_2024, SS_BEND_POINTS_2024 } from "./constants";

export const usRegion: Region = {
  id: "us",
  label: "United States (Federal Only)",
};

const WRAPPERS: WrapperSpec[] = [
  {
    id: "401k",
    label: "401(k) / Traditional IRA",
    treatment: "tax-deferred",
    accessAge: 59.5,
    annualContributionLimit: 23000,
    withdrawalBucket: "pension-withdrawal",
    // RMDs begin at age 73 for those born 1951-1959, 75 for born 1960 or later.
    // Simplifying to starting at 73.
    forcedMinimumFraction: (age) => (age >= 73 ? 1 / (120 - age) : 0),
  },
  {
    id: "roth",
    label: "Roth IRA / Roth 401(k)",
    treatment: "tax-free",
    accessAge: 59.5,
    annualContributionLimit: 7000,
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
  regions: [usRegion],
  wrappers: WRAPPERS,
  disposalPolicy: "specific-id",
  drawdownCandidates: [
    "brokerage->401k->roth",
    "brokerage->roth->401k",
    "401k-to-standard-deduction->brokerage->roth",
  ],
  constraints: [], // e.g. IRMAA could go here
  statePension: (history, claimAge) => {
    // Highly simplified Social Security AIME/PIA calculator.
    // Assume the user has worked for 35 years at their current inflation-adjusted salary.
    // For a real implementation, we would need actual historical earnings.
    if (!history.yearsContributed || history.yearsContributed < 10) return 0;
    
    // Default to a median AIME if no salary is provided, or we can assume a simplified formula.
    // For now, we'll return a placeholder that calculates PIA based on a dummy AIME of 6000.
    const aime = 6000; 
    let pia = 0;
    if (aime <= SS_BEND_POINTS_2024.first) {
      pia = aime * SS_BEND_POINTS_2024.rates[0];
    } else if (aime <= SS_BEND_POINTS_2024.second) {
      pia = SS_BEND_POINTS_2024.first * SS_BEND_POINTS_2024.rates[0] + 
            (aime - SS_BEND_POINTS_2024.first) * SS_BEND_POINTS_2024.rates[1];
    } else {
      pia = SS_BEND_POINTS_2024.first * SS_BEND_POINTS_2024.rates[0] + 
            (SS_BEND_POINTS_2024.second - SS_BEND_POINTS_2024.first) * SS_BEND_POINTS_2024.rates[1] +
            (aime - SS_BEND_POINTS_2024.second) * SS_BEND_POINTS_2024.rates[2];
    }
    
    // Claiming at 62 reduces it, claiming at 70 increases it. (Simplification)
    const fra = 67;
    if (claimAge < fra) {
      pia *= 1 - ((fra - claimAge) * 0.0667); // roughly 6.67% reduction per year
    } else if (claimAge > fra) {
      pia *= 1 + ((Math.min(claimAge, 70) - fra) * 0.08); // 8% increase per year up to 70
    }
    
    return pia * 12; // Annualized
  },
  taxSystem: (region, filing = "single") => {
    const isJoint = filing === "married-joint";
    const bands = isJoint ? US_TAX_BANDS_2024.joint : US_TAX_BANDS_2024.single;

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
    };
  }
};
