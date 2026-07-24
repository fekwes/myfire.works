"use client";

import { Download, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlan } from "@/components/PlanProvider";
import { simulateFire } from "@/lib/fire-engine";
import { planInputsJson, planTimelineCsv } from "@/lib/export";

function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Plan-level actions surfaced on the Planner: export (and, later, share). */
export function PlanActions() {
  const { inputs } = usePlan();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const exportCsv = () => {
    download("onfire-plan.csv", planTimelineCsv(simulateFire(inputs)), "text/csv");
    setOpen(false);
  };
  const exportJson = () => {
    download("onfire-plan.json", planInputsJson(inputs), "application/json");
    setOpen(false);
  };
  const print = () => {
    setOpen(false);
    window.print();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Download className="size-3.5" />
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl">
          <MenuItem onClick={exportCsv}>
            <Download className="size-3.5" /> Timeline (CSV)
          </MenuItem>
          <MenuItem onClick={exportJson}>
            <Download className="size-3.5" /> Plan inputs (JSON)
          </MenuItem>
          <MenuItem onClick={print}>
            <Printer className="size-3.5" /> Print / Save as PDF
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
