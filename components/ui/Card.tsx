import { clsx } from "clsx";
import type { ComponentProps } from "react";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardElevation = "flat" | "raised";

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-5 sm:p-7",
};

/**
 * The surface primitive. `padding` and `elevation` are deliberately varied by
 * context — a north-star card gets `lg`, a dense stat tile `sm` — so the UI
 * has real hierarchy instead of one uniform card everywhere.
 */
export function Card({
  padding = "md",
  elevation = "flat",
  className,
  ...props
}: {
  padding?: CardPadding;
  elevation?: CardElevation;
} & ComponentProps<"div">) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface",
        paddings[padding],
        elevation === "raised" && "shadow-[var(--shadow-md)]",
        className,
      )}
      {...props}
    />
  );
}
