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

export const nutritionFaqItems = [
  {
    question: "What vegetarian and vegan options do you have?",
    answer:
      "Plenty. Our menu has 51 vegetarian and 18 vegan dishes — think crispy tofu rice-paper rolls, veggie & tofu phở, fresh bún salads, tofu banh mi, stir-fried vegetables and more. For a fully vegan meal, just ask us to leave out egg mayo, fish sauce and dairy. Use the live finder above to see every option.",
  },
  {
    question:
      "Do your dishes contain common allergens like nuts, gluten or dairy?",
    answer:
      "Some do. Our dishes may contain gluten, tree nuts/peanuts, dairy, egg, soy, fish, shellfish and sesame. Each dish is listed with its allergens in our Dietary & Allergen Guide and in the live finder — filter by the allergen you need to avoid. Please always tell our staff about your allergies before ordering.",
  },
  {
    question: "Can I get a gluten-free meal?",
    answer:
      "Many dishes — such as rice-paper rolls, phở and rice plates — are naturally lower in gluten. However, our kitchen handles wheat and gluten products, so we can't guarantee a dish is completely gluten-free. Let our team know about your sensitivity and we'll help you choose the safest option.",
  },
  {
    question: "Which store offers Halal-suitable dishes?",
    answer:
      "Halal-suitable options are available at our Sandy Bay store only. These dishes are prepared without pork or pâté, using chicken, beef, duck, prawn and tofu. Please note our kitchen is not Halal-certified — confirm availability and preparation with staff when you order.",
    highlight: "Sandy Bay store only",
  },
  {
    question: "Do your meals contain MSG?",
    answer:
      "We focus on fresh ingredients, aromatics and traditional Vietnamese seasonings for flavour. Some dishes may contain a small amount of MSG. If you'd prefer your meal without added MSG, let us know when ordering and we'll do our best to accommodate.",
  },
  {
    question: "Are there low-carb options?",
    answer:
      "Yes. Ask for a bún (vermicelli salad) or rice plate served without the rice or noodles, and pick your protein — lemongrass chicken, beef, prawn or tofu — with plenty of fresh salad. Our salads (gỏi) and many stir-fries are naturally lower in carbohydrates too.",
  },
  {
    question: "Can you customise a dish for my dietary needs?",
    answer:
      "Absolutely — we're happy to adjust dishes where we can (leave out a sauce, swap a protein, add extra veg, skip the egg or fish sauce). Just tell our staff your preferences when ordering and we'll guide you to the best choice.",
  },
  {
    question: "How accurate is the nutritional information?",
    answer:
      "The values in our guides are average estimates per serve and can vary with portion size, preparation and optional extras (extra egg, avocado, sauces). You can view them per dish in the live finder or download the full Nutritional Information guide above.",
  },
  {
    question: "Is there a risk of cross-contact in the kitchen?",
    answer:
      "Yes. We prepare many dishes in a shared, fast-moving kitchen, so traces of allergens such as nuts, sesame, egg, gluten, shellfish and dairy may transfer during storage or preparation. We take care to minimise this but can't guarantee complete separation. Please share any specific concerns and we'll do our best to help.",
  },
] as const;
