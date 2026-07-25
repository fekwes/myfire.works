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

/**
 * The burst on its own — the brand's celebratory glyph. Used to mark the
 * moments worth celebrating (a plan that holds, a milestone reached) in place
 * of an emoji, so the one warm beat in the UI is ours and scales with the type.
 */
export function Spark({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path
        d="M12 2C13.2 8.4 13.2 8.4 19.6 9.6C13.2 10.8 13.2 10.8 12 17.2C10.8 10.8 10.8 10.8 4.4 9.6C10.8 8.4 10.8 8.4 12 2Z"
        fill="currentColor"
      />
      <path
        d="M18.4 15.2C18.9 17.6 18.9 17.6 21.3 18.1C18.9 18.6 18.9 18.6 18.4 21C17.9 18.6 17.9 18.6 15.5 18.1C17.9 17.6 17.9 17.6 18.4 15.2Z"
        fill="currentColor"
        opacity={0.65}
      />
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
