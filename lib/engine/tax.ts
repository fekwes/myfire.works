import { IncomeBucket, TaxSystem } from "../countries/types";

/** 
 * Generic tax calculator based on a TaxSystem configuration.
 */
export function calculateTax(
  incomes: Partial<Record<IncomeBucket, number>>,
  taxSystem: TaxSystem,
  age: number = 0,
  taxInflationFactor: number = 1
): { totalTax: number; taxByBase: Record<string, number> } {
  // 1. Deflate nominal incomes to evaluate against static tax bands
  const deflatedIncomes: Partial<Record<IncomeBucket, number>> = {};
  for (const [bucket, amount] of Object.entries(incomes)) {
    if (amount !== undefined) deflatedIncomes[bucket as IncomeBucket] = amount / taxInflationFactor;
  }

  const taxByBase: Record<string, number> = {};
  let totalTax = 0;

  // 1. Group deflated incomes into their respective bases
  const incomeByBase: Record<string, number> = {};
  for (const [bucket, amount] of Object.entries(deflatedIncomes)) {
    if (!amount || amount <= 0) continue;
    const routing = taxSystem.routing[bucket as IncomeBucket];
    if (routing) {
      const inclusion = routing.inclusion ?? 1;
      incomeByBase[routing.base] = (incomeByBase[routing.base] || 0) + (amount * inclusion);
    }
  }

  // 2. We need a way to determine total ordinary income for cross-base allowance tapers (excluding CGT).
  const totalIncome = Object.entries(incomeByBase)
    .filter(([baseId]) => baseId !== "cgt")
    .reduce((sum, [, val]) => sum + val, 0);

  // 3. Process each base.
  for (const base of taxSystem.bases) {
    const baseIncome = incomeByBase[base.id] || 0;
    
    // Total income for stacking (taxable income of stacked base after allowance)
    let stackedIncome = 0;
    if (base.stacksOn) {
      const parentBase = taxSystem.bases.find((b) => b.id === base.stacksOn);
      const parentGross = incomeByBase[base.stacksOn] || 0;
      let parentAllowance = 0;
      if (parentBase?.allowance) {
        parentAllowance = parentBase.allowance(totalIncome);
      }
      stackedIncome = Math.max(0, parentGross - parentAllowance);
    }
    
    let allowance = 0;
    if (base.allowance) {
      allowance = base.allowance(totalIncome); 
    }

    const taxable = Math.max(0, baseIncome - allowance);
    let tax = 0;

    let remainingIncome = taxable;
    let currentStackOffset = stackedIncome;
    
    for (const band of base.schedule) {
      if (remainingIncome <= 0) break;
      
      const upTo = typeof band.upTo === "function" ? band.upTo(allowance) : band.upTo;
      const roomInBand = Math.max(0, upTo - currentStackOffset);
      
      const portion = Math.min(remainingIncome, roomInBand);
      tax += portion * band.rate;
      remainingIncome -= portion;
      currentStackOffset += portion;
    }
    
    taxByBase[base.id] = tax;
    totalTax += tax;
  }
  
  // 4. Surtaxes (if any)
  if (taxSystem.surtaxes) {
    for (const surtax of taxSystem.surtaxes) {
      const tax = surtax.apply(totalIncome, incomeByBase, age);
      taxByBase[surtax.id] = tax;
      totalTax += tax;
    }
  }

  // 5. Inflate the resulting taxes back to nominal terms
  const inflatedTaxByBase: Record<string, number> = {};
  for (const [base, tax] of Object.entries(taxByBase)) {
    inflatedTaxByBase[base] = tax * taxInflationFactor;
  }

  return { 
    totalTax: totalTax * taxInflationFactor, 
    taxByBase: inflatedTaxByBase 
  };
}
