import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fireworks — FIRE & Early Retirement Planner",
    short_name: "Fireworks",
    description: "Model your Financial Independence, Retire Early plan across ISA, GIA, SIPP, State Pension and property.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
