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
  const { inputs } = usePlan();
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
          <Check className="size-3.5 text-success" />
        ) : (
          <Share2 className="size-3.5" />
        )}
        {copied ? "Link copied" : "Share"}
      </Button>

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
                "onfire-plan.csv",
                planTimelineCsv(simulateFire(inputs)),
                "text/csv",
              ),
          },
          {
            label: "Plan inputs (JSON)",
            icon: <Download className="size-3.5" />,
            onSelect: () =>
              download(
                "onfire-plan.json",
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
