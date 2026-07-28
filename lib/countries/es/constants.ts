export interface EsIncomeTaxBands {
  personalAllowance: number;
  basicBandWidth: number;
  mediumBandWidth: number;
  higherBandWidth: number;
  topBandWidth: number;
  basicRate: number; // 19%
  secondRate: number; // 24%
  thirdRate: number; // 30%
  fourthRate: number; // 37%
  fifthRate: number; // 45%
  topRate: number; // 47%
}

export const ES_INCOME_TAX_BANDS_2026: EsIncomeTaxBands = {
  personalAllowance: 5550,
  basicBandWidth: 12450,
  mediumBandWidth: 20200,
  higherBandWidth: 35200,
  topBandWidth: 60000,
  basicRate: 0.19,
  secondRate: 0.24,
  thirdRate: 0.30,
  fourthRate: 0.37,
  fifthRate: 0.45,
  topRate: 0.47,
};

export const ES_SAVINGS_TAX_BANDS_2026 = [
  { upTo: 6000, rate: 0.19 },
  { upTo: 50000, rate: 0.21 },
  { upTo: 200000, rate: 0.23 },
  { upTo: 300000, rate: 0.27 },
  { upTo: Infinity, rate: 0.28 },
];

export const ES_PLAN_PENSIONES_MAX_CONTRIBUTION = 1500;
export const ES_DEFAULT_STATE_PENSION_ANNUAL = 14000;
export const ES_DEFAULT_PENSION_ACCESS_AGE = 65;
export const ES_DEFAULT_STATE_PENSION_AGE = 67;

/**
 * Spanish Personal Allowance (Mínimo Personal y Familiar)
 * Base: 5,550 €
 * Age >= 65: +1,150 € (6,700 €)
 * Age >= 75: +1,400 € additional (8,100 €)
 */
export function calculateEsPersonalAllowance(age: number = 0): number {
  let allowance = ES_INCOME_TAX_BANDS_2026.personalAllowance;
  if (age >= 75) {
    allowance += 2550;
  } else if (age >= 65) {
    allowance += 1150;
  }
  return allowance;
}
