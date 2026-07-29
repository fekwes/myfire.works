"use client";

import { Sparkles, Upload } from "lucide-react";
import { useState } from "react";

export type ImportPayload =
  | { type: "text"; text: string }
  | { type: "file"; data: string; mimeType: string; extractedText?: string };

interface DropPasteInputProps {
  onPayload: (payload: ImportPayload) => void;
  onError: (msg: string) => void;
  busy: boolean;
  placeholder?: string;
}

export function DropPasteInput({
  onPayload,
  onError,
  busy,
  placeholder,
}: DropPasteInputProps) {
  const [drag, setDrag] = useState(false);
  const [text, setText] = useState("");

  const handleFile = (file: File) => {
    // text files
    if (file.name.match(/\.(csv|tsv|txt)$/i) || file.type.startsWith("text/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = String(reader.result ?? "");
        if (fileContent.trim().length > 0) {
          onPayload({ type: "text", text: fileContent });
        }
      };
      reader.onerror = () => onError("Couldn't read text file.");
      reader.readAsText(file);
      return;
    }

    // binary files (pdf, images)
    if (file.type === "application/pdf" || file.name.match(/\.pdf$/i) || file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        onError("File is too large (max 10MB).");
        return;
      }

      const processFile = (extractedText?: string) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? "");
          const base64Data = result.split(",")[1];
          if (base64Data) {
            onPayload({
              type: "file",
              data: base64Data,
              mimeType: file.type || "application/pdf",
              extractedText: extractedText && extractedText.length > 20 ? extractedText : undefined,
            });
          }
        };
        reader.onerror = () => onError("Couldn't read file.");
        reader.readAsDataURL(file);
      };

      if (file.type === "application/pdf" || file.name.match(/\.pdf$/i)) {
        const textReader = new FileReader();
        textReader.onload = () => {
          let extractedText = "";
          try {
            const buffer = textReader.result as ArrayBuffer;
            if (buffer) {
              const rawBytes = new Uint8Array(buffer);
              const rawStr = new TextDecoder("latin1").decode(rawBytes);
              const matches = rawStr.match(/\(([^()]{1,120})\)/g);
              if (matches) {
                extractedText = matches
                  .map((m) => m.slice(1, -1))
                  .filter((t) => /[a-zA-Z0-9£$,.]/.test(t))
                  .join(" ");
              }
            }
          } catch {
            // non-fatal fallback
          }
          processFile(extractedText);
        };
        textReader.onerror = () => processFile();
        textReader.readAsArrayBuffer(file);
        return;
      }

      processFile();
      return;
    }

    onError("Unsupported file format. Please use text, csv, pdf, or images.");
  };

  const submitText = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    if (trimmed.length < 3) {
      onError("Please paste or type your statement or holdings list first.");
      return;
    }
    onPayload({ type: "text", text: trimmed });
  };

  return (
    <div
      className={`relative w-full rounded-xl border-2 border-dashed p-4 transition-colors ${
        drag
          ? "border-primary bg-primary/5"
          : "border-border bg-surface-muted hover:border-muted-foreground/40"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <textarea
        value={text}
        placeholder={
          placeholder ??
          "Paste text or drop a file here (CSV, PDF, Image)..."
        }
        aria-label="Import statement or holdings list"
        disabled={busy}
        className="h-28 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        onPaste={(e) => {
          const file = e.clipboardData.files?.[0];
          if (file) {
            e.preventDefault();
            handleFile(file);
          }
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submitText();
          }
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <p className="text-[0.7rem] text-muted-foreground">
          {text.trim().length > 0
            ? "Press Cmd/Ctrl+Enter or click Extract with AI"
            : "Drop CSV, PDF, image or paste text"}
        </p>
        <div className="flex items-center gap-2">
          {text.trim().length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={submitText}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow transition-colors hover:bg-brand/90 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />
              Extract with AI
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Upload className="size-3.5" />
            Choose file
            <input
              type="file"
              accept=".csv,.tsv,.txt,application/pdf,image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
