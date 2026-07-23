import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
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

export const metadata: Metadata = {
  title: "OnFIRE — UK FIRE Planner",
  description:
    "OnFIRE models your UK Financial Independence, Retire Early plan across ISA, GIA, SIPP and State Pension.",
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
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div aria-hidden className="app-backdrop" />
          <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
              <Link href="/" aria-label="OnFIRE home">
                <Logo size={30} />
              </Link>
              <div className="flex items-center gap-2 sm:gap-4">
                <Nav />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
          <footer className="border-t border-border">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:px-6">
              <p>
                <span className="font-medium text-foreground">OnFIRE</span> — UK
                financial independence modelling across ISA, GIA, SIPP and State
                Pension.
              </p>
              <p>For planning purposes only. Not financial advice.</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
