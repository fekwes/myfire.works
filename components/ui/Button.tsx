import { clsx } from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "brand"
  | "secondary"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[opacity,background-color,border-color,transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:opacity-90",
  // The signature CTA — bright ember/gold "burst" fill with a fixed dark ink
  // label that stays legible on the accent in both themes.
  brand:
    "bg-brand text-[#241005] shadow-[var(--shadow-sm)] hover:opacity-90 hover:shadow-[var(--shadow-md)]",
  secondary:
    "border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
  ghost: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  danger: "border border-danger/50 text-danger hover:bg-danger/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
};

/** Compose the button class string — shared by `Button` and `ButtonLink`. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return clsx(base, variants[variant], sizes[size], className);
}

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonOwnProps & ComponentProps<"button">) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
}

/** A `Button`-styled Next.js `<Link>` for navigation CTAs. */
export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonOwnProps & ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
