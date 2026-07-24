"use client";

import { clsx } from "clsx";
import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  tone?: "default" | "danger";
}

/**
 * An accessible dropdown menu (WAI-ARIA menu pattern): `role="menu"` with
 * `menuitem`s, roving focus, arrow / Home / End / Escape keyboard support,
 * focus returned to the trigger on close, and click-outside dismissal. Replaces
 * the app's previously hand-rolled dropdowns.
 */
export function Menu({
  trigger,
  triggerClassName,
  items,
  align = "right",
  menuLabel = "Menu",
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  items: MenuItem[];
  align?: "left" | "right";
  menuLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  // Click / focus outside closes the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Move DOM focus to the active item while open (roving tabindex).
  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  const openMenu = (index: number) => {
    setActive(index);
    setOpen(true);
  };
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const activate = (item: MenuItem) => {
    item.onSelect?.();
    // Links navigate on their own; either way, dismiss without stealing focus.
    close(false);
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (i + 1) % items.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (i - 1 + items.length) % items.length);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        activate(items[active]);
        break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(items.length - 1);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openMenu(0))}
        onKeyDown={onTriggerKeyDown}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled at item level
        <div
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={onMenuKeyDown}
          className={clsx(
            "absolute top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-lg)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => {
            const cls = clsx(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors focus:outline-none",
              item.tone === "danger"
                ? "text-danger hover:bg-danger/10 focus-visible:bg-danger/10"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-visible:bg-surface-muted focus-visible:text-foreground",
            );
            const common = {
              role: "menuitem" as const,
              tabIndex: active === i ? 0 : -1,
              className: cls,
              onMouseEnter: () => setActive(i),
            };
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={() => activate(item)}
                {...common}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={() => activate(item)}
                {...common}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
