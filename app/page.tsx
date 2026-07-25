import { Receipt, Route, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LandingCta } from "@/components/LandingCta";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";

const FEATURES = [
  {
    Icon: Receipt,
    title: "The tax you'll actually pay",
    body: "Income-tax bands, the personal-allowance taper, CGT above the £3,000 exemption and the 25% tax-free pension — solved year by year, not hand-waved.",
  },
  {
    Icon: Route,
    title: "The bridge years",
    body: "Watch your ISA and GIA carry you from the day you stop working to the age your SIPP unlocks — the gap most calculators quietly skip.",
  },
  {
    Icon: ShieldCheck,
    title: "Confidence, not a lucky guess",
    body: "Monte Carlo runs stress-test the plan against bad markets, so one good decade isn't mistaken for a safe one.",
  },
];

export default function Landing() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero — asymmetric: copy left, a real computed plan preview right.
          A single ember "launch trail" draws in behind it on load. */}
      <section className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 hidden h-full w-full lg:block"
          viewBox="0 0 1200 560"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="hero-trail-stroke" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0} />
              <stop offset="45%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <path
            className="hero-trail"
            d="M-40 540 C 260 520, 520 470, 720 360 C 900 262, 1010 190, 1120 96"
            fill="none"
            stroke="url(#hero-trail-stroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
          />
          <g className="spark-pop">
            <path
              d="M1120 74C1124 92 1124 92 1142 96C1124 100 1124 100 1120 118C1116 100 1116 100 1098 96C1116 92 1116 92 1120 74Z"
              fill="var(--brand)"
              opacity={0.85}
            />
          </g>
        </svg>

        <div className="relative z-10 lg:col-span-7">
          <span className="landing-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            UK FIRE planner · 2026/27 tax
          </span>
          <h1 className="landing-rise mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance [animation-delay:60ms] sm:text-[3.5rem]">
            Know your number. Know when.
            <br />
            Know{" "}
            <span className="relative whitespace-nowrap text-primary">
              it&apos;ll hold
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-brand/70" />
            </span>
            .
          </h1>
          <p className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg">
            Fireworks models the whole drawdown — ISA, GIA, SIPP, State Pension
            and property — with the UK tax you&apos;ll actually pay. No
            spreadsheet, no hand-waving.
          </p>
          <div className="landing-rise [animation-delay:180ms]">
            <LandingCta />
          </div>
        </div>

        <div className="relative z-10 lg:col-span-5">
          <LandingHeroPreview />
        </div>
      </section>

      {/* Differentiators — editorial, not three identical cards. */}
      <section className="mt-24 grid grid-cols-1 gap-10 border-t border-border pt-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <h2 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Most calculators stop at a pot size.
            <span className="text-muted-foreground"> This one keeps going.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            A single &ldquo;you need £1.2M&rdquo; hides everything that matters —
            when you can actually access the money, and what the taxman takes on
            the way out. Fireworks models the mechanics.
          </p>
        </div>

        <ul className="lg:col-span-7">
          {FEATURES.map((f, i) => (
            <li
              key={f.title}
              className={`flex gap-5 py-6 ${
                i !== FEATURES.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-brand/10 text-primary">
                <f.Icon className="size-[1.15rem]" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-16 flex max-w-2xl items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <span aria-hidden>ⓘ</span>
        <span>
          Fireworks is an educational tool for exploring UK FIRE scenarios — not
          financial advice. Figures are estimates from simplified assumptions.{" "}
          <Link
            href="/methodology"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            See exactly how it&apos;s modelled
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
