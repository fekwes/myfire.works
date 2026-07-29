import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Fireworks — FIRE & Early Retirement Planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colours (Night & Ember), inlined — the OG renderer has no access to the
// app's CSS custom properties.
const NIGHT = "#0f0b1e";
const TILE = "#141026";
const EMBER = "#ffad4e";
const GOLD = "#ffc24b";
const VIOLET = "#9e8cff";
const MUTED = "#a69fc6";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NIGHT,
          color: "#f3f1fb",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark & domain badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill={TILE} />
              <path
                d="M6 25C11 25 15 21 19 13"
                stroke={EMBER}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M20 6.5C21 11.5 21 11.5 26 13C21 14.5 21 14.5 20 19.5C19 14.5 19 14.5 14 13C19 11.5 19 11.5 20 6.5Z"
                fill={GOLD}
              />
            </svg>
            <div style={{ display: "flex", fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>
              <span>Fire</span>
              <span style={{ color: EMBER }}>·</span>
              <span>works</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: 24,
              border: `1.5px solid ${EMBER}`,
              backgroundColor: "rgba(255, 173, 78, 0.12)",
              color: GOLD,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            myfire.works
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            <span>Know your number. Know when.&nbsp;</span>
            <span style={{ color: EMBER }}>Know it&apos;ll hold.</span>
          </div>
          <div style={{ fontSize: 30, color: MUTED, maxWidth: 940, lineHeight: 1.35 }}>
            FIRE modelling across ISA, GIA, SIPP, State Pension and property —
            with the tax you&apos;ll actually pay.
          </div>
        </div>

        {/* Footer chips */}
        <div style={{ display: "flex", gap: 16, fontSize: 24, color: MUTED, alignItems: "center" }}>
          <span style={{ color: VIOLET }}>●</span>
          <span>Coast FIRE</span>
          <span>·</span>
          <span>Monte Carlo confidence</span>
          <span>·</span>
          <span>Tax-aware drawdown</span>
        </div>
      </div>
    ),
    size,
  );
}
