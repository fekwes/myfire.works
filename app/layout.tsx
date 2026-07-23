import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "FIRE UK — Retirement Planner",
  description:
    "Model your UK Financial Independence, Retire Early plan across ISA, GIA, SIPP and State Pension.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  F
                </div>
                <span className="text-base font-semibold tracking-tight">
                  FIRE<span className="text-primary">UK</span>
                </span>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
          <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
            For planning purposes only — not financial advice.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
