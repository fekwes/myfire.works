import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import { AuthButton } from "@/components/AuthButton";
import { AuthProvider } from "@/components/AuthProvider";
import { FooterCredit } from "@/components/FooterCredit";
import { HeaderLogo } from "@/components/HeaderLogo";
import { MobileNav, Nav } from "@/components/Nav";
import { PlanProvider } from "@/components/PlanProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RegionToggle } from "@/components/RegionToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const description =
  "Model your Financial Independence, Retire Early plan across ISA, GIA, SIPP, State Pension and property — with the tax you'll actually pay, Coast FIRE and Monte Carlo confidence.";

const title = "Fireworks — FIRE & Early Retirement Planner";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Fireworks",
  },
  description,
  applicationName: "Fireworks",
  keywords: [
    "FIRE",
    "financial independence",
    "retire early",
    "ISA",
    "SIPP",
    "pension drawdown",
    "State Pension",
    "Coast FIRE",
    "retirement planner",
  ],
  authors: [{ name: "fekwes", url: "https://github.com/fekwes" }],
  openGraph: {
    type: "website",
    siteName: "Fireworks",
    title,
    description,
    url: siteUrl,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Dark is the showcase theme (docs/DESIGN.md) — a visitor with no stored
            preference gets it regardless of their OS setting, so a first visit
            always lands on the night sky. `enableSystem` is off deliberately:
            ThemeToggle only ever sets "light" or "dark", so a reachable "system"
            state would be one no control can produce or describe. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <PlanProvider>
            <div aria-hidden className="app-backdrop" />
            <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                <HeaderLogo />
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <Nav />
                  <RegionToggle />
                  <AuthButton />
                  <ThemeToggle />
                </div>
              </div>
              <div className="mx-auto w-full max-w-6xl">
                <MobileNav />
              </div>
            </header>
            <main className="flex flex-1 flex-col">{children}</main>
            <footer className="mt-16 border-t border-border bg-surface/50 backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row">
                <div className="flex flex-col gap-1 text-center md:text-left">
                  <p>
                    <span className="font-semibold text-foreground">Fireworks</span>{" "}
                    — financial independence modelling.
                  </p>
                  <p className="text-xs text-muted-foreground/80">For planning purposes only. Not financial advice.</p>
                </div>
                
                <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-foreground sm:text-sm sm:gap-x-6">
                  <Link
                    href="/methodology"
                    className="underline decoration-border/80 underline-offset-4 transition-colors hover:decoration-primary hover:text-primary"
                  >
                    Methodology
                  </Link>
                  <Link
                    href="/privacy"
                    className="underline decoration-border/80 underline-offset-4 transition-colors hover:decoration-primary hover:text-primary"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/disclaimer"
                    className="underline decoration-border/80 underline-offset-4 transition-colors hover:decoration-primary hover:text-primary"
                  >
                    Disclaimer
                  </Link>
                  <a
                    href="mailto:1mpersecond@gmail.com"
                    className="underline decoration-border/80 underline-offset-4 transition-colors hover:decoration-primary hover:text-primary"
                  >
                    Contact
                  </a>
                </nav>
                
                <div className="text-center text-xs md:text-right">
                  <FooterCredit />
                </div>
              </div>
            </footer>
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
