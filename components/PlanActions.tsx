"use client";

import { Check, Download, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { usePlan } from "@/components/PlanProvider";
import { Button, Menu } from "@/components/ui";
import { simulateFire } from "@/lib/fire-engine";
import { planInputsJson, planTimelineCsv } from "@/lib/export";
import { encodePlan } from "@/lib/share";

function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Plan-level actions surfaced on the Planner: share and export. */
export function PlanActions() {
  const { inputs, activePack } = usePlan();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/planner?p=${encodePlan(inputs)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — fall back to a prompt so the link is still reachable.
      window.prompt("Copy your shareable plan link:", url);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={share}>
        {copied ? (
          <Check aria-hidden className="size-3.5 text-success" />
        ) : (
          <Share2 aria-hidden className="size-3.5" />
        )}
        {copied ? "Link copied" : "Share"}
      </Button>
      {/* Swapping the label of the button you just pressed isn't reliably
          announced, so say it out loud in a live region. */}
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? "Shareable link copied to clipboard" : ""}
      </p>

      <Menu
        menuLabel="Export plan"
        triggerClassName="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        trigger={
          <>
            <Download className="size-3.5" />
            Export
          </>
        }
        items={[
          {
            label: "Timeline (CSV)",
            icon: <Download className="size-3.5" />,
            onSelect: () =>
              download(
                "fireworks-plan.csv",
                planTimelineCsv(simulateFire(inputs), activePack.labels),
                "text/csv",
              ),
          },
          {
            label: "Plan inputs (JSON)",
            icon: <Download className="size-3.5" />,
            onSelect: () =>
              download(
                "fireworks-plan.json",
                planInputsJson(inputs),
                "application/json",
              ),
          },
          {
            label: "Print / Save as PDF",
            icon: <Printer className="size-3.5" />,
            onSelect: () => window.print(),
          },
        ]}
      />
    </div>
  );
}
