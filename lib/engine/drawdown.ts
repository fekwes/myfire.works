import { IncomeBucket, TaxSystem, WrapperSpec } from "../countries/types";
import { solveGainGrossForNet, solveGrossIncomeForNetGeneric, solveGrossForNetWithTaxFreeFraction } from "./solver";
import { calculateTax } from "./tax";

export interface DrawdownState {
  balances: Record<string, number>;
  bases: Record<string, number>;
}

export interface DrawdownResult {
  potWithdrawals: Record<string, { gross: number; taxFree: number }>;
  netIncomeFromPots: number;
  totalTaxPaid: number;
  capitalGainsTaxPaid: number;
  incomeTaxPaid: number;
  state: DrawdownState;
}

/**
 * Executes a drawdown sequence defined by a comma or arrow separated string of wrapper IDs.
 * Example: "isa->gia->sipp" or "brokerage->401k->roth"
 */
export function executeDrawdownSequence(
  sequence: string,
  targetNet: number,
  initialState: DrawdownState,
  otherTaxableIncome: number,
  taxSystem: TaxSystem,
  wrappers: WrapperSpec[],
  taxFreeLumpSumAvailable: number,
): DrawdownResult {
  const steps = sequence.split(/->|,/).map(s => s.trim());
  let currentTarget = targetNet;
  const currentState = {
    balances: { ...initialState.balances },
    bases: { ...initialState.bases }
  };
  
  const potWithdrawals: Record<string, { gross: number; taxFree: number }> = {};
  for (const w of wrappers) {
    potWithdrawals[w.id] = { gross: 0, taxFree: 0 };
  }
  for (const key of Object.keys(initialState.balances)) {
    if (!potWithdrawals[key]) potWithdrawals[key] = { gross: 0, taxFree: 0 };
  }
  
  let totalIncomeTax = 0;
  let totalCgt = 0;
  
  // Track incomes across all steps so taxes stack correctly.
  const currentIncomes: Partial<Record<IncomeBucket, number>> = {
    "employment": otherTaxableIncome
  };
  
  // To avoid over-taxing in solvers due to existing tax on otherTaxableIncome,
  // solvers just need the running total of income. 
  // Wait, if otherTaxableIncome is already taxed before drawdown, 
  // the solvers must account for the marginal tax increase.
  
  for (const step of steps) {
    if (currentTarget <= 0) break;
    
    // Parse step (handle e.g. "401k-to-standard-deduction")
    // For now, just match wrapper ID
    const wrapperId = step.split("-to-")[0]; 
    const wrapper = wrappers.find(w => w.id === wrapperId);
    if (!wrapper) continue;
    
    const balance = currentState.balances[wrapperId] || 0;
    if (balance <= 0.01) continue;
    
    if (wrapper.treatment === "tax-free") {
      const withdrawal = Math.min(balance, currentTarget);
      currentState.balances[wrapperId] -= withdrawal;
      potWithdrawals[wrapperId].gross += withdrawal;
      potWithdrawals[wrapperId].taxFree += withdrawal;
      currentTarget -= withdrawal;
    } 
    else if (wrapper.treatment === "taxable") {
      // GIA / Brokerage
      const basis = currentState.bases[wrapperId] || 0;
      const gainFraction = balance > 0 ? Math.max(0, (balance - basis) / balance) : 0;
      
      const desiredGross = solveGainGrossForNet(
        currentTarget,
        currentIncomes,
        wrapper.withdrawalBucket,
        gainFraction,
        taxSystem
      );
      
      const gross = Math.min(desiredGross, balance);
      const realisedGain = gross * gainFraction;
      
      // Calculate marginal CGT caused by this withdrawal
      const taxBefore = calculateTax(currentIncomes, taxSystem);
      const nextIncomes = { ...currentIncomes };
      nextIncomes[wrapper.withdrawalBucket] = (nextIncomes[wrapper.withdrawalBucket] || 0) + realisedGain;
      const taxAfter = calculateTax(nextIncomes, taxSystem);
      
      const cgtPaid = (taxAfter.taxByBase["cgt"] || 0) - (taxBefore.taxByBase["cgt"] || 0);
      const net = gross - cgtPaid;
      
      const basisConsumed = balance > 0 ? gross * (basis / balance) : 0;
      currentState.bases[wrapperId] = Math.max(0, basis - basisConsumed);
      currentState.balances[wrapperId] -= gross;
      
      potWithdrawals[wrapperId].gross += gross;
      currentIncomes[wrapper.withdrawalBucket] = nextIncomes[wrapper.withdrawalBucket];
      totalCgt += cgtPaid;
      currentTarget -= net;
    }
    else if (wrapper.treatment === "tax-deferred") {
      // SIPP / 401k
      const taxFreeFraction = wrapper.taxFreeFractionOnWithdrawal || 0;
      let gross = 0;
      let taxFree = 0;
      let net = 0;
      let incomeTaxPaid = 0;
      
      if (taxFreeFraction > 0 && taxFreeLumpSumAvailable > 0) {
        const desiredGross = solveGrossForNetWithTaxFreeFraction(
          currentTarget,
          currentIncomes,
          wrapper.withdrawalBucket,
          taxFreeFraction,
          taxFreeLumpSumAvailable,
          taxSystem
        );
        gross = Math.min(desiredGross, balance);
        taxFree = Math.min(taxFreeFraction * gross, taxFreeLumpSumAvailable);
      } else {
        const desiredGross = solveGrossIncomeForNetGeneric(
          currentTarget,
          currentIncomes,
          wrapper.withdrawalBucket,
          taxSystem
        );
        gross = Math.min(desiredGross, balance);
      }
      
      const taxablePortion = gross - taxFree;
      const taxBefore = calculateTax(currentIncomes, taxSystem);
      const nextIncomes = { ...currentIncomes };
      nextIncomes[wrapper.withdrawalBucket] = (nextIncomes[wrapper.withdrawalBucket] || 0) + taxablePortion;
      const taxAfter = calculateTax(nextIncomes, taxSystem);
      
      // Usually "income" or "ordinary" base
      const taxBaseId = taxSystem.routing[wrapper.withdrawalBucket]?.base || "income";
      incomeTaxPaid = (taxAfter.taxByBase[taxBaseId] || 0) - (taxBefore.taxByBase[taxBaseId] || 0);
      
      net = gross - incomeTaxPaid;
      
      currentState.balances[wrapperId] -= gross;
      potWithdrawals[wrapperId].gross += gross;
      potWithdrawals[wrapperId].taxFree += taxFree;
      taxFreeLumpSumAvailable -= taxFree;
      
      currentIncomes[wrapper.withdrawalBucket] = nextIncomes[wrapper.withdrawalBucket];
      totalIncomeTax += incomeTaxPaid;
      currentTarget -= net;
    }
  }

  return {
    potWithdrawals,
    netIncomeFromPots: targetNet - currentTarget,
    totalTaxPaid: totalIncomeTax + totalCgt,
    capitalGainsTaxPaid: totalCgt,
    incomeTaxPaid: totalIncomeTax,
    state: currentState
  };
}
