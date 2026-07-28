import type { Metadata } from "next";
import { LandingFeatures } from "@/components/LandingFeatures";
import { LandingHero } from "@/components/LandingHero";
import { siteUrl } from "@/lib/site-url";

// Self-referencing canonical. Vercel serves identical content on the production
// alias, the git-branch alias and every per-deploy URL; without this, search
// engines treat them as duplicates and split ranking signals. Resolves against
// `metadataBase`, so it follows NEXT_PUBLIC_SITE_URL automatically.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Structured data — a free finance web app. Makes the result eligible for
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
        "FIRE planner: model drawdown across ISA, GIA, SIPP, 401(k), Roth IRA, State Pension and property with the tax you'll actually pay.",
      inLanguage: "en-GB",
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
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      description:
        "Model your Financial Independence, Retire Early plan across ISA, GIA, SIPP, 401(k), Roth IRA, State Pension and property — with the tax you'll actually pay, Coast FIRE and Monte Carlo confidence.",
      inLanguage: "en-GB",
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
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {/* Client-side, region-aware hero component */}
        <LandingHero />

        {/* Feature section with value props, UK/US comparison table, and trust/disclaimer box */}
        <LandingFeatures />
      </div>
    </>
  );
}
