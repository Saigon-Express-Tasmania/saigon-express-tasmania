/** Warm, diversified palette harmonized with brand red (#C8102E). */
export const nutritionPalette = {
  red: "#C8102E",
  redDark: "#a50d25",
  burgundy: "#8f0c24",
  wine: "#6b1020",
  coral: "#d94a55",
  terracotta: "#c4684a",
  amber: "#E8A020",
  amberDark: "#b87a10",
  tan: "#d4a574",
  dark: "#1A1A1A",
  veg: "#3d7355",
  vegDark: "#2d5a42",
  vegan: "#4a9e62",
  veganDark: "#357a4d",
} as const;

export const nutritionDietStyles = {
  vegetarian: {
    card: "bg-gradient-to-br from-[#3d7355] to-[#2d5a42]",
    dot: nutritionPalette.veg,
    badgeBg: "#e8f2ec",
    badgeText: nutritionPalette.vegDark,
  },
  vegan: {
    card: "bg-gradient-to-br from-[#4a9e62] to-[#357a4d]",
    dot: nutritionPalette.vegan,
    badgeBg: "#e5f2e8",
    badgeText: nutritionPalette.veganDark,
  },
  halal: {
    card: "bg-gradient-to-br from-[#1A1A1A] to-[#8f0c24]",
    dot: nutritionPalette.burgundy,
    badgeBg: "#f3e6ea",
    badgeText: nutritionPalette.burgundy,
  },
  allergy: {
    card: "bg-gradient-to-br from-[#C8102E] to-[#a50d25]",
    dot: nutritionPalette.red,
    badgeBg: "#fce8eb",
    badgeText: nutritionPalette.red,
  },
  allergen: {
    badgeBg: "#fff4e0",
    badgeText: nutritionPalette.amberDark,
    activeBg: "#fff4e0",
    activeBorder: nutritionPalette.amber,
    activeText: nutritionPalette.amberDark,
  },
} as const;

export const nutritionAllergenKeyColors = [
  nutritionPalette.red,
  nutritionPalette.amber,
  nutritionPalette.terracotta,
  nutritionPalette.coral,
  nutritionPalette.amberDark,
  nutritionPalette.burgundy,
  nutritionPalette.tan,
  nutritionPalette.veg,
  nutritionPalette.wine,
  nutritionPalette.redDark,
  nutritionPalette.dark,
  "#c98a18",
  nutritionPalette.vegan,
  nutritionPalette.wine,
] as const;

/** Primary icon color per SVG (matches diversified fills in public/nutritions). */
export const nutritionAllergenSvgColors = {
  "contains-gluten.svg": "#E8B14C",
  "contains-sesame-seeds.svg": "#9b8dc4",
  "contains-nuts.svg": "#a06b4a",
  "contains-crustaceans.svg": "#e07a5f",
  "contains-eggs.svg": "#e8a33d",
  "contains-fish.svg": "#3fa9c9",
  "contains-peanuts.svg": "#7cae57",
  "contains-soybeans.svg": "#8bbf5a",
  "contains-molluscs.svg": "#e07a9c",
  "contains-lupin.svg": "#e8c14c",
  "contains-sulphur-dioxide-and-sulphites.svg": "#4bb0c9",
  "contains-milk.svg": "#c9a24b",
  "vegan.svg": nutritionPalette.vegan,
  "halal.svg": "#00a652",
} as const;

export const nutritionAllergenKeys = [
  { label: "Gluten", src: "/nutritions/gluten.png" },
  { label: "Sesame", src: "/nutritions/sesame.png" },
  { label: "Nuts", src: "/nutritions/nuts.png" },
  { label: "Crustacean", src: "/nutritions/crustaceans.png" },
  { label: "Eggs", src: "/nutritions/eggs.png" },
  { label: "Fish", src: "/nutritions/fish.png" },
  { label: "Peanuts", src: "/nutritions/peanuts.png" },
  { label: "Soya", src: "/nutritions/soya.png" },
  { label: "Shellfish", src: "/nutritions/molluscs.png" },
  { label: "Lupins", src: "/nutritions/lupin.png" },
  { label: "Sulphite", src: "/nutritions/sulphite.png" },
  { label: "Dairy", src: "/nutritions/contains-milk.svg", variant: "dairy" as const },
  { label: "Vegan", src: "/nutritions/vegan.png" },
  { label: "Halal · Sandy Bay", src: "/nutritions/halal.svg", variant: "halal" as const },
] as const;

export const nutritionAllergenKeyItems = nutritionAllergenKeys.map((item) => ({
  label: item.label,
  src: item.src,
  variant: "variant" in item ? item.variant : ("default" as const),
}));

export const nutritionDietGuideCards = [
  {
    href: "#finder",
    title: "Vegetarian",
    description:
      "Tofu rolls, veggie pho, fresh salads & more — no meat, big flavour.",
    image: "/nutritions/tofu-bao.png",
    overlayGradient:
      "linear-gradient(to top, rgba(180, 132, 84, 1) 15%, rgba(180, 132, 84, 0.8) 50%, transparent)",      
  },
  {
    href: "#finder",
    title: "Vegan",
    description:
      "Fully plant-based options — just ask us to skip egg mayo & fish sauce.",
    image: "/nutritions/vegan-soup.jpg",
    overlayGradient:
      "linear-gradient(to top, rgba(63, 94, 76, 1) 15%, rgba(63, 94, 76, 0.8) 50%, transparent)",
  },
  {
    href: "#finder",
    title: "Halal Suitable",
    description:
      "Available at our Sandy Bay store only — chicken, beef, duck & tofu, no pork or pâté.",
    image: "/nutritions/halal-chicken-prawn-salad.png",
    overlayGradient:
      "linear-gradient(to top, rgba(82, 145, 100, 1) 15%, rgba(82, 145, 100, 0.8) 50%, transparent)",      
  },
  {
    href: "#finder",
    title: "Allergy & Gluten",
    description: "Filter out nuts, gluten, shellfish, dairy, egg, soy, sesame.",
    image: "/nutritions/food-safety.jpg",
    overlayGradient:
      "linear-gradient(to top, rgba(184, 45, 56, 1) 15%, rgba(184, 45, 56, 0.8) 50%, transparent)",
  },
] as const;

export const nutritionCardHover =
  "hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(200,16,46,0.22)]";
