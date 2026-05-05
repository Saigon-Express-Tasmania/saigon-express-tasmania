import localFont from "next/font/local";

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
