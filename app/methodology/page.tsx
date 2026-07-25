import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "Exactly what Fireworks models: the UK tax rules, statutory ages, GIA/CGT approach, Coast FIRE definition, and every simplifying assumption.",
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
          title="UK Income Tax (2026/27)"
        >
          <p>
            SIPP drawdown and the State Pension are taxed as income against the
            rest-of-UK bands. Scottish rates are not modelled.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-medium text-foreground">Band</th>
                  <th className="py-2 pr-4 font-medium text-foreground">
                    Income
                  </th>
                  <th className="py-2 font-medium text-foreground">Rate</th>
                </tr>
              </thead>
              <tbody className="tabular">
                <tr className="border-b border-border">
                  <td className="py-2 pr-4">Personal allowance</td>
                  <td className="py-2 pr-4">up to £12,570</td>
                  <td className="py-2">0%</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4">Basic</td>
                  <td className="py-2 pr-4">to £50,270</td>
                  <td className="py-2">20%</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4">Higher</td>
                  <td className="py-2 pr-4">to £125,140</td>
                  <td className="py-2">40%</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Additional</td>
                  <td className="py-2 pr-4">above £125,140</td>
                  <td className="py-2">45%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The <Term>personal allowance taper</Term> is included: for every £2
            of income above £100,000, £1 of allowance is lost, reaching zero at
            £125,140.
          </p>
        </Section>

        <Section
          id="cgt"
          eyebrow="Tax"
          title="Capital Gains Tax on the GIA"
        >
          <p>
            A General Investment Account has no tax wrapper, so selling units to
            fund income can realise a capital gain. Fireworks models this in a
            simplified form:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Each withdrawal realises a gain proportional to the pot&apos;s{" "}
              <Term>embedded gain</Term> (value minus cost basis).
            </li>
            <li>
              The <Term>£3,000 annual exempt amount</Term> (2026/27) is applied
              each year.
            </li>
            <li>
              Gains above it are taxed at <Term>18%</Term> within the basic-rate
              band and <Term>24%</Term> above it (non-property rates from 30 Oct
              2024), stacked on top of your income that year.
            </li>
          </ul>
          <p>
            Two deliberate simplifications: the starting GIA balance is assumed
            to carry <Term>no embedded gain</Term> (so early CGT is
            understated), and <Term>dividend tax is not modelled</Term>.
          </p>
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
              (stacked with the State Pension and any SIPP drawdown), offsetting
              your target in retirement. You can optionally sell it at a chosen
              age: residential CGT (18%/24%) is charged on the gain, the net
              proceeds move into your GIA, and the rent then stops.
            </li>
            <li>
              <Term>Home you live in</Term> — counts as net worth and grows, but
              isn&apos;t drawn for income unless you <Term>downsize</Term>.
              Downsizing at a chosen age releases a share of its value as{" "}
              <Term>tax-free cash</Term> (private-residence relief) into your
              GIA. The starting rental value is assumed to carry no embedded
              gain, same as the GIA.
            </li>
          </ul>
        </Section>

        <Section
          id="sipp"
          eyebrow="Pensions"
          title="SIPP: access age & how you take the 25%"
        >
          <p>
            You can take <Term>25% of your pension tax-free</Term>, up to a cap
            of <Term>£268,275</Term> (the Lump Sum Allowance). Fireworks lets you
            choose how, under <Term>Lifestyle scenario → Pension access</Term>:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Term>Gradual (UFPLS)</Term> — the default. 25% of every
              withdrawal is tax-free and the other 75% is taxed as income. This
              spreads the tax-free allowance and is usually the most efficient.
            </li>
            <li>
              <Term>Lump sum</Term> — take the whole 25% as cash up front. Since
              it can&apos;t fit in an ISA (£20k/yr limit), Fireworks places it in
              your GIA; the rest of the pension is then fully taxable on
              drawdown.
            </li>
          </ul>
          <p>
            The UK <Term>Normal Minimum Pension Age</Term> is 55 today, rising to{" "}
            <Term>57 on 6 April 2028</Term>. Early retirees modelled here reach
            it after 2028, so the default is 57 — and the SIPP can&apos;t be
            touched before it (bridge years must run on ISA/GIA).
          </p>
        </Section>

        <Section
          id="state-pension"
          eyebrow="Pensions"
          title="State Pension"
        >
          <p>
            From your State Pension age, a flat annual income is added and{" "}
            <Term>offsets your pot withdrawals</Term> — the pots only fund the
            rest of the target, so they last longer once it starts. The default
            is the <Term>full new State Pension</Term> for 2026/27,
            £12,547.60/yr (£241.30/week, +4.8% triple lock) — lower it if your
            National Insurance record is incomplete.
          </p>
          <p>
            State Pension age is 66 today, rising to 67 (2026–2028) and 68
            (2044–2046). The default is 67, editable in the planner.
          </p>
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
              Onboarding is <Term>persona-first</Term>: the quiz asks a FIRE
              goal, a lifestyle, and your ages. Lifestyle targets use the{" "}
              <Term>UK PLSA Retirement Living Standards 2025</Term> (single,
              excluding housing): Minimum £13,400, Moderate £31,700, Comfortable
              £43,900 — all editable afterwards.
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
        <Link
          href="/planner"
          className="rounded-full bg-foreground px-4 py-2 font-semibold text-background transition-opacity hover:opacity-90"
        >
          ← Back to the planner
        </Link>
        <a
          href="https://github.com/fekwes/onfire"
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
