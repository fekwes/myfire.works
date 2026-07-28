"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { DropPasteInput, type ImportPayload } from "@/components/DropPasteInput";
import type { Holding } from "@/lib/vanguard-funds";

interface ApiHolding {
  label: string;
  assetClass: Holding["assetClass"];
  ocf: number;
  weight: number;
}


/**
 * AI-assisted portfolio import. The pasted text (or an uploaded CSV read as
 * text) is sent to a server route that asks Gemini to classify each holding
 * into an asset class + fee — the expected *returns* still come from the asset
 * class in the engine, so the projection stays deterministic.
 *
 * Imported holdings are applied **immediately** — they land in the wrapper's
 * editor, where they can be corrected, but there is no confirm step in between.
 * A dedicated review step is on the backlog; until it exists, don't describe
 * this as reviewed, because a misclassified fund silently changes the
 * wrapper's growth rate.
 */
export function PortfolioImport({
  onImport,
  onClose,
}: {
  onImport: (holdings: Holding[]) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayload(payload: ImportPayload) {
    if (payload.type === "file") {
      setError("Only text/CSV is supported for portfolio import. Use full plan import for PDFs.");
      return;
    }
    const importText = payload.text.trim();
    if (importText === "") {
      setError("Paste your holdings, or choose a CSV, first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      const data = (await res.json()) as {
        holdings?: ApiHolding[];
        error?: string;
      };
      if (!res.ok || !data.holdings) {
        throw new Error(data.error ?? "Import failed.");
      }
      onImport(
        data.holdings.map((h) => ({
          label: h.label,
          assetClass: h.assetClass,
          ocf: h.ocf,
          weight: h.weight,
        })),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Import with AI
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close import"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        Paste your holdings from a broker statement or spreadsheet (or upload a
        CSV). This sends that text to Google Gemini to identify the funds; your
        figures stay on your device otherwise. Returns are still set by each
        fund&apos;s asset class, not guessed by the AI.
      </p>
      <DropPasteInput
        busy={busy}
        onPayload={handlePayload}
        onError={setError}
        placeholder="e.g. Vanguard FTSE Global All Cap 42,000"
      />
      {busy && <p className="text-[0.7rem] text-muted-foreground mt-2">Reading holdings with AI...</p>}
      {error && (
        <p role="alert" className="text-[0.7rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
