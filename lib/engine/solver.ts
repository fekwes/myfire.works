import { IncomeBucket, TaxSystem } from "../countries/types";
import { calculateTax } from "./tax";

export function bisect(netOf: (gross: number) => number, targetNet: number): number {
  let lo = 0;
  let hi = Math.max(targetNet * 2, 1000);
  while (netOf(hi) < targetNet && hi < 1e9) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < targetNet) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * Finds the gross income whose combined net-of-tax total equals `targetNet`.
 */
export function solveGrossIncomeForNetGeneric(
  targetNet: number,
  baseIncomes: Partial<Record<IncomeBucket, number>>,
  bucketToSolve: IncomeBucket,
  taxSystem: TaxSystem,
  age: number = 0,
  taxInflationFactor: number = 1
): number {
  if (targetNet <= 0) return 0;

  // We find the total net income of the base incomes first
  const baseTax = calculateTax(baseIncomes, taxSystem, age, taxInflationFactor).totalTax;
  const baseGross = Object.values(baseIncomes).reduce((a, b) => (a || 0) + (b || 0), 0) || 0;
  const baseNet = baseGross - baseTax;

  const netOf = (gross: number) => {
    const combinedIncomes = { ...baseIncomes };
    combinedIncomes[bucketToSolve] = (combinedIncomes[bucketToSolve] || 0) + gross;
    
    const tax = calculateTax(combinedIncomes, taxSystem, age, taxInflationFactor).totalTax;
    const totalGross = baseGross + gross;
    const totalNet = totalGross - tax;
    return totalNet - baseNet;
  };

  return bisect(netOf, targetNet);
}

/**
 * Gross withdrawal where a fraction is tax-free.
 */
export function solveGrossForNetWithTaxFreeFraction(
  targetNet: number,
  baseIncomes: Partial<Record<IncomeBucket, number>>,
  bucketToSolve: IncomeBucket,
  taxFreeFraction: number,
  remainingTaxFreeCap: number,
  taxSystem: TaxSystem,
  age: number = 0,
  taxInflationFactor: number = 1
): number {
  if (targetNet <= 0) return 0;

  const baseGross = Object.values(baseIncomes).reduce((a, b) => (a || 0) + (b || 0), 0) || 0;
  const baseTax = calculateTax(baseIncomes, taxSystem, age, taxInflationFactor).totalTax;
  const baseNet = baseGross - baseTax;

  const netOf = (gross: number) => {
    const taxFree = Math.min(taxFreeFraction * gross, remainingTaxFreeCap);
    const taxable = gross - taxFree;
    
    const combinedIncomes = { ...baseIncomes };
    combinedIncomes[bucketToSolve] = (combinedIncomes[bucketToSolve] || 0) + taxable;
    
    const tax = calculateTax(combinedIncomes, taxSystem, age, taxInflationFactor).totalTax;
    const totalNet = taxFree + (baseGross + taxable) - tax;
    return totalNet - baseNet;
  };

  return bisect(netOf, targetNet);
}

/**
 * Gross taxable gain withdrawal.
 * `gainFraction` is the proportion of the withdrawal that is taxable gain.
 */
export function solveGainGrossForNet(
  targetNet: number,
  baseIncomes: Partial<Record<IncomeBucket, number>>,
  gainBucket: IncomeBucket,
  gainFraction: number,
  taxSystem: TaxSystem,
  age: number = 0,
  taxInflationFactor: number = 1
): number {
  if (targetNet <= 0) return 0;
  if (gainFraction <= 0) return targetNet;

  const basisRatio = Math.max(0, 1 - gainFraction);

  const baseGross = Object.values(baseIncomes).reduce((a, b) => (a || 0) + (b || 0), 0) || 0;
  const baseTax = calculateTax(baseIncomes, taxSystem, age, taxInflationFactor).totalTax;
  const baseNet = baseGross - baseTax;

  const netOf = (gross: number) => {
    const basisToSell = basisRatio * gross;
    const realisedGain = gross - basisToSell;
    
    const combinedIncomes = { ...baseIncomes };
    combinedIncomes[gainBucket] = (combinedIncomes[gainBucket] || 0) + realisedGain;
    
    // We only care about the extra CGT paid because GIA principal isn't taxed.
    // The total tax will include base income tax + CGT.
    const totalTax = calculateTax(combinedIncomes, taxSystem, age, taxInflationFactor).totalTax;
    
    const totalNet = gross + baseGross - totalTax;
    return totalNet - baseNet;
  };

  return bisect(netOf, targetNet);
}
