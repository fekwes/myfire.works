"use client";

export const FINANCE_SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "balances", label: "Balances & funds" },
  { id: "property", label: "Property" },
  { id: "scenario", label: "Withdrawals" },
  { id: "assumptions", label: "Assumptions" },
] as const;

export type FinanceSectionId = (typeof FINANCE_SECTIONS)[number]["id"];

/**
 * Section switcher for Edit plan. The form is long by nature, so rather than one
 * endless scroll we show a single section at a time and switch with these tabs
 * — a horizontal, scrollable chip row on mobile; a sticky vertical rail on large
 * screens. Controlled by the parent so a deep-link hash can select a tab.
 */
export function FinancesNav({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: FinanceSectionId) => void;
}) {
  return (
    <nav aria-label="Sections of your plan">
      <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
        {FINANCE_SECTIONS.map((s) => {
          const current = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={current ? "true" : undefined}
                className={`block w-full rounded-full px-3 py-1.5 text-left text-sm transition-colors lg:rounded-lg ${
                  current
                    ? "bg-surface-muted font-medium text-foreground lg:border-l-2 lg:border-primary lg:bg-transparent"
                    : "text-muted-foreground hover:text-foreground lg:border-l-2 lg:border-transparent"
                }`}
              >
                {s.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
