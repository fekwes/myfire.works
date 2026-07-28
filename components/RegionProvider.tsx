"use client";

import { createContext, useContext, useState } from "react";

export type Region = "uk" | "us";

export interface RegionDetails {
  id: Region;
  label: string;
  flag: string;
  currency: "GBP" | "USD";
  currencySymbol: string;
  heroBadge: string;
  heroCopy: {
    lead: string;
    accounts: string;
    mechanics: string;
  };
  taxYearBadge: string;
  accounts: {
    taxFree: string;
    taxable: string;
    pension: string;
    statePension: string;
  };
  accessAges: {
    pension: number;
    pensionLabel: string;
    statePension: number;
    statePensionLabel: string;
  };
}

export const REGION_DETAILS: Record<Region, RegionDetails> = {
  uk: {
    id: "uk",
    label: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    currencySymbol: "£",
    heroBadge: "UK FIRE planner · 2026/27 tax-aware drawdown",
    heroCopy: {
      lead: "FIRE — financial independence, retire early — is having enough invested that work becomes optional.",
      accounts: "ISA, GIA, SIPP, State Pension and property",
      mechanics: "with the tax you'll actually pay, bridge year sequencing, and Monte Carlo confidence.",
    },
    taxYearBadge: "2026/27 UK tax rules",
    accounts: {
      taxFree: "ISA",
      taxable: "GIA",
      pension: "SIPP",
      statePension: "State Pension",
    },
    accessAges: {
      pension: 57,
      pensionLabel: "age 57",
      statePension: 67,
      statePensionLabel: "age 67",
    },
  },
  us: {
    id: "us",
    label: "United States",
    flag: "🇺🇸",
    currency: "USD",
    currencySymbol: "$",
    heroBadge: "US FIRE planner · 2026 tax-aware drawdown",
    heroCopy: {
      lead: "FIRE — financial independence, retire early — is having enough invested that work becomes optional.",
      accounts: "Roth IRA, Taxable Brokerage, 401(k)/IRA, Social Security and property",
      mechanics: "with federal tax brackets, 59½ penalty bridging, and Monte Carlo market confidence.",
    },
    taxYearBadge: "2026 US Federal tax code",
    accounts: {
      taxFree: "Roth IRA",
      taxable: "Taxable Brokerage",
      pension: "401(k) / IRA",
      statePension: "Social Security",
    },
    accessAges: {
      pension: 59,
      pensionLabel: "age 59½",
      statePension: 67,
      statePensionLabel: "age 67",
    },
  },
};

interface RegionContextValue {
  region: Region;
  setRegion: (region: Region) => void;
  details: RegionDetails;
}

const RegionContext = createContext<RegionContextValue | null>(null);

const STORAGE_KEY = "fw:region";

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<Region>(() => {
    if (typeof window === "undefined") return "uk";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "uk" || stored === "us") {
        return stored;
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
    return "uk";
  });

  const setRegion = (next: Region) => {
    setRegionState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  const details = REGION_DETAILS[region];

  return (
    <RegionContext.Provider value={{ region, setRegion, details }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) {
    // Graceful fallback for un-wrapped renders
    return {
      region: "uk",
      setRegion: () => {},
      details: REGION_DETAILS.uk,
    };
  }
  return ctx;
}
