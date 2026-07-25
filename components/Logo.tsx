interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number;
  /** Show the "Fireworks" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * Fireworks brand mark — the "Trajectory Burst": a rising launch trail (a real
 * compound-growth curve, in ember) ending in a gold burst (the moment you reach
 * financial independence). The same arc heads the app's growth charts, so the
 * logo and the data-viz speak one language. Two-tone on a night-indigo tile, so
 * it stays legible in both themes and down to favicon size.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Fireworks"
    >
      <rect width="32" height="32" rx="8" fill="#141026" />
      {/* Launch trail — the growth curve */}
      <path
        d="M6 25C11 25 15 21 19 13"
        stroke="#FFAD4E"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Burst — the FI moment */}
      <path
        d="M20 6.5C21 11.5 21 11.5 26 13C21 14.5 21 14.5 20 19.5C19 14.5 19 14.5 14 13C19 11.5 19 11.5 20 6.5Z"
        fill="#FFC24B"
      />
      <circle cx="20" cy="13" r="1.25" fill="#FFF6E6" />
    </svg>
  );
}

export function Logo({ size = 32, withWordmark = true, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-display text-[1.1rem] font-bold tracking-tight">
          Fire<span className="text-primary">·</span>works
        </span>
      )}
    </span>
  );
}
