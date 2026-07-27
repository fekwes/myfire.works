import { IncomeBucket, TaxSystem } from "../countries/types";

/** 
 * Generic tax calculator based on a TaxSystem configuration.
 */
export function calculateTax(
  incomes: Partial<Record<IncomeBucket, number>>,
  taxSystem: TaxSystem
): { totalTax: number; taxByBase: Record<string, number> } {
  const taxByBase: Record<string, number> = {};
  let totalTax = 0;

  // 1. Group incomes into their respective bases
  const incomeByBase: Record<string, number> = {};
  for (const [bucket, amount] of Object.entries(incomes)) {
    if (!amount || amount <= 0) continue;
    const routing = taxSystem.routing[bucket as IncomeBucket];
    if (routing) {
      const inclusion = routing.inclusion ?? 1;
      incomeByBase[routing.base] = (incomeByBase[routing.base] || 0) + (amount * inclusion);
    }
  }

  // 2. We need a way to determine total income for cross-base allowance tapers.
  // For UK, total income is all income combined, but technically we should evaluate
  // allowances within their base. For now we will sum up all routed income.
  const totalIncome = Object.values(incomeByBase).reduce((sum, val) => sum + val, 0);

  // 3. Process each base. We process base by base. If a base stacks on another,
  // we must process the other first (not strictly enforced here yet, just summing).
  for (const base of taxSystem.bases) {
    const baseIncome = incomeByBase[base.id] || 0;
    
    // Total income for stacking
    let stackedIncome = 0;
    if (base.stacksOn && incomeByBase[base.stacksOn]) {
      // In reality, stacking means we start filling the schedule at stackedIncome.
      stackedIncome = incomeByBase[base.stacksOn];
    }
    
    // For UK, allowance tapers based on total income.
    // In our config, allowance takes `totalIncome`
    let allowance = 0;
    if (base.allowance) {
      // For CGT, it's just the exempt amount (which might not taper, so totalIncome doesn't matter)
      // For UK Income Tax, the taper applies to total income.
      allowance = base.allowance(totalIncome); 
    }

    let taxable = Math.max(0, baseIncome - allowance);
    let tax = 0;

    // Apply the schedule
    // The schedule tells us the maximum amount of income taxed at that rate.
    // But if we stack, we are already starting at `stackedIncome`.
    // Wait, UK CGT stacks on *taxable* income? No, it stacks on gross income?
    // "taxed at 18% up to the basic-rate ceiling (as stacked on top of the year's income)"
    // Let's look at calculateCapitalGainsTax:
    //   const atBasic = Math.min(taxable, Math.max(0, remainingBasicBand));
    // remainingBasicBand = Math.max(0, BASIC_RATE_CEILING - otherTaxableIncome);
    
    // Let's compute the filled bands
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
      const tax = surtax.apply(totalIncome, incomeByBase); // Simplification
      taxByBase[surtax.id] = tax;
      totalTax += tax;
    }
  }

  return { totalTax, taxByBase };
}
