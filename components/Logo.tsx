interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number;
  /** Show the "FIRE UK" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * FIRE UK brand mark: three ascending bars (growth) bridged by a rising
 * trajectory line — nodding to the app's core idea of bridging assets from
 * early retirement up to pension age. Ink tile, electric-lime glyph.
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
      aria-label="FIRE UK"
    >
      <rect width="32" height="32" rx="8" fill="#0B0C10" />
      <rect x="6.5" y="18" width="4" height="7" rx="1.5" fill="#BEF264" />
      <rect x="14" y="13.5" width="4" height="11.5" rx="1.5" fill="#BEF264" />
      <rect x="21.5" y="8.5" width="4" height="16.5" rx="1.5" fill="#BEF264" />
      <path
        d="M6 15.5 L15 11 L26 5.5"
        stroke="#BEF264"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="26" cy="5.5" r="1.9" fill="#BEF264" />
    </svg>
  );
}

export function Logo({ size = 32, withWordmark = true, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">
          FIRE<span className="text-primary"> UK</span>
        </span>
      )}
    </span>
  );
}
