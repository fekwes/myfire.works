"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

export type ImportPayload =
  | { type: "text"; text: string }
  | { type: "file"; data: string; mimeType: string };

interface DropPasteInputProps {
  onPayload: (payload: ImportPayload) => void;
  onError: (msg: string) => void;
  busy: boolean;
  placeholder?: string;
}

export function DropPasteInput({ onPayload, onError, busy, placeholder }: DropPasteInputProps) {
  const [drag, setDrag] = useState(false);

  const handleFile = (file: File) => {
    // text files
    if (file.name.match(/\.(csv|tsv|txt)$/i) || file.type.startsWith("text/")) {
      const reader = new FileReader();
      reader.onload = () => {
        onPayload({ type: "text", text: String(reader.result ?? "") });
      };
      reader.onerror = () => onError("Couldn't read text file.");
      reader.readAsText(file);
      return;
    }

    // binary files (pdf, images)
    if (file.type === "application/pdf" || file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        onError("File is too large (max 5MB).");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const base64Data = result.split(",")[1];
        if (base64Data) {
          onPayload({ type: "file", data: base64Data, mimeType: file.type });
        }
      };
      reader.onerror = () => onError("Couldn't read file.");
      reader.readAsDataURL(file);
      return;
    }
    
    onError("Unsupported file format. Please use text, csv, pdf, or images.");
  };

  return (
    <div
      className={`relative w-full rounded-xl border-2 border-dashed p-4 transition-colors ${
        drag ? "border-primary bg-primary/5" : "border-border bg-surface-muted hover:border-muted-foreground/40"
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
        placeholder={placeholder ?? "Paste text or drop a file here (CSV, PDF, Image)..."}
        disabled={busy}
        className="h-24 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        onPaste={(e) => {
          // Let text paste happen naturally, but we could also intercept files here
          const file = e.clipboardData.files?.[0];
          if (file) {
            e.preventDefault();
            handleFile(file);
          }
        }}
        onChange={(e) => {
          if (e.target.value.trim().length > 0) {
            onPayload({ type: "text", text: e.target.value });
            e.target.value = ""; // clear after extracting
          }
        }}
      />
      <div className="absolute bottom-3 right-3">
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
  );
}
