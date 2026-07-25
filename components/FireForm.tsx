"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { FundSelect } from "@/components/FundSelect";
import { Collapsible } from "@/components/ui";
import { setChecklistFlag } from "@/lib/checklist";
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_INFLATION_RATE,
  type FireInputs,
  type PensionStrategy,
} from "@/lib/fire-engine";

export const DEFAULT_FIRE_FORM_VALUES: FireInputs = {
  currentAge: 35,
  retirementAge: 50,
  targetAnnualIncome: 40000,
  inflationRate: DEFAULT_INFLATION_RATE,
  isaBalance: 50000,
  isaMonthlyContribution: 1000,
  isaGrowth: 0.05,
  giaBalance: 0,
  giaMonthlyContribution: 0,
  giaGrowth: 0.05,
  rentalValue: 0,
  rentalGrowth: 0.03,
  rentalMonthlyIncome: 0,
  rentalSaleAge: 0,
  homeValue: 0,
  homeGrowth: 0.03,
  downsizeAge: 0,
  downsizeReleaseFraction: 0,
  sippBalance: 80000,
  sippMonthlyContribution: 500,
  sippGrowth: 0.05,
  statePensionAnnual: DEFAULT_ASSUMPTIONS.statePensionAnnual,
  statePensionAge: DEFAULT_ASSUMPTIONS.statePensionAge,
  sippAccessAge: DEFAULT_ASSUMPTIONS.sippAccessAge,
  pensionStrategy: DEFAULT_ASSUMPTIONS.pensionStrategy,
  lifeExpectancyAge: DEFAULT_ASSUMPTIONS.lifeExpectancyAge,
};

interface FireFormProps {
  value: FireInputs;
  onChange: (inputs: FireInputs) => void;
}

/**
 * An info affordance. `label` names the thing being explained so the button
 * has an accessible name — an icon-only button with none reads as a bare
 * "button" to a screen reader, and there are a lot of these on one page.
 */
function Tooltip({ text, label }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={label ? `About ${label}` : "More information"}
        aria-describedby={id}
        className="text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      >
        <Info aria-hidden className="size-3.5" />
      </button>
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

export function Field({
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
        {tooltip && <Tooltip text={tooltip} label={label} />}
      </span>
      {children}
    </label>
  );
}

export function NumberInput({
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
        min={Number.isFinite(min) ? min : undefined}
        step={step}
        onFocus={(e) => e.target.select()}
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

/** Percentage input: stores a fraction (0.05) but displays a percentage (5). */
function PercentInput({
  value,
  onChange,
  suffix = "% / yr",
}: {
  value: number;
  onChange: (fraction: number) => void;
  suffix?: string;
}) {
  return (
    <NumberInput
      value={Math.round(value * 1000) / 10}
      onChange={(v) => onChange((v || 0) / 100)}
      suffix={suffix}
      step={0.5}
    />
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
        {dotClass && <span aria-hidden className={`size-2 rounded-full ${dotClass}`} />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {tooltip && <Tooltip text={tooltip} label={title} />}
      </div>
      <div className="mt-3 grid grid-cols-2 items-end gap-4">{children}</div>
    </div>
  );
}

/** A labelled, anchored group of related inputs — the deep-link targets used
 *  by the planner's "Complete your plan" checklist (#balances, #funds, …). */
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="font-display text-base font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/** True when the plan actually includes a home or a rental. */
function hasProperty(v: FireInputs): boolean {
  return (v.homeValue ?? 0) > 0 || (v.rentalValue ?? 0) > 0;
}

/** Collapsed-state label for Property, so it still says what's in there. */
function propertySummary(v: FireInputs): string {
  const parts: string[] = [];
  if ((v.homeValue ?? 0) > 0) parts.push("home");
  if ((v.rentalValue ?? 0) > 0) parts.push("rental");
  return parts.length ? parts.join(" + ") : "not included";
}

/** True when any statutory figure has been moved off its default. */
function hasCustomAssumptions(v: FireInputs): boolean {
  return (
    num(v.sippAccessAge, DEFAULT_ASSUMPTIONS.sippAccessAge) !==
      DEFAULT_ASSUMPTIONS.sippAccessAge ||
    num(v.statePensionAge, DEFAULT_ASSUMPTIONS.statePensionAge) !==
      DEFAULT_ASSUMPTIONS.statePensionAge ||
    num(v.statePensionAnnual, DEFAULT_ASSUMPTIONS.statePensionAnnual) !==
      DEFAULT_ASSUMPTIONS.statePensionAnnual ||
    num(v.lifeExpectancyAge, DEFAULT_ASSUMPTIONS.lifeExpectancyAge) !==
      DEFAULT_ASSUMPTIONS.lifeExpectancyAge ||
    num(v.inflationRate, DEFAULT_INFLATION_RATE) !== DEFAULT_INFLATION_RATE
  );
}

function assumptionsSummary(v: FireInputs): string {
  return hasCustomAssumptions(v) ? "customised" : "using defaults";
}

/** Module-level so the summary helpers above can share it with the component. */
function num(v: number | undefined, fallback: number): number {
  return v === undefined ? fallback : v;
}

export function FireForm({ value, onChange }: FireFormProps) {
  const set = <K extends keyof FireInputs>(key: K, next: FireInputs[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-8">
      <Section id="basics" title="Your basics" description="Ages and the income you're aiming for.">
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
            label="Retirement age"
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
          label="Target retirement income"
          tooltip="The take-home income you want to spend each year in retirement — after tax, in today's money. Your State Pension is already counted towards this."
        >
          <NumberInput
            value={value.targetAnnualIncome}
            onChange={(v) => set("targetAnnualIncome", v)}
            prefix="£"
            suffix="/ yr"
            step={500}
          />
        </Field>
      </Section>

      <Section
        id="balances"
        title="Balances & contributions"
        description="What you hold now and add each month. Leave any at £0."
      >
        {/* Dots match the chart's fixed account→hue binding: ISA ember,
            SIPP violet, GIA teal. Keep these in step with AssetTimelineChart. */}
        <Block
          title="ISA — tax-free bridge"
          dotClass="bg-data-1"
          tooltip="Individual Savings Account — 100% tax-free to withdraw at any age, so it's drawn first (and bridges you until your pension unlocks)."
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
          title="SIPP — the pension"
          dotClass="bg-data-2"
          tooltip="Self-Invested Personal Pension (plus any workplace pensions). Locked until your access age — 57 from 2028 — then 25% is tax-free and the rest is taxable income, topped up by your State Pension."
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
        </Block>

        <Block
          title="Other investments — GIA"
          dotClass="bg-data-3"
          tooltip="A General Investment Account: drawn after the ISA, with Capital Gains Tax on gains above the £3,000 exemption."
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
      </Section>

      <Section
        id="funds"
        title="Funds & fees"
        description="Pick a Vanguard UK fund for each pot to set a fee-aware growth rate, or type your own."
      >
        <FundBlock
          title="ISA fund"
          growth={value.isaGrowth}
          onPick={(g) => set("isaGrowth", g)}
          onGrowth={(v) => set("isaGrowth", v)}
        />
        <FundBlock
          title="SIPP fund"
          growth={value.sippGrowth}
          onPick={(g) => set("sippGrowth", g)}
          onGrowth={(v) => set("sippGrowth", v)}
        />
        <FundBlock
          title="GIA fund"
          growth={value.giaGrowth}
          onPick={(g) => set("giaGrowth", g)}
          onGrowth={(v) => set("giaGrowth", v)}
        />
      </Section>

      <Collapsible
        id="property"
        title="Property"
        description="Optional — a home you live in and/or a rental."
        summary={propertySummary(value)}
        defaultOpen={hasProperty(value)}
      >
        <Block
          title="Rental property"
          dotClass="bg-muted-foreground/60"
          tooltip="Rental income is taxed as income and offsets your target in retirement. Optionally sell it later — residential CGT applies and the net proceeds move into your GIA."
        >
          <Field label="Current value">
            <NumberInput
              value={num(value.rentalValue, 0)}
              onChange={(v) => set("rentalValue", v)}
              prefix="£"
            />
          </Field>
          <Field label="Monthly rent">
            <NumberInput
              value={num(value.rentalMonthlyIncome, 0)}
              onChange={(v) => set("rentalMonthlyIncome", v)}
              prefix="£"
            />
          </Field>
          <Field label="Expected growth">
            <PercentInput
              value={num(value.rentalGrowth, 0.03)}
              onChange={(v) => set("rentalGrowth", v)}
            />
          </Field>
          <Field
            label="Sell at age"
            tooltip="Leave at 0 to keep it. Otherwise it's sold at this age (residential CGT), proceeds go to your GIA, and the rent stops."
          >
            <NumberInput
              value={num(value.rentalSaleAge, 0)}
              onChange={(v) => set("rentalSaleAge", v)}
              suffix="0 = keep"
            />
          </Field>
        </Block>

        <Block
          title="Home you live in"
          tooltip="Counts as net worth and grows, but isn't drawn for income — unless you downsize, which releases tax-free cash (primary-residence relief) into your GIA."
        >
          <Field label="Current value">
            <NumberInput
              value={num(value.homeValue, 0)}
              onChange={(v) => set("homeValue", v)}
              prefix="£"
            />
          </Field>
          <Field label="Expected growth">
            <PercentInput
              value={num(value.homeGrowth, 0.03)}
              onChange={(v) => set("homeGrowth", v)}
            />
          </Field>
          <Field
            label="Downsize at age"
            tooltip="Leave at 0 for no downsizing. Otherwise release a share of the home's value as tax-free cash at this age."
          >
            <NumberInput
              value={num(value.downsizeAge, 0)}
              onChange={(v) => set("downsizeAge", v)}
              suffix="0 = never"
            />
          </Field>
          <Field label="Release">
            <PercentInput
              value={num(value.downsizeReleaseFraction, 0)}
              onChange={(v) => set("downsizeReleaseFraction", v)}
              suffix="%"
            />
          </Field>
        </Block>
      </Collapsible>

      <Section
        id="scenario"
        title="Withdrawals"
        description="How you take your pension, and any part-time work."
      >
        <Field
          label="Pension access"
          tooltip="Gradual (UFPLS): 25% of every withdrawal is tax-free — usually the most tax-efficient. Lump sum: take the 25% tax-free cash up front (it goes into your GIA)."
        >
          <PensionStrategyToggle
            value={value.pensionStrategy ?? DEFAULT_ASSUMPTIONS.pensionStrategy}
            onChange={(v) => {
              set("pensionStrategy", v);
              setChecklistFlag("withdrawals");
            }}
          />
        </Field>

        <Block
          title="Part-time work — Barista FIRE"
          dotClass="bg-muted-foreground/60"
          tooltip="Taxable part-time earnings in early retirement. They offset your target — so your pots draw down less — until the age you stop."
        >
          <Field label="Annual income">
            <NumberInput
              value={num(value.partTimeAnnualIncome, 0)}
              onChange={(v) => set("partTimeAnnualIncome", v)}
              prefix="£"
              suffix="/ yr"
              step={1000}
            />
          </Field>
          <Field
            label="Until age"
            tooltip="The age you stop the part-time work. Leave at 0 for none."
          >
            <NumberInput
              value={num(value.partTimeUntilAge, 0)}
              onChange={(v) => set("partTimeUntilAge", v)}
              suffix="0 = none"
            />
          </Field>
        </Block>

      </Section>

      <Collapsible
        id="assumptions"
        title="Statutory assumptions"
        description="Ages and figures set by the government, plus inflation. The defaults are the current 2026/27 rules — change them only if your situation differs."
        summary={assumptionsSummary(value)}
        defaultOpen={hasCustomAssumptions(value)}
      >
        <div className="grid grid-cols-2 items-end gap-4">
          <Field
            label="SIPP access age"
            tooltip="UK minimum pension age is 55 today, rising to 57 in April 2028 — the default here."
          >
            <NumberInput
              value={num(value.sippAccessAge, DEFAULT_ASSUMPTIONS.sippAccessAge)}
              onChange={(v) => set("sippAccessAge", v)}
              suffix="yrs"
              min={value.retirementAge}
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

        <div className="grid grid-cols-2 items-end gap-4">
          <Field
            label="State Pension age"
            tooltip="66 today, rising to 67 (2026–2028) then 68. Default is 67."
          >
            <NumberInput
              value={num(
                value.statePensionAge,
                DEFAULT_ASSUMPTIONS.statePensionAge,
              )}
              onChange={(v) => set("statePensionAge", v)}
              suffix="yrs"
            />
          </Field>
          <Field
            label="State Pension"
            tooltip="Full new State Pension for 2026/27 is £12,548/yr. Lower it if your National Insurance record is incomplete."
          >
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
        </div>

        <Field
          label="Inflation"
          tooltip="Your target income is in today's money and grows by this each year, so later withdrawals rise. Tax bands and the State Pension are held at 2026/27 levels (modelling fiscal drag). Set to 0% for a purely nominal projection."
        >
          <PercentInput
            value={num(value.inflationRate, DEFAULT_INFLATION_RATE)}
            onChange={(v) => set("inflationRate", v)}
          />
        </Field>
      </Collapsible>
    </div>
  );
}

/** ISA/SIPP/GIA fund picker + resulting net growth, for the Funds section. */
function FundBlock({
  title,
  growth,
  onPick,
  onGrowth,
}: {
  title: string;
  growth: number | undefined;
  onPick: (netGrowth: number) => void;
  onGrowth: (growth: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-4">
        <FundSelect growth={growth} onPick={onPick} />
        <Field label="Expected growth (net of fees)">
          <PercentInput value={growth ?? 0.05} onChange={onGrowth} />
        </Field>
      </div>
    </div>
  );
}

function PensionStrategyToggle({
  value,
  onChange,
}: {
  value: PensionStrategy;
  onChange: (v: PensionStrategy) => void;
}) {
  const opt = (v: PensionStrategy, label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        value === v
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
      {opt("gradual", "Gradual (25% spread)")}
      {opt("lump-sum", "Lump sum")}
    </div>
  );
}
