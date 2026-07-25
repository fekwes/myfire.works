import type { Metadata } from "next";
import { Receipt, Route, ShieldCheck } from "lucide-react";
import { Term } from "@/components/Glossary";
import { LandingCta } from "@/components/LandingCta";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { siteUrl } from "@/lib/site-url";

// Self-referencing canonical. Vercel serves identical content on the production
// alias, the git-branch alias and every per-deploy URL; without this, search
// engines treat them as duplicates and split ranking signals. Resolves against
// `metadataBase`, so it follows NEXT_PUBLIC_SITE_URL automatically.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Structured data — a free UK finance web app. Makes the result eligible for
// richer search presentation. Kept in sync with the layout's description.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Fireworks",
      description:
        "UK FIRE planner: model drawdown across ISA, GIA, SIPP, State Pension and property with correct 2026/27 tax.",
      inLanguage: "en-GB",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "Fireworks — UK FIRE Planner",
      url: `${siteUrl}/`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      description:
        "Model your UK Financial Independence, Retire Early plan across ISA, GIA, SIPP, State Pension and property — with correct 2026/27 tax, Coast FIRE and Monte Carlo confidence.",
      inLanguage: "en-GB",
    },
  ],
};

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

// The signature firework. A launch trail arcs up from lower-left and bursts in
// open sky above the hero — the burst centre sits high enough (y≈92 of 560) to
// clear the top of the preview card, so it reads instead of hiding behind it.
const BURST = { x: 838, y: 66 };
const SPARK_RAYS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const inner = 15;
  const outer = 30 + (i % 3) * 11;
  return {
    x1: +(BURST.x + Math.cos(angle) * inner).toFixed(1),
    y1: +(BURST.y + Math.sin(angle) * inner).toFixed(1),
    x2: +(BURST.x + Math.cos(angle) * outer).toFixed(1),
    y2: +(BURST.y + Math.sin(angle) * outer).toFixed(1),
    tip: i % 2 === 0,
    violet: i % 3 === 0,
  };
});

export default function Landing() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero — asymmetric: copy left, a real computed plan preview right.
          A single ember "launch trail" draws in behind it on load. */}
      <section className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block"
          viewBox="0 0 1200 560"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="hero-trail-stroke" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0} />
              <stop offset="45%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.7} />
            </linearGradient>
            <radialGradient id="hero-burst-glow">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
              <stop offset="45%" stopColor="var(--primary)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Soft bloom behind the burst so it reads even over the preview. */}
          <circle
            className="spark-pop"
            cx={BURST.x}
            cy={BURST.y}
            r={96}
            fill="url(#hero-burst-glow)"
          />

          {/* Launch trail — the growth curve rising to the burst. */}
          <path
            className="hero-trail"
            d={`M-40 540 C 220 512, 470 452, 632 336 C 730 266, 792 178, ${BURST.x} ${BURST.y}`}
            fill="none"
            stroke="url(#hero-trail-stroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
          />

          {/* The burst — radiating spark rays, glinting tips, a bright core. */}
          <g className="spark-pop">
            {SPARK_RAYS.map((r, i) => (
              <g key={i}>
                <line
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke={r.violet ? "var(--accent)" : "var(--brand)"}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                {r.tip && <circle cx={r.x2} cy={r.y2} r={1.7} fill="var(--brand)" />}
              </g>
            ))}
            <circle cx={BURST.x} cy={BURST.y} r={4.5} fill="var(--brand)" />
            <circle
              cx={BURST.x}
              cy={BURST.y}
              r={8.5}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={1}
              opacity={0.5}
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
            <Term term="FIRE">FIRE</Term> — financial independence, retire early
            — is having enough invested that work becomes optional. Fireworks
            models the whole drawdown (<Term>ISA</Term>, <Term>GIA</Term>,{" "}
            <Term>SIPP</Term>, State Pension and property) with the UK tax
            you&apos;ll actually pay. No spreadsheet, no hand-waving.
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
      </div>
    </>
  );
}
