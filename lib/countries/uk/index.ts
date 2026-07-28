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
  labels: {
    statePension: "State Pension",
    taxFreeWrapper: "ISA",
    taxDeferredWrapper: "SIPP",
    taxableWrapper: "GIA",
    hasPensionStrategyToggle: true,
    retirementAgeTooltip: "When you plan to stop working. Your ISA/GIA bridges income until your SIPP unlocks.",
    targetIncomeTooltip: "The take-home income you want to spend each year in retirement — after tax, in today's money. Your State Pension is already counted towards this.",
    partTimeTooltip: "Go part-time in early retirement to bridge the gap to your State Pension.",
    rentalSaleTooltip: "Leave at 0 to keep it. Otherwise it's sold at this age (residential CGT), proceeds go to your GIA, and the rent stops.",
    homeTooltip: "Counts as net worth and grows, but isn't drawn for income — unless you downsize, which releases tax-free cash (primary-residence relief) into your GIA.",
    savingsHelper: "A ballpark total across your ISAs, pensions and other savings is fine. This is the one number that turns your result from a guess into a real verdict — but you can skip it.",
    savingsHint: "We'll add this to your ISA to start — you can split it across your pension in the planner.",
    baristaTagline: "Leave full-time work early and let part-time earnings bridge you to the State Pension.",
    strategyWhy: "Your route changes the shape of the plan — when you stop adding money, and whether part-time work bridges you to the State Pension.",
    checklistSavingsHint: "From your ISA provider, pension portal or last statement — a rough figure is fine, you can refine it later.",
    lifestyleBenchmarkName: "UK PLSA Retirement Living Standards",
  },
  lifestyleTiers: [
    {
      id: "minimum",
      label: "Minimum",
      amount: 13400,
      blurb: "Covers all your needs, with a little left over for fun.",
    },
    {
      id: "moderate",
      label: "Moderate",
      amount: 31700,
      blurb: "More financial security and flexibility.",
    },
    {
      id: "comfortable",
      label: "Comfortable",
      amount: 43900,
      blurb: "Financial freedom and some luxuries.",
    },
  ],
  quizDefaults: {
    customIncome: 40000,
    baristaAnnualIncome: 15000,
    defaultIsaMonthly: 500,
    defaultSippMonthly: 300,
    defaultStatePensionAnnual: 12547.60,
    defaultPensionAccessAge: 57,
    defaultStatePensionAge: 67,
  },
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
