"use client";

import { Field, NumberInput } from "@/components/FireForm";
import { usePlan } from "@/components/PlanProvider";
import { ButtonLink, Card } from "@/components/ui";
import type { FireInputs } from "@/lib/fire-engine";

/**
 * The handful of inputs people tweak most while watching the result. The full
 * detail (balances, property, growth, scenario) lives in Your Finances; this
 * keeps the Planner iterative without dragging the whole form onto it.
 */
export function QuickLevers() {
  const { inputs, setInputs, activePack } = usePlan();
  const set = <K extends keyof FireInputs>(key: K, value: FireInputs[K]) =>
    setInputs({ ...inputs, [key]: value });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Quick levers
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adjust the numbers you tweak most. Everything else — balances,
            property, funds — lives under Edit plan.
          </p>
        </div>
        <ButtonLink
          href="/finances"
          variant="secondary"
          size="sm"
          className="no-print"
        >
          Edit plan →
        </ButtonLink>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Current age">
          <NumberInput
            value={inputs.currentAge}
            onChange={(v) => set("currentAge", v)}
            suffix="yrs"
            min={18}
          />
        </Field>
        <Field label="Retire at">
          <NumberInput
            value={inputs.retirementAge}
            onChange={(v) => set("retirementAge", v)}
            suffix="yrs"
            min={inputs.currentAge}
          />
        </Field>
        <Field
          label="Target income"
          tooltip={`Take-home income per year, after tax. Your ${activePack.id === "us" ? "Social Security" : "State Pension"} is already counted towards it, so your pots only fund the rest.`}
        >
          <NumberInput
            value={inputs.targetAnnualIncome}
            onChange={(v) => set("targetAnnualIncome", v)}
            prefix={activePack.currency.symbol}
            step={500}
          />
        </Field>
        <Field label={activePack.id === "us" ? "Roth / mo" : "ISA / mo"}>
          <NumberInput
            value={(inputs.pots?.isa?.monthlyContribution ?? inputs.isaMonthlyContribution ?? 0)}
            onChange={(v) => set("isaMonthlyContribution", v)}
            prefix={activePack.currency.symbol}
          />
        </Field>
        <Field label={activePack.id === "us" ? "401(k) / mo" : "Pension / mo"}>
          <NumberInput
            value={(inputs.pots?.sipp?.monthlyContribution ?? inputs.sippMonthlyContribution ?? 0)}
            onChange={(v) => set("sippMonthlyContribution", v)}
            prefix={activePack.currency.symbol}
          />
        </Field>
      </div>
    </Card>
  );
}
