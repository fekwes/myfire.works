"use client";

import { FileText, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { parsePlanFromText } from "@/lib/plan-import-fallback";

export type ImportPayload =
  | { type: "text"; text: string }
  | { type: "file"; data: string; mimeType: string };

export interface ImportPlanData {
  wrappers: {
    sipp: number | null;
    isa: number | null;
    gia: number | null;
    emergencyFund: number | null;
    monthlyContribution: number | null;
  };
  holdings: Array<{
    label: string;
    assetClass: string;
    ocf: number;
    weight: number;
  }>;
  warning?: string | null;
}

interface DropPasteInputProps {
  onPlanImported?: (data: ImportPlanData) => void;
  onPayload?: (payload: ImportPayload) => void;
  onError?: (message: string) => void;
  busy?: boolean;
  placeholder?: string;
  onClose?: () => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB limit for multi-page PDFs

export function DropPasteInput({ onPlanImported, onPayload, onError, busy: busyProp, placeholder, onClose }: DropPasteInputProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalBusy, setInternalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const busy = busyProp ?? internalBusy;

  const processFile = useCallback((selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_BYTES) {
      setError("File exceeds 10MB limit. Please upload a smaller document.");
      return;
    }
    setFile(selectedFile);
    setError(null);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText) {
      setText(pastedText);
    }
  };

  const reportError = (message: string) => {
    setError(message);
    onError?.(message);
  };

  async function handleImport() {
    if (!text.trim() && !file) {
      reportError("Please paste statement text or drop/select a PDF/CSV file.");
      return;
    }

    if (onPayload) {
      if (file) {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          const reader = new FileReader();
          const payload = await new Promise<ImportPayload>((resolve, reject) => {
            reader.onload = () => {
              const result = String(reader.result ?? "");
              const data = result.split(",")[1];
              resolve({ type: "file", data: data ?? "", mimeType: file.type || "application/pdf" });
            };
            reader.onerror = () => reject(new Error("Failed to read file."));
            reader.readAsDataURL(file);
          });
          onPayload(payload);
          return;
        }

        const reader = new FileReader();
        const payload = await new Promise<ImportPayload>((resolve, reject) => {
          reader.onload = () => resolve({ type: "text", text: String(reader.result ?? "") });
          reader.onerror = () => reject(new Error("Failed to read file."));
          reader.readAsText(file);
        });
        onPayload(payload);
        return;
      }

      onPayload({ type: "text", text });
      return;
    }

    if (busyProp === undefined) {
      setInternalBusy(true);
    }
    setError(null);
    setWarning(null);

    try {
      let fileBase64: string | undefined = undefined;
      let textContent = text;

      if (file) {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          // Convert PDF to base64 for Gemini vision endpoint
          fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          // CSV / Text file reading
          textContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = reject;
            reader.readAsText(file);
          });
        }
      }

      const res = await fetch("/api/import-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textContent || undefined,
          fileBase64,
          mimeType: file?.type || "application/pdf",
        }),
      });

      if (!res.ok) {
        // Soft fallback if server endpoint unavailable/fails
        if (textContent) {
          const fallback = parsePlanFromText(textContent);
          onPlanImported?.({
            wrappers: fallback.wrappers,
            holdings: fallback.holdings,
            warning: fallback.confidenceScore < 0.8 ? "We caught some figures, but please verify these fields." : null,
          });
          setWarning(fallback.confidenceScore < 0.8 ? "We caught some figures, but please verify these fields." : null);
          if (onClose) onClose();
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to process document.");
      }

      const data = await res.json();
      const importedData: ImportPlanData = {
        wrappers: data.wrappers,
        holdings: data.holdings,
        warning: data.warning ?? null,
      };

      const hasUsableValues =
        [importedData.wrappers.sipp, importedData.wrappers.isa, importedData.wrappers.gia].some(
          (value) => value !== null && value > 0,
        ) || importedData.holdings.length > 0;

      if (!hasUsableValues && textContent) {
        const fallback = parsePlanFromText(textContent);
        importedData.wrappers = fallback.wrappers;
        importedData.holdings = fallback.holdings;
        importedData.warning = fallback.confidenceScore < 0.8 ? "We caught some figures, but please verify these fields." : null;
      }

      onPlanImported?.(importedData);
      setWarning(importedData.warning ?? null);

      if (onClose) onClose();
    } catch (err) {
      // Local fallback parsing attempt on error if text is available
      if (text.trim()) {
        const fallback = parsePlanFromText(text);
        onPlanImported?.({
          wrappers: fallback.wrappers,
          holdings: fallback.holdings,
          warning: fallback.confidenceScore < 0.8 ? "We caught some figures, but please verify these fields." : null,
        });
        setWarning(fallback.confidenceScore < 0.8 ? "We caught some figures, but please verify these fields." : null);
        if (onClose) onClose();
        return;
      }
      reportError(err instanceof Error ? err.message : "Document import failed.");
    } finally {
      if (busyProp === undefined) {
        setInternalBusy(false);
      }
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-surface-muted p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="size-4 text-primary" />
          Smart Document Import (PDF, CSV, Text)
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document import modal"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Upload or drop your multi-page broker statement PDF (Vanguard UK, Hargreaves Lansdown, AJ Bell, Fidelity) or paste your valuation text. Gemini 2.0 Flash vision processes your statement layout directly to extract SIPP, ISA, and GIA wrapper values and fund holdings.
      </p>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : file
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-border bg-background hover:border-border-hover"
        }`}
      >
        {file ? (
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-emerald-400" />
            <div className="text-left">
              <p className="text-xs font-medium text-foreground">{file.name}</p>
              <p className="text-[0.7rem] text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB · {file.type || "Document"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Remove attached file"
              className="ml-2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1.5">
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              Drop your statement PDF/CSV here, or <span className="text-primary underline">browse</span>
            </span>
            <span className="text-[0.7rem] text-muted-foreground">
              Supports multi-page Vanguard UK PDF valuations up to 10MB
            </span>
            <input
              type="file"
              accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) processFile(selected);
              }}
            />
          </label>
        )}
      </div>

      {/* Text Area for Pasted Statement Data */}
      {!file && (
        <div>
          <label htmlFor="statement-text" className="mb-1 block text-[0.7rem] font-medium text-muted-foreground">
            Or paste statement text directly:
          </label>
          <textarea
            id="statement-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            rows={4}
            placeholder={"Portfolio Value by Product Wrapper:\nVanguard Personal Pension: £337,856.14\nStocks & Shares ISA: £166,720.37\nPersonal Portfolio: £196,717.05"}
            className="w-full rounded-md border border-border bg-background p-2.5 text-xs outline-none focus-visible:border-primary"
          />
        </div>
      )}

      {warning && (
        <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {warning}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-danger font-medium">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleImport}
          disabled={busy || (!text.trim() && !file)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-50"
        >
          <Sparkles className="size-3.5" />
          {busy ? "Analyzing Document..." : "Import Document"}
        </button>
      </div>
    </div>
  );
}
