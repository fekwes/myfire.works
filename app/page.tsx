import type { Metadata } from "next";
import { LandingFeatures } from "@/components/LandingFeatures";
import { LandingHero } from "@/components/LandingHero";
import { LaunchPad, LaunchTrail } from "@/components/LaunchTrail";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Fireworks — Free US & UK FIRE & Early Retirement Planner",
  description:
    "Model your Financial Independence, Retire Early plan across 401(k), Roth IRA, ISA, SIPP, Social Security, State Pension and property — with exact US & UK tax rules, Coast FIRE and Monte Carlo confidence.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Fireworks",
      description:
        "FIRE planner: model drawdown across 401(k), Roth IRA, ISA, SIPP, Social Security, State Pension and property with the tax you'll actually pay.",
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "Fireworks — FIRE & Early Retirement Planner",
      url: `${siteUrl}/`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Model your Financial Independence, Retire Early plan across 401(k), IRA, ISA, SIPP, Social Security, State Pension and property — with exact tax rules, Coast FIRE and Monte Carlo confidence.",
      inLanguage: "en",
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Fireworks calculate early retirement tax?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Fireworks solves year-by-year tax brackets (US Federal & State or UK HMRC progressive bands), capital gains exemptions, standard deductions, and penalty-free retirement access ages to output your true net take-home spending.",
          },
        },
        {
          "@type": "Question",
          name: "Does Fireworks support both US and UK FIRE plans?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Fireworks includes dedicated country engines for both the United States (401k, Roth IRA, Taxable Brokerage, Social Security) and United Kingdom (SIPP, ISA, GIA, State Pension).",
          },
        },
        {
          "@type": "Question",
          name: "Is my financial data kept private?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, 100%. All plan calculations and data are stored locally on your device in your browser's local storage. No financial accounts or data are stored on external servers.",
          },
        },
      ],
    },
  ],
};

export default function Landing() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <LaunchTrail />
        <LandingHero />
        <LandingFeatures />
        
        {/* Ignition LaunchPad — Fireworks & Wallet celebratory ignition trigger */}
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-brand font-semibold mb-2">
            Click to launch celebratory fireworks spark 🎆
          </p>
          <LaunchPad />
        </div>
      </div>
    </>
  );
}
