"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// The trail only exists from `lg` up, where there is room for it to arc across
// the page without crossing the copy. Below that the card's own sparkline
// carries the whole gesture on its own.

/**
 * The full-page launch trail. A firework is lit at the foot of the page and
 * arcs all the way up to the hero's plan preview, where the card's own
 * sparkline picks the arc up and carries it to the burst. Scrolling down walks
 * the flow in reverse — burst, climb, ignition.
 *
 * The path is *measured*, not hand-drawn: a static curve cannot stay joined to
 * the card, because the card's position depends on page height, breakpoint and
 * how much copy sits above it. This reads both anchors and re-derives the curve
 * on resize, so the join holds wherever the layout puts them.
 *
 * Anchors (set by the landing page):
 *   [data-launch-from] — the ignition point at the foot of the page
 *   [data-launch-to]   — the preview card; the trail aims at its left edge, at
 *                        the height where [data-launch-join] (the sparkline)
 *                        begins, then disappears behind it.
 */
interface Geometry {
  path: string;
  /** Boxes the trail must not compete with — it dims to a whisper across them. */
  quiet: { x: number; y: number; w: number; h: number }[];
}

export function LaunchTrail() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const from = document.querySelector("[data-launch-from]");
    const card = document.querySelector("[data-launch-to]");
    const join = document.querySelector("[data-launch-join]");
    if (!wrap || !from || !card || !join) return setGeo(null);

    const w = wrap.getBoundingClientRect();
    const f = from.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const j = join.getBoundingClientRect();

    // Local coordinates, in CSS pixels relative to the wrapper.
    const x0 = f.x + f.width / 2 - w.x;
    const y0 = f.y + f.height / 2 - w.y;
    // Aim a little *past* the card's left edge so the tip is safely hidden
    // behind it, at the height the sparkline starts.
    const x1 = c.x - w.x + 28;
    const y1 = j.bottom - w.y;

    const dx = x1 - x0;
    const dy = y1 - y0; // negative — the trail climbs

    // A single cubic with a long, lazy launch and a flattening arrival, so it
    // reads as one continuous rise rather than a diagonal line.
    const d = [
      `M${x0.toFixed(1)},${y0.toFixed(1)}`,
      `C${(x0 + dx * 0.08).toFixed(1)},${(y0 + dy * 0.42).toFixed(1)}`,
      `${(x0 + dx * 0.52).toFixed(1)},${(y0 + dy * 0.92).toFixed(1)}`,
      `${x1.toFixed(1)},${y1.toFixed(1)}`,
    ].join(" ");

    // Anything marked [data-launch-quiet] is prose the trail would otherwise
    // cross. Rather than route around it — which would flatten the arc — the
    // trail dims across those boxes, so it reads as passing behind the page.
    const quiet = [...document.querySelectorAll("[data-launch-quiet]")].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.x - w.x - 12,
          y: r.y - w.y - 8,
          w: r.width + 24,
          h: r.height + 16,
        };
      },
    );

    setGeo({ path: d, quiet });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    // Fonts land after first paint and move the card; re-measure once they do.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
    >
      {geo && (
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
        >
          <defs>
            <linearGradient
              id="launch-trail-stroke"
              x1="0"
              y1="1"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
              <stop offset="38%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.75} />
            </linearGradient>
            {/* White keeps the trail, grey dims it, and the blur makes the
                transition a fade rather than a visible boundary. */}
            <filter id="launch-quiet-blur">
              <feGaussianBlur stdDeviation="26" />
            </filter>
            <mask id="launch-quiet-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
              <g filter="url(#launch-quiet-blur)">
                {geo.quiet.map((q, i) => (
                  <rect
                    key={i}
                    x={q.x}
                    y={q.y}
                    width={q.w}
                    height={q.h}
                    rx="24"
                    fill="#2b2b2b"
                  />
                ))}
              </g>
            </mask>
          </defs>
          <path
            className="hero-trail"
            d={geo.path}
            stroke="url(#launch-trail-stroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
            mask="url(#launch-quiet-mask)"
          />
        </svg>
      )}
    </div>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Subscribes to the reduced-motion preference. `useSyncExternalStore` rather
 * than an effect so there's no setState-in-effect cascade, and so the server
 * snapshot is the conservative one — assume reduced, render the inert marker,
 * and upgrade on hydration only if motion is actually welcome. Same shape as
 * `useMounted` in ThemeToggle.
 */
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

/** Every element that makes up the three-beat launch, in beat order. */
const BEATS = ".hero-trail, .hero-chart-draw, .hero-chart-fill, .spark-pop";

/**
 * Restart the launch. Clearing `animation` and forcing a reflow before putting
 * it back re-triggers the CSS animations from zero, so every beat replays with
 * its original delay — which is what keeps them in sequence.
 */
function replayLaunch() {
  document.querySelectorAll<HTMLElement | SVGElement>(BEATS).forEach((el) => {
    el.style.animation = "none";
    el.getBoundingClientRect(); // force reflow (SVG has no offsetWidth)
    el.style.animation = "";
  });
}

/**
 * The ignition — where someone sets the thing off, and the origin the trail is
 * measured from. It's a real button: the trail is the page's one celebratory
 * gesture, and being able to set it off again is the whole idea. Under
 * `prefers-reduced-motion` there is no animation to replay, so it degrades to a
 * plain marker with no interactive affordance.
 */
/**
 * The crate the firework goes up from — a squat box of mortar tubes with one
 * fuse lit. No label: an object that obviously launches something explains
 * itself, and a line of copy saying so was both fluff and a second thing to
 * read. The lit tube carries `data-launch-from`, so the trail is measured from
 * the exact point the ember sits at.
 */
// Four mortar tubes. The second is the loaded one — its mouth is where the
// trail is measured from, so its x/y are referenced below rather than repeated.
const TUBES = [
  { x: 42, h: 26, rot: -11 },
  { x: 62, h: 40, rot: -3 },
  { x: 82, h: 24, rot: 5 },
  { x: 100, h: 31, rot: 12 },
];
const LIT = TUBES[1];
const CRATE_TOP = 86;
const FUSE = { x: LIT.x - 2, y: CRATE_TOP - LIT.h - 6 };

function LaunchBox() {
  return (
    <svg viewBox="0 0 160 116" aria-hidden className="h-28 w-40 overflow-visible">
      {/* the ground it stands on — a hairline, fading at both ends */}
      <defs>
        <linearGradient id="launch-ground" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--border)" stopOpacity={0} />
          <stop offset="30%" stopColor="var(--border)" stopOpacity={1} />
          <stop offset="70%" stopColor="var(--border)" stopOpacity={1} />
          <stop offset="100%" stopColor="var(--border)" stopOpacity={0} />
        </linearGradient>
        <radialGradient id="launch-halo">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <line x1="4" y1="110" x2="156" y2="110" stroke="url(#launch-ground)" strokeWidth="1" />

      {TUBES.map((t) => (
        <rect
          key={t.x}
          x={t.x - 5}
          y={CRATE_TOP - t.h}
          width="10"
          height={t.h + 6}
          rx="2.5"
          fill="var(--surface-muted)"
          stroke="var(--border)"
          strokeWidth="1"
          transform={`rotate(${t.rot} ${t.x} ${CRATE_TOP})`}
        />
      ))}

      {/* the crate */}
      <rect
        x="26"
        y={CRATE_TOP - 2}
        width="108"
        height="26"
        rx="4"
        fill="var(--surface)"
        stroke="var(--border)"
        strokeWidth="1"
      />
      {/* banded like a real crate, and two slats for weight */}
      <rect x="26" y={CRATE_TOP + 8} width="108" height="3.5" fill="var(--primary)" opacity="0.45" />
      <line x1="48" y1={CRATE_TOP - 2} x2="48" y2={CRATE_TOP + 24} stroke="var(--border)" strokeWidth="1" />
      <line x1="112" y1={CRATE_TOP - 2} x2="112" y2={CRATE_TOP + 24} stroke="var(--border)" strokeWidth="1" />

      {/* two spent embers on the ground — this crate has been used before */}
      <circle cx="20" cy="108" r="1.4" fill="var(--primary)" opacity="0.35" />
      <circle cx="142" cy="107" r="1.1" fill="var(--accent)" opacity="0.3" />

      {/* the lit fuse. `group-hover` lifts it, so the crate feels ready to go */}
      <g className="transition-transform duration-[var(--dur-base)] group-hover:-translate-y-1">
        <circle cx={FUSE.x} cy={FUSE.y} r="14" fill="url(#launch-halo)" />
        <circle cx={FUSE.x} cy={FUSE.y} r="3.4" fill="var(--brand)" />
        <circle cx={FUSE.x} cy={FUSE.y} r="1.4" fill="#fff" opacity="0.9" />
      </g>
      <circle data-launch-from cx={FUSE.x} cy={FUSE.y} r="0.5" fill="none" />
    </svg>
  );
}

export function LaunchPad() {
  const canReplay = !useReducedMotion();

  if (!canReplay) return <LaunchBox />;

  return (
    <button
      type="button"
      onClick={replayLaunch}
      aria-label="Set the firework off again"
      className="group -m-2 rounded-2xl p-2 transition-transform duration-[var(--dur-fast)] hover:scale-105 active:scale-95"
    >
      <LaunchBox />
    </button>
  );
}
