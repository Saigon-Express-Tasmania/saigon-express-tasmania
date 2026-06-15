import { DM_Sans, Noto_Sans, Noto_Serif } from "next/font/google";
import localFont from "next/font/local";

/** Primary UI sans — self-hosted via next/font (avoids render-blocking CSS @import). */
export const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
});

/** Serif headings — full Vietnamese coverage (Playfair/DM Serif lack vi glyphs). */
export const notoSerif = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

/** Sans fallback for Vietnamese body/UI when DM Sans has no glyph. */
export const notoSans = Noto_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-fallback",
  display: "swap",
});

export const roseberry = localFont({
  src: [
    {
      path: "./fonts/Roseberry-Codet.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Roseberry-serif.ttf",
      weight: "400",
      style: "oblique",
    },
  ],
  variable: "--font-roseberry",
  display: "swap",
});

export const fontAwesome = localFont({
  src: "./fonts/fontawesome-webfont.woff2",
  variable: "--font-awesome",
  display: "swap",
  preload: false,
});
