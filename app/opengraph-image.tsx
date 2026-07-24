import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "OnFIRE — UK FIRE Planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colours (Ink & Lime), inlined — the OG renderer has no access to the
// app's CSS custom properties.
const INK = "#0b0c10";
const LIME = "#bef264";
const AMBER = "#fbbf24";
const MUTED = "#99a1ae";

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
          background: INK,
          color: "#f3f5f8",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: LIME,
              color: INK,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            £
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            <span>On</span>
            <span style={{ color: LIME }}>FIRE</span>
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
              maxWidth: 900,
            }}
          >
            <span>Plan your UK&nbsp;</span>
            <span style={{ color: LIME }}>FIRE</span>
            <span>&nbsp;journey.</span>
          </div>
          <div style={{ fontSize: 30, color: MUTED, maxWidth: 940, lineHeight: 1.35 }}>
            Model ISA, GIA, SIPP, State Pension and property with correct
            2026/27 UK tax — and find your FIRE number.
          </div>
        </div>

        {/* Footer chips */}
        <div style={{ display: "flex", gap: 16, fontSize: 24, color: MUTED }}>
          <span style={{ color: AMBER }}>●</span>
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
