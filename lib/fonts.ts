import localFont from "next/font/local";

export const alarabiya = localFont({
  src: [
    { path: "../app/fonts/alarabiya-boutros2026-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/alarabiya-boutros2026-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
  fallback: ["Arial", "Helvetica Neue", "Helvetica", "sans-serif"],
});
