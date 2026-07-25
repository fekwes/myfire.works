"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState, useSyncExternalStore } from "react";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * A disclosure section (WAI-ARIA pattern): a labelled toggle that shows/hides
 * a region, with an optional summary that keeps the collapsed state
 * informative rather than mysterious.
 *
 * `hashId` matters: the planner's checklist deep-links into this page
 * (`/finances#scenario`), so a section that happens to be collapsed must open
 * itself when it's the link target — otherwise the link lands on nothing.
 */
export function Collapsible({
  id,
  title,
  description,
  summary,
  defaultOpen = false,
  children,
}: {
  /** Anchor id — also the hash this section opens for. */
  id: string;
  title: string;
  description?: string;
  /** Short state line shown while collapsed (e.g. "Not included"). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const regionId = useId();
  // The URL hash is external state, so read it through the store API rather
  // than syncing it into state from an effect. Renders closed on the server
  // (no hash there), then opens on the client if this section is the target.
  const targeted = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash === `#${id}`,
    () => false,
  );
  // Null until the user expresses a preference; after that, theirs wins.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? (defaultOpen || targeted);
  const setOpen = (next: boolean) => setManualOpen(next);

  return (
    <section id={id} className="scroll-mt-28">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={regionId}
        className="group flex w-full items-start justify-between gap-4 rounded-xl py-1 text-left"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              {title}
            </span>
            {!open && summary && (
              <span className="truncate rounded-full border border-border bg-surface-muted px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                {summary}
              </span>
            )}
          </span>
          {description && (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {description}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--dur-fast)] group-hover:text-foreground ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div id={regionId} hidden={!open} className="mt-4 space-y-4">
        {children}
      </div>
    </section>
  );
}
