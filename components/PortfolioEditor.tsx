"use client";

import { ChevronDown, Copy, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type AssetClass,
  ASSET_CLASS_LABEL,
  FUND_CATEGORY_LABEL,
  type Fund,
  FUNDS,
  fundCategory,
  fundToHolding,
  type Holding,
  holdingsNetGrowth,
  netGrowth,
} from "@/lib/vanguard-funds";

const pct1 = (f: number) => `${(f * 100).toFixed(1)}%`;

/** A wrapper whose portfolio can be copied into this one. */
export interface ReuseSource {
  id: string;
  label: string;
  holdings: Holding[];
}

/** Coarse types offered when adding a custom holding, mapped to an asset class
 *  (which drives the equity/bond/cash split used by the risk analysis). */
const CUSTOM_TYPES: { label: string; assetClass: AssetClass }[] = [
  { label: "Equity", assetClass: "global-equity" },
  { label: "Mixed (60/40)", assetClass: "multi-asset-60" },
  { label: "Bonds", assetClass: "global-bonds" },
  { label: "Cash", assetClass: "cash" },
];

function holdingLabel(h: Holding): string {
  if (h.label) return h.label;
  if (h.fundId) return FUNDS.find((f) => f.id === h.fundId)?.name ?? "Fund";
  return ASSET_CLASS_LABEL[h.assetClass];
}

/**
 * The "Optional: Define portfolio" control for a single wrapper. When empty it's
 * just a single "Expected growth" figure (the simple case); expanding it lets
 * you build a portfolio of funds (or custom holdings) whose weighted, fee-aware
 * return becomes the wrapper's growth. Weights are shares of the wrapper.
 */
export function PortfolioEditor({
  label,
  holdings,
  onChange,
  reuseSources,
}: {
  label: string;
  holdings: Holding[] | undefined;
  /** Atomic update of the wrapper's holdings (the parent also derives growth
   *  from them in the same state update). `undefined` clears the portfolio. */
  onChange: (h: Holding[] | undefined) => void;
  reuseSources: ReuseSource[];
}) {
  const list = holdings ?? [];
  const hasPortfolio = list.length > 0;
  const [open, setOpen] = useState(hasPortfolio);
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const derived = hasPortfolio ? holdingsNetGrowth(list) : undefined;
  const weightTotal = list.reduce((s, h) => s + Math.max(0, h.weight), 0);

  const commit = (next: Holding[]) =>
    onChange(next.length === 0 ? undefined : next);

  const addFund = (fund: Fund) => {
    const remaining = Math.max(0, 1 - weightTotal);
    const weight = list.length === 0 ? 1 : remaining > 0.001 ? remaining : 0.1;
    commit([...list, fundToHolding(fund, weight)]);
    setQuery("");
  };

  const addCustom = (label: string, ret: number, assetClass: AssetClass) => {
    const remaining = Math.max(0, 1 - weightTotal);
    const weight = list.length === 0 ? 1 : remaining > 0.001 ? remaining : 0.1;
    commit([
      ...list,
      { label, assetClass, ocf: 0, expectedReturn: ret, weight },
    ]);
    setShowCustom(false);
  };

  const setWeight = (i: number, weight: number) =>
    commit(list.map((h, idx) => (idx === i ? { ...h, weight } : h)));

  const remove = (i: number) => commit(list.filter((_, idx) => idx !== i));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const chosen = new Set((holdings ?? []).map((h) => h.fundId).filter(Boolean));
    const pool = FUNDS.filter((f) => !chosen.has(f.id)).filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.provider.toLowerCase().includes(q) ||
        ASSET_CLASS_LABEL[f.assetClass].toLowerCase().includes(q),
    );
    const byCat: Record<string, Fund[]> = {};
    for (const f of pool) (byCat[fundCategory(f)] ??= []).push(f);
    return byCat;
  }, [query, holdings]);

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-medium text-foreground">
          {hasPortfolio ? "Portfolio" : "Optional: define portfolio"}
          {derived !== undefined && (
            <span className="ml-2 font-normal text-muted-foreground">
              {list.length} fund{list.length === 1 ? "" : "s"} · {pct1(derived)} net
            </span>
          )}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!hasPortfolio && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Add the funds you hold in your {label} to set a fee-aware growth
              rate — or leave this and just use the single Expected growth figure
              above.
            </p>
          )}

          {reuseSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Copy from:</span>
              {reuseSources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    commit(s.holdings.map((h) => ({ ...h })))
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <Copy className="size-3" />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {list.length > 0 && (
            <ul className="space-y-2">
              {list.map((h, i) => (
                <li
                  key={`${h.fundId ?? h.label}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {holdingLabel(h)}
                    </p>
                    <p className="truncate text-[0.7rem] text-muted-foreground">
                      {ASSET_CLASS_LABEL[h.assetClass]} · {pct1(h.ocf)} OCF
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={Math.round(h.weight * 100)}
                      onChange={(e) =>
                        setWeight(i, (Number(e.target.value) || 0) / 100)
                      }
                      aria-label={`${holdingLabel(h)} weight`}
                      className="w-14 rounded-md border border-border bg-surface-muted px-2 py-1 text-right text-xs tabular outline-none focus-visible:border-primary"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove ${holdingLabel(h)}`}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {list.length > 0 && Math.abs(weightTotal - 1) > 0.005 && (
            <p className="text-[0.7rem] text-muted-foreground">
              Weights total {Math.round(weightTotal * 100)}% — they&apos;re
              rescaled to 100% for the projection.
            </p>
          )}

          {/* Add a holding: searchable catalogue + a custom option. */}
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search funds by name, provider or type…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-primary"
            />
            {(query.trim() !== "" || !hasPortfolio) && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
                {Object.keys(filtered).length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No funds match — add it as a custom holding below.
                  </p>
                )}
                {(["equity", "hybrid", "bonds", "cash"] as const).map((cat) =>
                  filtered[cat]?.length ? (
                    <div key={cat}>
                      <p className="bg-surface-muted px-3 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                        {FUND_CATEGORY_LABEL[cat]}
                      </p>
                      {filtered[cat].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => addFund(f)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-muted"
                        >
                          <span className="min-w-0 truncate">
                            <span className="text-foreground">{f.name}</span>{" "}
                            <span className="text-muted-foreground">
                              · {f.provider}
                            </span>
                          </span>
                          <span className="shrink-0 tabular text-muted-foreground">
                            {pct1(netGrowth(f))}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null,
                )}
              </div>
            )}

            {showCustom ? (
              <CustomHoldingForm
                onAdd={addCustom}
                onCancel={() => setShowCustom(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                Add a custom holding
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomHoldingForm({
  onAdd,
  onCancel,
}: {
  onAdd: (label: string, ret: number, assetClass: AssetClass) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [ret, setRet] = useState(6);
  const [typeIdx, setTypeIdx] = useState(0);

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-surface-muted p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Holding name (e.g. My workplace fund)"
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-primary"
      />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Expected return
          <span className="mt-1 flex items-center gap-1">
            <input
              type="number"
              value={ret}
              onChange={(e) => setRet(Number(e.target.value) || 0)}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right text-xs tabular outline-none focus-visible:border-primary"
            />
            <span>% / yr</span>
          </span>
        </label>
        <label className="text-xs text-muted-foreground">
          Type
          <select
            value={typeIdx}
            onChange={(e) => setTypeIdx(Number(e.target.value))}
            className="mt-1 block rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus-visible:border-primary"
          >
            {CUSTOM_TYPES.map((t, i) => (
              <option key={t.label} value={i}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={name.trim() === ""}
          onClick={() =>
            onAdd(name.trim(), ret / 100, CUSTOM_TYPES[typeIdx].assetClass)
          }
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
