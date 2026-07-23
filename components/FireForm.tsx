"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { DEFAULT_ASSUMPTIONS, type FireInputs } from "@/lib/fire-engine";

export const DEFAULT_FIRE_FORM_VALUES: FireInputs = {
  currentAge: 35,
  retirementAge: 50,
  targetAnnualIncome: 40000,
  isaBalance: 50000,
  isaMonthlyContribution: 1000,
  giaBalance: 0,
  giaMonthlyContribution: 0,
  sippBalance: 80000,
  sippMonthlyContribution: 500,
  growthRate: DEFAULT_ASSUMPTIONS.growthRate,
  statePensionAnnual: DEFAULT_ASSUMPTIONS.statePensionAnnual,
  statePensionAge: DEFAULT_ASSUMPTIONS.statePensionAge,
  sippAccessAge: DEFAULT_ASSUMPTIONS.sippAccessAge,
  lifeExpectancyAge: DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
};

interface FireFormProps {
  value: FireInputs;
  onChange: (inputs: FireInputs) => void;
}

function Tooltip({ text }: { text: string }) {
  const id = useId();
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        className="text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      >
        <Info className="size-3.5" />
      </button>
      {/* Right-anchored so it never overflows the narrow form column. */}
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-52 max-w-[calc(100vw-2.5rem)] rounded-lg border border-border bg-surface p-2.5 text-xs leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function Field({
  label,
  tooltip,
  children,
  className,
}: {
  label: string;
  tooltip?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-background transition-colors hover:border-muted-foreground/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      {prefix && (
        <span className="pl-3 text-sm text-muted-foreground">{prefix}</span>
      )}
      <input
        type="number"
        inputMode="decimal"
        value={Number.isNaN(value) ? "" : value}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="tabular w-full min-w-0 bg-transparent px-3 py-2 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="pr-3 text-sm whitespace-nowrap text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

function Block({
  title,
  dotClass,
  tooltip,
  children,
}: {
  title: string;
  dotClass?: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <div className="flex items-center gap-1.5">
        {dotClass && <span className={`size-2 rounded-full ${dotClass}`} />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className="mt-3 grid grid-cols-2 items-end gap-4">{children}</div>
    </div>
  );
}

export function FireForm({ value, onChange }: FireFormProps) {
  const set = <K extends keyof FireInputs>(key: K, next: FireInputs[K]) =>
    onChange({ ...value, [key]: next });

  const num = (v: number | undefined, fallback: number) =>
    v === undefined ? fallback : v;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 items-end gap-4">
        <Field label="Current age">
          <NumberInput
            value={value.currentAge}
            onChange={(v) => set("currentAge", v)}
            suffix="yrs"
            min={18}
          />
        </Field>
        <Field
          label="Target retirement age"
          tooltip="When you plan to stop working. Your ISA/GIA bridges income until your SIPP unlocks."
        >
          <NumberInput
            value={value.retirementAge}
            onChange={(v) => set("retirementAge", v)}
            suffix="yrs"
            min={value.currentAge}
          />
        </Field>
      </div>

      <Field
        label="Target net annual income"
        tooltip="The take-home income you want in retirement, after tax."
      >
        <NumberInput
          value={value.targetAnnualIncome}
          onChange={(v) => set("targetAnnualIncome", v)}
          prefix="£"
          suffix="/ yr"
          step={500}
        />
      </Field>

      <Block
        title="ISA — tax-free bridge"
        dotClass="bg-data-2"
        tooltip="Accessible any time, completely tax-free. Drawn first."
      >
        <Field label="Current balance">
          <NumberInput
            value={value.isaBalance}
            onChange={(v) => set("isaBalance", v)}
            prefix="£"
          />
        </Field>
        <Field label="Monthly contribution">
          <NumberInput
            value={value.isaMonthlyContribution}
            onChange={(v) => set("isaMonthlyContribution", v)}
            prefix="£"
          />
        </Field>
      </Block>

      <Block
        title="GIA — taxable bridge"
        dotClass="bg-data-3"
        tooltip="Drawn after the ISA; gains above the £3,000 annual exemption pay Capital Gains Tax (18%/24%)."
      >
        <Field label="Current balance">
          <NumberInput
            value={num(value.giaBalance, 0)}
            onChange={(v) => set("giaBalance", v)}
            prefix="£"
          />
        </Field>
        <Field label="Monthly contribution">
          <NumberInput
            value={num(value.giaMonthlyContribution, 0)}
            onChange={(v) => set("giaMonthlyContribution", v)}
            prefix="£"
          />
        </Field>
      </Block>

      <Block
        title="SIPP — the pension"
        dotClass="bg-data-1"
        tooltip="Locked until your access age. 25% tax-free (up to £268,275); the rest taxed as income."
      >
        <Field label="Current balance">
          <NumberInput
            value={value.sippBalance}
            onChange={(v) => set("sippBalance", v)}
            prefix="£"
          />
        </Field>
        <Field label="Monthly contribution">
          <NumberInput
            value={value.sippMonthlyContribution}
            onChange={(v) => set("sippMonthlyContribution", v)}
            prefix="£"
          />
        </Field>
        <Field
          label="Access age"
          className="col-span-2"
          tooltip="UK minimum pension age is 55 today, rising to 57 in April 2028 — the default here."
        >
          <NumberInput
            value={num(value.sippAccessAge, DEFAULT_ASSUMPTIONS.sippAccessAge)}
            onChange={(v) => set("sippAccessAge", v)}
            suffix="yrs"
            min={value.retirementAge}
          />
        </Field>
      </Block>

      <Block
        title="State Pension"
        tooltip="A flat income from your State Pension age. Lower the amount if your National Insurance record is incomplete."
      >
        <Field label="From age">
          <NumberInput
            value={num(
              value.statePensionAge,
              DEFAULT_ASSUMPTIONS.statePensionAge,
            )}
            onChange={(v) => set("statePensionAge", v)}
            suffix="yrs"
          />
        </Field>
        <Field label="Amount">
          <NumberInput
            value={num(
              value.statePensionAnnual,
              DEFAULT_ASSUMPTIONS.statePensionAnnual,
            )}
            onChange={(v) => set("statePensionAnnual", v)}
            prefix="£"
            suffix="/ yr"
            step={100}
          />
        </Field>
      </Block>

      <div className="grid grid-cols-2 items-end gap-4">
        <Field
          label="Expected growth"
          tooltip="Assumed nominal annual return on all pots. Not inflation-adjusted."
        >
          <NumberInput
            value={
              Math.round(
                num(value.growthRate, DEFAULT_ASSUMPTIONS.growthRate) * 1000,
              ) / 10
            }
            onChange={(v) => set("growthRate", (v || 0) / 100)}
            suffix="%"
            step={0.5}
          />
        </Field>
        <Field
          label="Plan lasts to"
          tooltip="The age the plan must fund. The projection runs every year up to here."
        >
          <NumberInput
            value={num(
              value.lifeExpectancyAge,
              DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
            )}
            onChange={(v) => set("lifeExpectancyAge", v)}
            suffix="yrs"
          />
        </Field>
      </div>
    </div>
  );
}
