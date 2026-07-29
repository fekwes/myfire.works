export interface StrategyTip {
  title: string;
  detail: string;
}

export interface RuleTipsInput {
  currentAge: number;
  retirementAge: number;
  targetAnnualIncome: number;
  isaBalance: number;
  isaMonthlyContribution: number;
  giaBalance: number;
  sippBalance: number;
  sippMonthlyContribution: number;
  propertyValue: number;
  fireNumber: number;
  projectedAtRetirement: number;
  sippAccessAge: number;
  statePensionAge: number;
  taxFreeLumpSum: number;
  sustainableToLifeExpectancy: boolean;
  isaDepletedAge: number | null;
  sippDepletedAge: number | null;
}

/**
 * Generates instant, high-quality, rule-based FIRE strategy tips directly from
 * simulation numbers. Used as fallback when AI services are offline, quota-limited,
 * or unconfigured to ensure 100% feature availability and zero UX dead-ends.
 */
export function generateDeterministicTips(input: RuleTipsInput): StrategyTip[] {
  const tips: StrategyTip[] = [];
  const bridgeYears = Math.max(0, input.sippAccessAge - input.retirementAge);

  // 1. Tax Relief Optimization (SIPP vs ISA Bridge)
  if (bridgeYears > 0 && input.isaBalance < input.targetAnnualIncome * bridgeYears) {
    tips.push({
      title: "Strengthen Your ISA Bridge Phase",
      detail: `You target retirement at age ${input.retirementAge}, but your SIPP cannot be accessed until age ${input.sippAccessAge}. Your ISA bridge pot needs to fund ${bridgeYears} years before pension access. Prioritise ISA contributions to prevent early pot depletion.`,
    });
  } else if (input.sippMonthlyContribution < input.isaMonthlyContribution) {
    tips.push({
      title: "Maximize Pension Tax Relief",
      detail: "Every £100 contributed to your SIPP costs only £80 as a basic-rate taxpayer (or £60 as a higher-rate taxpayer) due to immediate tax relief. Scaling up pension contributions accelerates your core compound growth.",
    });
  } else {
    tips.push({
      title: "Maintain Balanced Tax Wrapper Allocation",
      detail: "Your current contribution split balances ISA accessibility with SIPP tax efficiency. Continue monitoring wrapper balances to keep your pre-57 bridge protected.",
    });
  }

  // 2. Tax-Free Lump Sum & CGT Optimization
  if (input.taxFreeLumpSum > 0) {
    tips.push({
      title: `Optimize 25% Tax-Free Pension Lump Sum`,
      detail: `At age ${input.sippAccessAge}, you can withdraw up to 25% of your SIPP tax-free (capped at £268,275). Using this lump sum strategically to pay off debt or top up your ISA minimizes future income tax.`,
    });
  } else if (input.giaBalance > 0) {
    tips.push({
      title: "Bed & ISA GIA Tax Minimization",
      detail: "You hold funds in taxable General Investment Accounts (GIA). Utilize Bed & ISA transfers each tax year to move up to £20,000 into your ISA, protecting future gains from capital gains tax and dividend tax.",
    });
  } else {
    tips.push({
      title: `State Pension Integration at Age ${input.statePensionAge}`,
      detail: `From age ${input.statePensionAge}, the UK State Pension (currently ~£11,500/yr) will significantly reduce your net pot withdrawal requirements, extending your overall portfolio lifespan.`,
    });
  }

  // 3. Gap & Sustainability Action Plan
  if (!input.sustainableToLifeExpectancy) {
    const gap = Math.max(0, input.fireNumber - input.projectedAtRetirement);
    tips.push({
      title: "Close the Target Capital Gap",
      detail: gap > 0 
        ? `Your projected pot at retirement falls short of your target FIRE number by ~£${gap.toLocaleString()}. Increasing monthly savings by ~£150/mo or extending your target age by 2 years will bridge this gap.`
        : "Your retirement spending rate strains portfolio longevity past age 85. Consider testing a 0.5% lower withdrawal target or dynamic guardrails during low market returns.",
    });
  } else {
    tips.push({
      title: "Plan Sustainable & Resilient Decumulation",
      detail: "Your projection is sustainable to age 95+. Consider implementing dynamic withdrawal guardrails in retirement to increase spending during strong market years while protecting your capital.",
    });
  }

  return tips.slice(0, 3);
}
