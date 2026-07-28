import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import { AuthButton } from "@/components/AuthButton";
import { AuthProvider } from "@/components/AuthProvider";
import { HeaderLogo } from "@/components/HeaderLogo";
import { MobileNav, Nav } from "@/components/Nav";
import { PlanProvider } from "@/components/PlanProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <PlanProvider>
            <div aria-hidden className="app-backdrop" />
            <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                <HeaderLogo />
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <Nav />
                  <AuthButton />
                  <ThemeToggle />
                </div>
              </div>
              <div className="mx-auto w-full max-w-6xl">
                <MobileNav />
              </div>
            </header>
            <main className="flex flex-1 flex-col">{children}</main>
            <footer className="border-t border-border bg-surface/30">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    <span className="font-semibold text-foreground">Fireworks</span>{" "}
                    — tax-aware financial independence modeling across ISA, GIA, SIPP, State Pension, and property.
                  </p>
                  <p className="font-mono text-[0.7rem] text-muted-foreground">
                    © {new Date().getFullYear()} Fireworks. All rights reserved.
                  </p>
                </div>
                
                <p className="text-[0.75rem] leading-relaxed text-muted-foreground/80 max-w-4xl">
                  <strong className="font-semibold text-muted-foreground">Legal & Financial Attribution:</strong> Fireworks is an educational software tool designed exclusively for scenario exploration. It does not provide regulated financial, investment, accounting, or tax advice. Calculations rely on 2026/27 UK tax legislation and simplified mathematical assumptions. Always consult a qualified, FCA-regulated financial adviser before making financial decisions.
                </p>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/50 pt-3 text-xs">
                  <Link
                    href="/disclaimer"
                    className="font-medium text-foreground/90 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Legal Disclaimer
                  </Link>
                  <Link
                    href="/privacy"
                    className="font-medium text-foreground/90 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/methodology"
                    className="font-medium text-foreground/90 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Tax & Math Methodology
                  </Link>
                  <a
                    href="mailto:1mpersecond@gmail.com"
                    className="font-medium text-foreground/90 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Contact Us
                  </a>
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
