"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { PortfolioEditor, type ReuseSource } from "@/components/PortfolioEditor";
import { holdingsNetGrowth } from "@/lib/assets";
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
  rentalGrowth: 0.025,
  rentalMonthlyIncome: 0,
  rentalSaleAge: 0,
  homeValue: 0,
  homeGrowth: 0.025,
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
  /** Which section is visible — the finances page shows one tab at a time. */
  activeSection: string;
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

/**
 * A correction shown under a field the plan can't use as typed. The engine
 * clamps rather than crashing, so this says what it clamped to — the figure on
 * screen and the figure being projected would otherwise disagree silently.
 */
function FieldNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-1.5 text-xs leading-relaxed text-danger">
      {children}
    </p>
  );
}

/** An on/off switch for a part of the plan that's off by default, so "none"
 *  is something you say once rather than by zeroing every field it owns. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        {checked ? "On" : "Off"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${
          checked ? "bg-foreground" : "bg-border"
        }`}
      >
        <span
          aria-hidden
          className={`size-4 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </span>
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
  // While the field is being edited it holds raw text, so clearing it to type
  // a new number shows an empty box — but only finite values ever reach the
  // plan. Emitting the NaN from an empty input used to poison every derived
  // figure ("£NaN") and persist as null.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(value) : "");

  return (
    <div className="flex items-center rounded-lg border border-border bg-background transition-colors hover:border-muted-foreground/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      {prefix && (
        <span className="pl-3 text-sm text-muted-foreground">{prefix}</span>
      )}
      <input
        type="number"
        inputMode="decimal"
        value={shown}
        min={Number.isFinite(min) ? min : undefined}
        step={step}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setDraft(e.target.value);
          const next = e.target.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
        // Blur commits: drop the draft so the field shows the stored value
        // again (an abandoned empty field reverts rather than wiping the plan).
        onBlur={() => setDraft(null)}
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
  action,
  note,
  footer,
  children,
}: {
  title: string;
  dotClass?: string;
  tooltip?: string;
  /** Right-aligned control in the header, e.g. the switch that turns the
   *  whole block on. When it's off the block renders header-only. */
  action?: ReactNode;
  /** One line under the header — what the block does while it's switched off. */
  note?: ReactNode;
  /** Full-width content below the two-column input grid (e.g. the portfolio). */
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <div className="flex items-center gap-1.5">
        {dotClass && <span aria-hidden className={`size-2 rounded-full ${dotClass}`} />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {tooltip && <Tooltip text={tooltip} label={title} />}
        {action && <span className="ml-auto pl-2">{action}</span>}
      </div>
      {note && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}
      {children && (
        <div className="mt-3 grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
          {children}
        </div>
      )}
      {footer}
    </div>
  );
}

/** A labelled, anchored group of related inputs — the deep-link targets used
 *  by the planner's "Complete your plan" checklist (#balances, #funds, …). */
function Section({
  id,
  title,
  description,
  hidden,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} hidden={hidden} className="space-y-4">
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

/** Small helper: a value or its fallback when undefined. */
function num(v: number | undefined, fallback: number): number {
  return v === undefined ? fallback : v;
}

/**
 * Growth + optional fund portfolio for one wrapper. A single "Expected growth"
 * figure is shown until a portfolio is defined; once it is, growth is derived
 * from the holdings (net of fees) and the plain figure gives way to the editor.
 */
function WrapperPortfolio({
  label,
  growth,
  holdings,
  onGrowth,
  onPortfolio,
  reuseSources,
}: {
  label: string;
  growth: number | undefined;
  holdings: FireInputs["isaHoldings"];
  onGrowth: (g: number) => void;
  onPortfolio: (h: FireInputs["isaHoldings"]) => void;
  reuseSources: ReuseSource[];
}) {
  const hasHoldings = !!holdings && holdings.length > 0;
  return (
    <>
      {!hasHoldings && (
        <div className="mt-4">
          <Field label="Expected growth (net of fees)">
            <PercentInput value={num(growth, 0.05)} onChange={onGrowth} />
          </Field>
        </div>
      )}
      <PortfolioEditor
        label={label}
        holdings={holdings}
        onChange={onPortfolio}
        reuseSources={reuseSources}
      />
    </>
  );
}

export function FireForm({ value, onChange, activeSection }: FireFormProps) {
  const set = <K extends keyof FireInputs>(key: K, next: FireInputs[K]) =>
    onChange({ ...value, [key]: next });

  // The other wrappers whose portfolio can be copied into this one.
  const reuseFor = (self: "isa" | "sipp" | "gia"): ReuseSource[] =>
    (
      [
        { id: "isa", label: "ISA", holdings: value.isaHoldings },
        { id: "sipp", label: "SIPP", holdings: value.sippHoldings },
        { id: "gia", label: "GIA", holdings: value.giaHoldings },
      ] as const
    )
      .filter((w) => w.id !== self && w.holdings && w.holdings.length > 0)
      .map((w) => ({ id: w.id, label: w.label, holdings: w.holdings ?? [] }));

  // Part-time work is off unless it's earning something. The engine has always
  // read "0" as "none", so the switch stays derived from the figures rather
  // than adding a flag that every share link and saved plan would have to
  // carry. Switching off remembers what was typed, so it comes back intact.
  const partTimeOn =
    (value.partTimeAnnualIncome ?? 0) > 0 || (value.partTimeUntilAge ?? 0) > 0;
  const [partTimeMemo, setPartTimeMemo] = useState<{
    income: number;
    untilAge: number;
  } | null>(null);

  const togglePartTime = (on: boolean) => {
    if (!on) {
      setPartTimeMemo({
        income: value.partTimeAnnualIncome ?? 0,
        untilAge: value.partTimeUntilAge ?? 0,
      });
      onChange({ ...value, partTimeAnnualIncome: 0, partTimeUntilAge: 0 });
      return;
    }
    onChange({
      ...value,
      partTimeAnnualIncome: partTimeMemo?.income || 10000,
      // Default to five years of it — an "until" age before retirement would
      // mean the work is over before it starts.
      partTimeUntilAge: partTimeMemo?.untilAge || value.retirementAge + 5,
    });
  };

  // The engine floors the plan's end age at `currentAge` rather than projecting
  // no years at all, so this says so instead of leaving the field and the
  // projection quietly disagreeing.
  const planEndsTooEarly =
    num(value.lifeExpectancyAge, DEFAULT_ASSUMPTIONS.lifeExpectancyAge) <
    value.currentAge;

  // Set a wrapper's holdings and its derived growth in ONE update — two separate
  // set() calls would each read the same stale `value` and clobber each other.
  const setPortfolio = (
    hKey: "isaHoldings" | "sippHoldings" | "giaHoldings",
    gKey: "isaGrowth" | "sippGrowth" | "giaGrowth",
    h: FireInputs["isaHoldings"],
  ) =>
    onChange({
      ...value,
      [hKey]: h,
      [gKey]: h && h.length > 0 ? holdingsNetGrowth(h) : value[gKey],
    });

  return (
    <div>
      <Section
        id="basics"
        title="Your basics"
        description="Ages and the income you're aiming for."
        hidden={activeSection !== "basics"}
      >
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
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

        <Block
          title="Coast FIRE"
          tooltip="Stop saving early and let your pots grow on their own."
        >
          <Field
            label="Stop contributions at age"
            tooltip="Age at which you stop adding to your pots. Leave at 0 to keep contributing until retirement."
          >
            <NumberInput
              value={num(value.contributionsUntilAge, 0)}
              onChange={(v) => set("contributionsUntilAge", v || undefined)}
              suffix="0 = keep going"
            />
          </Field>
        </Block>

        <Block
          title="Part-time transition"
          tooltip="Go part-time in early retirement to bridge the gap to your State Pension."
        >
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
            <Field label="Part-time until age">
              <NumberInput
                value={num(value.partTimeUntilAge, 0)}
                onChange={(v) => set("partTimeUntilAge", v)}
                suffix="0 = none"
              />
            </Field>
            <Field label="Part-time income">
              <NumberInput
                value={num(value.partTimeAnnualIncome, 0)}
                onChange={(v) => set("partTimeAnnualIncome", v)}
                prefix="£"
                step={1000}
              />
            </Field>
          </div>
        </Block>
      </Section>

      <Section
        id="balances"
        title="Balances & contributions"
        hidden={activeSection !== "balances"}
      >
        {/* Dots match the chart's fixed account→hue binding: ISA ember,
            SIPP violet, GIA teal. Keep these in step with AssetTimelineChart. */}
        <Block
          title="ISA — tax-free bridge"
          dotClass="bg-data-1"
          tooltip="Individual Savings Account — 100% tax-free to withdraw at any age, so it's drawn first (and bridges you until your pension unlocks)."
          footer={
            <WrapperPortfolio
              label="ISA"
              growth={value.isaGrowth}
              holdings={value.isaHoldings}
              onGrowth={(v) => set("isaGrowth", v)}
              onPortfolio={(h) => setPortfolio("isaHoldings", "isaGrowth", h)}
              reuseSources={reuseFor("isa")}
            />
          }
        >
          <Field label="Current balance">
            <NumberInput
              value={value.isaBalance ?? 0}
              onChange={(v) => set("isaBalance", v)}
              prefix="£"
            />
          </Field>
          <Field label="Monthly contribution">
            <NumberInput
              value={value.isaMonthlyContribution ?? 0}
              onChange={(v) => set("isaMonthlyContribution", v)}
              prefix="£"
            />
          </Field>
        </Block>

        <Block
          title="SIPP — the pension"
          dotClass="bg-data-2"
          tooltip="Self-Invested Personal Pension (plus any workplace pensions). Locked until your access age — 57 from 2028 — then 25% is tax-free and the rest is taxable income, topped up by your State Pension."
          footer={
            <WrapperPortfolio
              label="SIPP"
              growth={value.sippGrowth}
              holdings={value.sippHoldings}
              onGrowth={(v) => set("sippGrowth", v)}
              onPortfolio={(h) => setPortfolio("sippHoldings", "sippGrowth", h)}
              reuseSources={reuseFor("sipp")}
            />
          }
        >
          <Field label="Current balance">
            <NumberInput
              value={value.sippBalance ?? 0}
              onChange={(v) => set("sippBalance", v)}
              prefix="£"
            />
          </Field>
          <Field label="Monthly contribution">
            <NumberInput
              value={value.sippMonthlyContribution ?? 0}
              onChange={(v) => set("sippMonthlyContribution", v)}
              prefix="£"
            />
          </Field>
        </Block>

        <Block
          title="Other investments — GIA"
          dotClass="bg-data-3"
          tooltip="A General Investment Account: drawn after the ISA, with Capital Gains Tax on gains above the £3,000 exemption."
          footer={
            <WrapperPortfolio
              label="GIA"
              growth={value.giaGrowth}
              holdings={value.giaHoldings}
              onGrowth={(v) => set("giaGrowth", v)}
              onPortfolio={(h) => setPortfolio("giaHoldings", "giaGrowth", h)}
              reuseSources={reuseFor("gia")}
            />
          }
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
        id="property"
        title="Property"
        description="Optional — a home you live in and/or a rental."
        hidden={activeSection !== "property"}
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
              value={num(value.rentalGrowth, 0.025)}
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
              value={num(value.homeGrowth, 0.025)}
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
      </Section>

      <Section
        id="scenario"
        title="Withdrawals"
        description="How you take your pension, and any part-time work."
        hidden={activeSection !== "scenario"}
      >
        <Field
          label="Pension access"
          tooltip="Gradual (UFPLS): 25% of every withdrawal is tax-free — usually the most tax-efficient. Lump sum: take the 25% tax-free cash up front (it goes into your GIA)."
        >
          <PensionStrategyToggle
            value={value.pensionStrategy ?? DEFAULT_ASSUMPTIONS.pensionStrategy}
            onChange={(v) => {
              set("pensionStrategy", v);
            }}
          />
        </Field>

        <Block
          title="Part-time work — Barista FIRE"
          dotClass="bg-muted-foreground/60"
          tooltip="Taxable part-time earnings in early retirement. They offset your target — so your pots draw down less — until the age you stop."
          action={
            <Switch
              checked={partTimeOn}
              onChange={togglePartTime}
              label="Part-time work"
            />
          }
          note={
            partTimeOn ? undefined : "No part-time earnings in your projection."
          }
        >
          {partTimeOn && (
            <>
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
                tooltip="The age you stop the part-time work — after it, your pots fund the whole target."
              >
                <NumberInput
                  value={num(value.partTimeUntilAge, 0)}
                  onChange={(v) => set("partTimeUntilAge", v)}
                  suffix="yrs"
                  min={value.retirementAge}
                />
              </Field>
            </>
          )}
        </Block>

      </Section>

      <Section
        id="assumptions"
        title="Statutory assumptions"
        description="Ages and figures set by the government, plus inflation. The defaults are the current 2026/27 rules — change them only if your situation differs."
        hidden={activeSection !== "assumptions"}
      >
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
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
              min={value.currentAge}
            />
          </Field>
        </div>
        {/* Outside the grid: a note inside a cell would stretch its row and
            pull the neighbouring field out of line. */}
        {planEndsTooEarly && (
          <FieldNote>
            &ldquo;Plan lasts to&rdquo; can&apos;t be earlier than your current
            age. Projecting to age {value.currentAge} until you raise it.
          </FieldNote>
        )}

        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
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
      </Section>
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
