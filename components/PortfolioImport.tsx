"use client";

import { Sparkles, Upload, X } from "lucide-react";
import { useState } from "react";
import { MAX_IMPORT_CHARS } from "@/lib/portfolio-import";
import type { Holding } from "@/lib/vanguard-funds";

interface ApiHolding {
  label: string;
  assetClass: Holding["assetClass"];
  ocf: number;
  weight: number;
}

/**
 * Largest file we'll read. A statement export is a few KB; anything far bigger
 * is the wrong file. Reading it anyway meant `FileReader` pulled the whole
 * thing into memory and then into a controlled `<textarea>`, which locks the
 * tab up long before the server gets a chance to reject it.
 */
const MAX_FILE_BYTES = 512 * 1024;

/**
 * AI-assisted portfolio import. The pasted text (or an uploaded CSV read as
 * text) is sent to a server route that asks Gemini to classify each holding
 * into an asset class + fee — the expected *returns* still come from the asset
 * class in the engine, so the projection stays deterministic. The user reviews
 * the result before it's applied.
 */
export function PortfolioImport({
  onImport,
  onClose,
}: {
  onImport: (holdings: Holding[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setError(
        "That file is too big to import — export just your holdings, or paste them in above.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      const content = String(reader.result ?? "");
      setText(content.slice(0, MAX_IMPORT_CHARS));
      if (content.length > MAX_IMPORT_CHARS) {
        setError(
          "That file was longer than we can read, so only the first part was loaded — check it covers your holdings.",
        );
      }
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsText(file);
  };

  async function run() {
    if (text.trim() === "") {
      setError("Paste your holdings, or choose a CSV, first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={"e.g.\nVanguard FTSE Global All Cap  £42,000\nRoyal London Short Term MMF  £8,000"}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-primary"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          <Sparkles className="size-3.5" />
          {busy ? "Reading…" : "Read with AI"}
        </button>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Upload className="size-3.5" />
          Upload CSV
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-[0.7rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
