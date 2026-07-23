interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number;
  /** Show the "OnFIRE" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * OnFIRE brand mark: a banknote (lime) with a flame (amber) rising off it —
 * "money burning", a wink at the FIRE movement. Two-tone, legible down to
 * favicon size on the ink tile.
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
      aria-label="OnFIRE"
    >
      <rect width="32" height="32" rx="8" fill="#0B0C10" />
      {/* Banknote */}
      <rect x="5" y="17.5" width="22" height="9.5" rx="2.2" fill="#BEF264" />
      <rect x="7" y="19.5" width="18" height="5.5" rx="1.2" fill="#0B0C10" />
      <circle cx="16" cy="22.25" r="1.9" fill="#BEF264" />
      {/* Flame */}
      <path
        d="M16 4.5C14 8 14.8 10 13.4 11.4C12.6 10.8 12.2 9.9 12.3 8.8C10.5 10.5 9.6 12.9 9.6 15.2C9.6 16.1 9.8 16.9 10.1 17.6H21.9C22.2 16.7 22.4 15.7 22.4 14.6C22.4 12.1 20.9 9.8 19.8 8C19.6 10 18.6 11 17.4 10.4C18.4 7.4 17.6 6 16 4.5Z"
        fill="#FBBF24"
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
          On<span className="text-primary">FIRE</span>
        </span>
      )}
    </span>
  );
}
