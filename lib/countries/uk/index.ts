import { CountryPack, Region, TaxSystem } from "../types";
import { UK_INCOME_TAX_BANDS_2026_27, calculatePersonalAllowance } from "./constants";

export const ukRegion: Region = {
  id: "rest-of-uk",
  label: "Rest of UK (excl. Scotland)",
};

export const ukTaxSystem: TaxSystem = {
  bases: [
    {
      id: "income",
      schedule: [
        { upTo: UK_INCOME_TAX_BANDS_2026_27.taperThreshold, rate: 0 },
        { upTo: UK_INCOME_TAX_BANDS_2026_27.taperThreshold + UK_INCOME_TAX_BANDS_2026_27.basicRateBandWidth, rate: UK_INCOME_TAX_BANDS_2026_27.basicRate }, // This is not strictly correct because personal allowance tapers. 
        // UK income tax is complex due to taper. The architecture doc says:
        // "a `cgt` base that `stacksOn: "income"` to choose 18% vs 24%."
      ]
    }
  ],
  routing: {
    "employment": { base: "income" },
    "pension-withdrawal": { base: "income" },
    "rental": { base: "income" },
    "state-pension": { base: "income" },
    "realised-gains": { base: "cgt" }
  }
}

export const ukPack: CountryPack = {
  id: "uk",
  currency: { code: "GBP", locale: "en-GB" },
  regions: [ukRegion],
  wrappers: [
    {
      id: "isa",
      label: "ISA",
      treatment: "tax-free",
      annualContributionLimit: 20000,
      withdrawalBucket: "other"
    },
    {
      id: "sipp",
      label: "SIPP",
      treatment: "tax-deferred",
      taxFreeFractionOnWithdrawal: 0.25, // For gradual UFPLS
      taxFreeLifetimeCap: 268275,
      withdrawalBucket: "pension-withdrawal"
    },
    {
      id: "gia",
      label: "GIA",
      treatment: "taxable",
      withdrawalBucket: "realised-gains"
    }
  ],
  taxSystem: () => {
    return {
      bases: [
        {
          id: "income",
          schedule: [
            { upTo: UK_INCOME_TAX_BANDS_2026_27.basicRateBandWidth, rate: UK_INCOME_TAX_BANDS_2026_27.basicRate },
            { 
              upTo: (allowance: number) => UK_INCOME_TAX_BANDS_2026_27.additionalRateThreshold - allowance, 
              rate: UK_INCOME_TAX_BANDS_2026_27.higherRate 
            },
            { upTo: Infinity, rate: UK_INCOME_TAX_BANDS_2026_27.additionalRate }
          ],
          allowance: (totalIncome: number) => calculatePersonalAllowance(totalIncome)
        },
        {
          id: "cgt",
          stacksOn: "income",
          schedule: [
            { 
              upTo: UK_INCOME_TAX_BANDS_2026_27.basicRateBandWidth + UK_INCOME_TAX_BANDS_2026_27.personalAllowance, 
              rate: 0.18 
            },
            { upTo: Infinity, rate: 0.24 }
          ],
          allowance: () => 3000
        }
      ],
      routing: {
        "employment": { base: "income" },
        "pension-withdrawal": { base: "income" },
        "rental": { base: "income" },
        "state-pension": { base: "income" },
        "realised-gains": { base: "cgt" }
      }
    };
  },
  statePension: () => {
    // UK is simple, just the scalar configured by the user
    return 12547.60;
  },
  constraints: [
    {
      kind: "taper",
      on: ["employment", "pension-withdrawal", "rental", "state-pension", "interest", "dividends"],
      threshold: UK_INCOME_TAX_BANDS_2026_27.taperThreshold,
      rate: 0.5 // £1 lost for every £2 over
    }
  ],
  disposalPolicy: "average", // UK GIA cost basis is typically average cost (Section 104 holding)
  drawdownCandidates: ["gradual", "lump-sum"]
};
