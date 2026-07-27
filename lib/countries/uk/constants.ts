export interface UkIncomeTaxBands {
  personalAllowance: number;
  taperThreshold: number;
  basicRateBandWidth: number;
  additionalRateThreshold: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
}

export const UK_INCOME_TAX_BANDS_2026_27: UkIncomeTaxBands = {
  personalAllowance: 12570,
  taperThreshold: 100000,
  basicRateBandWidth: 37700,
  additionalRateThreshold: 125140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
};

export const BASIC_RATE_CEILING =
  UK_INCOME_TAX_BANDS_2026_27.personalAllowance +
  UK_INCOME_TAX_BANDS_2026_27.basicRateBandWidth;

export const TAX_FREE_LUMP_SUM_CAP = 268275;

export const CGT_ANNUAL_EXEMPT_AMOUNT = 3000;
export const CGT_BASIC_RATE = 0.18;
export const CGT_HIGHER_RATE = 0.24;

export function calculatePersonalAllowance(
  totalIncome: number,
  bands: UkIncomeTaxBands = UK_INCOME_TAX_BANDS_2026_27,
): number {
  if (totalIncome <= bands.taperThreshold) return bands.personalAllowance;
  const reduction = Math.floor((totalIncome - bands.taperThreshold) / 2);
  return Math.max(0, bands.personalAllowance - reduction);
}
