import { Heart } from "lucide-react";

/**
 * The maker's line. Both flags are inline SVG rather than emoji on purpose:
 * the Scottish saltire is a Unicode *subdivision* flag that many platforms
 * (notably Windows) don't render at all, and the Community of Madrid has no
 * emoji whatsoever. They're decorative — the sentence carries the meaning, so
 * they're `aria-hidden` and the heart is backed by a screen-reader "love".
 */

// 21×14 rather than 18×12: the Madrid flag carries seven stars, and below this
// size they merge into a blur rather than reading as stars.
const FLAG =
  "inline-block h-3.5 w-[1.3125rem] -translate-y-px rounded-[2px] align-middle ring-1 ring-black/10";

function Saltire() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden className={FLAG}>
      <rect width="30" height="20" fill="#005EB8" />
      <path
        d="M0 0 L30 20 M30 0 L0 20"
        stroke="#fff"
        strokeWidth="4.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Four stars over three, centred on the field — the Community of Madrid's seven.
const MADRID_STARS = [
  [6.9, 7.6],
  [12.3, 7.6],
  [17.7, 7.6],
  [23.1, 7.6],
  [9.6, 13],
  [15, 13],
  [20.4, 13],
];

function MadridFlag() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden className={FLAG}>
      <defs>
        {/* A unit five-pointed star, point up, centred on the origin. */}
        <path
          id="madrid-star"
          d="M0,-1 L0.2245,-0.309 L0.9511,-0.309 L0.3633,0.1181 L0.5878,0.809 L0,0.382 L-0.5878,0.809 L-0.3633,0.1181 L-0.9511,-0.309 L-0.2245,-0.309 Z"
        />
      </defs>
      <rect width="30" height="20" fill="#C4023C" />
      {MADRID_STARS.map(([x, y]) => (
        <use
          key={`${x}-${y}`}
          href="#madrid-star"
          fill="#fff"
          transform={`translate(${x} ${y}) scale(1.9)`}
        />
      ))}
    </svg>
  );
}

export function FooterCredit() {
  return (
    /* Inline rather than flex on purpose: a flex row makes each fragment its own
       item, so the gaps are visual only and the accessible name collapses to
       "Made withlovein Scotland…". Inline flow keeps the real spaces, and lets
       the line wrap normally on a narrow screen. */
    <p>
      Made with{" "}
      <Heart
        aria-hidden
        className="inline-block size-3 -translate-y-px fill-primary text-primary"
      />
      <span className="sr-only">love</span> in Scotland{" "}
      <Saltire /> by a madrile&ntilde;o <MadridFlag />
    </p>
  );
}
