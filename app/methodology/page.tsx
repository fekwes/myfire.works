import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "Exactly what Fireworks models: the tax rules, statutory ages, GIA/CGT approach, Coast FIRE definition, and every simplifying assumption.",
  alternates: { canonical: "/methodology" },
};

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-border bg-surface p-6 sm:p-8"
    >
      <MonoLabel>{eyebrow}</MonoLabel>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

/**
 * Contents for the sections below. Keep in step with the `<Section>` ids — a
 * link here that doesn't match a section id goes nowhere.
 */
const CONTENTS = [
  { id: "projection", group: "The engine", title: "A year-by-year projection" },
  { id: "income-tax", group: "Tax", title: "Income Tax (UK & US)" },
  { id: "cgt", group: "Tax", title: "Capital Gains Tax" },
  { id: "property", group: "Assets", title: "Property" },
  { id: "sipp", group: "Pensions", title: "Retirement Accounts & Access Ages" },
  { id: "state-pension", group: "Pensions", title: "State Pension & Social Security" },
  { id: "confidence", group: "Modes", title: "Confidence (Monte Carlo)" },
  { id: "coast", group: "Modes", title: "Coast FIRE" },
  { id: "assumptions", group: "Caveats", title: "Assumptions & simplifications" },
] as const;

function Contents() {
  return (
    <nav
      aria-labelledby="contents-heading"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <h2
        id="contents-heading"
        className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"
      >
        Contents
      </h2>
      <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {CONTENTS.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="group flex items-baseline gap-2.5 rounded py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="font-mono text-[0.7rem] tabular text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="group-hover:underline group-hover:underline-offset-2">
                {s.title}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          How it works
        </span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Methodology
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Everything Fireworks models, and every corner it cuts. The calculation
          engine is a single, unit-tested TypeScript module — this page is the
          plain-English version of what it does.
        </p>
        <p className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <span aria-hidden>ⓘ</span>
          <span>
            Fireworks is an{" "}
            <Term>educational tool for learning and exploring</Term> UK FIRE
            scenarios. It is not financial, tax, or investment advice. Tax rules
            change and individual circumstances vary — always consult a
            qualified adviser before acting on any figure here.
          </span>
        </p>
      </div>

      <div className="mb-5">
        <Contents />
      </div>

      <div className="space-y-5">
        <Section
          id="projection"
          eyebrow="The engine"
          title="A year-by-year projection"
        >
          <p>
            The model simulates every year from your current age to your chosen
            life-expectancy horizon. Each year, balances grow by the assumed
            rate, contributions are added while you&apos;re still working, and —
            once retired — income is drawn from your pots to hit your{" "}
            <Term>target net (after-tax) income</Term>.
          </p>
          <p>Withdrawals follow a tax-efficient waterfall:</p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <Term>ISA</Term> first — completely tax-free.
            </li>
            <li>
              <Term>GIA</Term> next — Capital Gains Tax on the gains portion of
              each withdrawal.
            </li>
            <li>
              <Term>SIPP</Term> last — taxed as income, topped up by your State
              Pension once it starts.
            </li>
          </ol>
          <p>
            Because each pot is taxed differently, the engine solves for the{" "}
            <Term>gross</Term> withdrawal needed to leave you with the right net
            income after tax — using a bisection search rather than a hand-coded
            inverse of the progressive tax bands.
          </p>
        </Section>

        <Section
          id="income-tax"
          eyebrow="Tax"
          title="Income Tax (UK, Spain & US)"
        >
          <p>
            Taxable pension withdrawals, 401(k) distributions, Plan de Pensiones rescues, and government pensions/benefits are taxed as income year by year against statutory progressive tax bands.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-2 font-display text-base font-semibold text-foreground">UK System (2026/27)</h3>
              <ul className="list-disc space-y-1 pl-4 text-xs">
                <li>Personal Allowance: £12,570 (0%)</li>
                <li>Basic Rate: £12,571 to £50,270 (20%)</li>
                <li>Higher Rate: £50,271 to £125,140 (40%)</li>
                <li>Additional Rate: above £125,140 (45%)</li>
                <li>Allowance Taper: £1 lost per £2 income over £100,000</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-display text-base font-semibold text-foreground">Spain System (IRPF 2026)</h3>
              <ul className="list-disc space-y-1 pl-4 text-xs">
                <li>Mínimo Personal: 5.550 € (19% de bonificación)</li>
                <li>Tramo 1: 0 € a 12.450 € (19%)</li>
                <li>Tramo 2: 12.450 € a 20.200 € (24%)</li>
                <li>Tramo 3: 20.200 € a 35.200 € (30%)</li>
                <li>Tramo 4: 35.200 € a 60.000 € (37%)</li>
                <li>Tramo 5: 60.000 € a 300.000 € (45%) / &gt;300k € (47%)</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-display text-base font-semibold text-foreground">US Federal & State</h3>
              <ul className="list-disc space-y-1 pl-4 text-xs">
                <li>Standard Deduction: $15,000 (Single) / $30,000 (Joint)</li>
                <li>Federal Brackets: 10%, 12%, 22%, 24%, 32%, 35%, 37%</li>
                <li>State Income Tax: Selectable (0% for TX/FL/NV, up to 13.3% CA)</li>
                <li>Filing Status: Single vs Married Filing Jointly</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section
          id="cgt"
          eyebrow="Tax"
          title="Capital Gains Tax (GIA / Taxable Brokerage)"
        >
          <p>
            Unwrapped investment accounts (UK GIA / US Taxable Brokerage) realise capital gains on withdrawals.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>UK CGT</Term> — £3,000 annual allowance (2026/27). Gains above it are taxed at 18% (basic band) or 24% (higher band), stacked on top of income.
            </li>
            <li>
              <Term>US Capital Gains & NIIT</Term> — Long-Term Capital Gains brackets (0%, 15%, 20%) apply based on taxable income, plus 3.8% Net Investment Income Tax (NIIT) above MAGI thresholds ($200k Single / $250k Joint).
            </li>
          </ul>
        </Section>

        <Section id="property" eyebrow="Assets" title="Property">
          <p>
            Under <Term>Other investments</Term> you can add property. There are
            no mortgages in the model.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>Rental property</Term> — its value grows at your chosen
              rate, and the <Term>rental income is taxed as income</Term>
              (stacked with state benefits and pension drawdowns). Selling a rental property applies capital gains tax on the gain and moves net proceeds to your taxable brokerage account.
            </li>
            <li>
              <Term>Home you live in</Term> — counts as net worth and grows, but
              isn&apos;t drawn for income unless you <Term>downsize</Term>.
              Downsizing releases cash into your taxable brokerage with primary residence relief (UK Private Residence Relief / US Section 121 $250k/$500k exclusion).
            </li>
          </ul>
        </Section>

        <Section
          id="sipp"
          eyebrow="Pensions"
          title="Retirement Accounts & Access Ages"
        >
          <p>
            Retirement accounts have statutory access ages and unique tax rules:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>UK SIPP</Term> — Normal Minimum Pension Age is 57 (rising from 55). 25% of withdrawals are tax-free (up to £268,275 cap) via gradual UFPLS or initial lump sum.
            </li>
            <li>
              <Term>US 401(k) & Traditional IRA</Term> — Penalty-free access starts at age 59½. Withdrawals are taxed as ordinary income. Required Minimum Distributions (RMDs) apply starting at age 73/75.
            </li>
            <li>
              <Term>US Roth IRA & UK ISA</Term> — Completely tax-free growth and tax-free withdrawals at any time.
            </li>
          </ul>
        </Section>

        <Section
          id="state-pension"
          eyebrow="Pensions"
          title="State Pension & Social Security"
        >
          <p>
            From your state benefit age, guaranteed annual income is added and <Term>offsets your pot withdrawals</Term>:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>UK State Pension</Term> — Default is full new State Pension (£12,547.60/yr for 2026/27). Default claim age is 67.
            </li>
            <li>
              <Term>US Social Security</Term> — Based on average indexed earnings with standard bend points (90% / 32% / 15%). Default claim age is Full Retirement Age (67).
            </li>
          </ul>
        </Section>

        <Section
          id="confidence"
          eyebrow="Modes"
          title="Confidence (Monte Carlo)"
        >
          <p>
            The main projection assumes a steady return every year, which hides{" "}
            <Term>sequence-of-returns risk</Term> — a run of bad early years
            hurts far more than the same returns later. The{" "}
            <Term>Confidence</Term> tab instead runs 2,000 randomised market
            paths and reports the <Term>probability</Term> your plan survives.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Annual returns are drawn from a distribution set by your{" "}
              <Term>equity/bond allocation</Term> (equity ≈ 7% return / 16%
              volatility, bonds ≈ 2.5% / 6%, interpolated).
            </li>
            <li>
              Three withdrawal strategies are compared: <Term>flat</Term> (spend
              the target regardless) and <Term>guardrails ±5% / ±10%</Term>,
              which trim spending when markets are down and let it recover
              toward the target when they&apos;re up — flexibility that
              typically lifts the success rate substantially.
            </li>
            <li>
              Simplifications: the invested pots are modelled as one combined
              portfolio, guaranteed income is treated as net, and pot
              withdrawals carry a single effective tax rate taken from your
              deterministic plan. It&apos;s a confidence estimate, not a
              guarantee.
            </li>
          </ul>
        </Section>

        <Section id="coast" eyebrow="Modes" title="Coast FIRE">
          <p>
            You are <Term>Coast FIRE</Term> if your current pots, with{" "}
            <Term>no further contributions</Term>, would still grow enough to
            fund your target income for life. The planner&apos;s Coast mode
            reports:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>Coast number</Term> — the minimum invested today (no
              contributions) that sustains the plan, found by bisection on the
              same drawdown engine.
            </li>
            <li>
              <Term>Surplus / gap</Term> — how far your current pots are above
              or below that number.
            </li>
            <li>
              <Term>Coast age</Term> — the earliest age you could stop
              contributing and still coast, found by re-running the plan from
              the balances you&apos;d have reached by each age.
            </li>
          </ul>
        </Section>

        <Section
          id="assumptions"
          eyebrow="Caveats"
          title="Assumptions & simplifications"
        >
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Pots grow at a <Term>flat nominal growth rate per pot</Term> each
              year. Your target income is quoted in today&apos;s money and grown
              by an <Term>inflation rate</Term> (default 2.5%), so later
              withdrawals rise; the planner&apos;s{" "}
              <Term>Today&apos;s £ / Future £</Term> toggle switches the
              projection between the two. The State Pension rises with the same
              inflation rate (its triple-lock behaviour), while income-tax bands
              are held at 2026/27 levels, so <Term>fiscal drag</Term> is
              captured. The <Term>Confidence</Term> tab adds randomness (see
              below).
            </li>
            <li>Rest-of-UK tax bands only — Scottish rates aren&apos;t modelled.</li>
            <li>
              GIA CGT is simplified (no embedded starting gain; no dividend tax).
            </li>
            <li>
              Contributions stop at your retirement age. Optional{" "}
              <Term>part-time (Barista FIRE) income</Term> can be added — taxable
              earnings from retirement until an age you choose, offsetting your
              target so the pots draw down less early on.
            </li>
            <li>
              Onboarding asks three things: your{" "}
              <Term>annual spending target</Term>, your ages, and{" "}
              <Term>how you plan to get there</Term> (retire fully, coast, or go
              part-time first). Spending targets use the{" "}
              <Term>UK PLSA Retirement Living Standards 2025</Term> (single,
              excluding housing): Minimum £13,400, Moderate £31,700, Comfortable
              £43,900 — or your own figure, and all editable afterwards. There is
              no separate &ldquo;Lean / Fat FIRE&rdquo; question: those differ
              only by the spending target you set here.
            </li>
            <li>
              2026/27 tax figures throughout (income tax and CGT thresholds are
              frozen; State Pension uses the confirmed +4.8% triple-lock rise).
            </li>
            <li>Single-person plan; no partner or joint modelling.</li>
            <li>
              All figures are estimates in today&apos;s terms and will diverge
              from reality — treat them as a way to compare scenarios, not
              predict outcomes.
            </li>
          </ul>
        </Section>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
        <ButtonLink href="/planner">← Back to the planner</ButtonLink>
        <a
          href="https://github.com/fekwes/myfire.works"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View the source on GitHub
        </a>
      </div>
    </div>
  );
}
