#!/usr/bin/env node
/**
 * Populate food_content and spicy_level on refs/alacarte-products.json from text fields.
 *
 * Usage:
 *   node scripts/populate-alacarte-food-content.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputFile = path.join(root, "refs/alacarte-products.json");

const FOOD_CONTENT_KEYS = [
  "contains_pork",
  "contains_beef",
  "contains_chicken",
  "contains_duck",
  "contains_goat",
  "contains_game",
  "contains_turkey",
  "contains_lamb",
  "contains_shellfish",
  "contains_fish",
  "contains_crustaceans",
  "contains_molluscs",
  "contains_peanuts",
  "contains_tree_nuts",
  "contains_almonds",
  "contains_cashews",
  "contains_walnuts",
  "contains_soy",
  "contains_wheat",
  "contains_gluten",
  "contains_eggs",
  "contains_dairy",
  "contains_milk",
  "contains_cheese",
  "contains_sesame",
  "contains_mustard",
  "contains_celery",
  "contains_lupin",
  "contains_sulphites",
  "is_gluten_free",
  "is_dairy_free",
  "is_lactose_free",
  "is_vegan",
  "is_vegetarian",
  "is_halal",
  "is_kosher",
  "is_non_gmo",
  "is_organic",
  "is_sugar_free",
  "is_low_sodium",
  "is_keto_friendly",
  "is_spicy",
  "contains_alcohol",
  "contains_caffeine",
  "is_raw",
  "is_frozen",
  "is_ready_to_eat",
];

function emptyFoodContent() {
  return Object.fromEntries(FOOD_CONTENT_KEYS.map((key) => [key, false]));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKeyword(textToSearch, keywords) {
  return keywords.some((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`).test(textToSearch));
}

function updateProduct(product) {
  const name = (product.name ?? "").toLowerCase();
  const desc = (product.description ?? "").toLowerCase();
  const ingredients = product.ingredients ?? {};
  const contents = (ingredients.contents ?? "").toLowerCase();
  const allergens = (ingredients.allergens ?? "").toLowerCase();

  const textToSearch = `${name} | ${desc} | ${contents} | ${allergens}`;
  const fc = emptyFoodContent();

  fc.contains_pork = hasKeyword(textToSearch, ["pork", "char siu", "bacon", "ham"]);
  fc.contains_beef = hasKeyword(textToSearch, ["beef", "steak", "brisket"]);
  fc.contains_chicken = hasKeyword(textToSearch, ["chicken", "poultry"]);
  fc.contains_duck = hasKeyword(textToSearch, ["duck", "vit quay"]);
  fc.contains_lamb = hasKeyword(textToSearch, ["lamb", "mutton"]);

  fc.contains_shellfish = hasKeyword(textToSearch, [
    "shellfish",
    "prawn",
    "prawns",
    "shrimp",
    "crab",
    "lobster",
    "mussel",
    "squid",
  ]);
  fc.contains_fish = hasKeyword(textToSearch, ["fish", "fish sauce", "salmon", "tuna"]);
  fc.contains_crustaceans = hasKeyword(textToSearch, [
    "crustacean",
    "prawn",
    "prawns",
    "shrimp",
    "crab",
    "lobster",
  ]);
  fc.contains_molluscs = hasKeyword(textToSearch, [
    "mollusc",
    "squid",
    "mussel",
    "octopus",
    "scallop",
  ]);

  fc.contains_peanuts = hasKeyword(textToSearch, ["peanut", "peanuts"]);
  fc.contains_tree_nuts = hasKeyword(textToSearch, [
    "tree nut",
    "tree nuts",
    "almond",
    "cashew",
    "walnut",
    "macadamia",
    "pecan",
  ]);
  fc.contains_almonds = hasKeyword(textToSearch, ["almond", "almonds"]);
  fc.contains_cashews = hasKeyword(textToSearch, ["cashew", "cashews"]);
  fc.contains_walnuts = hasKeyword(textToSearch, ["walnut", "walnuts"]);
  fc.contains_sesame = hasKeyword(textToSearch, ["sesame", "sesame seeds"]);
  fc.contains_soy = hasKeyword(textToSearch, ["soy", "soya", "tofu", "hoisin"]);

  fc.contains_eggs = hasKeyword(textToSearch, ["egg", "eggs", "mayo", "mayonnaise"]);
  fc.contains_dairy = hasKeyword(textToSearch, ["dairy", "milk", "cheese", "butter", "cream"]);
  fc.contains_milk = hasKeyword(textToSearch, ["milk", "dairy"]);
  fc.contains_cheese = hasKeyword(textToSearch, ["cheese"]);

  fc.contains_wheat = hasKeyword(textToSearch, ["wheat", "flour", "noodles", "baguette", "batter"]);
  fc.contains_gluten = hasKeyword(textToSearch, [
    "gluten",
    "wheat",
    "soy sauce",
    "hoisin",
    "batter",
    "baguette",
    "wonton",
  ]);

  fc.contains_celery = hasKeyword(textToSearch, ["celery"]);
  fc.contains_mustard = hasKeyword(textToSearch, ["mustard"]);
  fc.contains_sulphites = hasKeyword(textToSearch, ["sulphite", "sulfite", "wine"]);

  const isMeatFree = ![
    fc.contains_pork,
    fc.contains_beef,
    fc.contains_chicken,
    fc.contains_duck,
    fc.contains_lamb,
    fc.contains_shellfish,
    fc.contains_fish,
    fc.contains_crustaceans,
    fc.contains_molluscs,
  ].some(Boolean);

  fc.is_vegetarian =
    isMeatFree && !hasKeyword(textToSearch, ["fish sauce", "shrimp paste", "oyster sauce"]);
  fc.is_vegan =
    fc.is_vegetarian &&
    !fc.contains_eggs &&
    !fc.contains_dairy &&
    !hasKeyword(textToSearch, ["honey", "pâté"]);

  fc.is_gluten_free = !fc.contains_gluten;
  fc.is_dairy_free = !fc.contains_dairy;
  fc.is_lactose_free = !fc.contains_dairy;

  let spicyLevel = 0;
  if (hasKeyword(textToSearch, ["fiery", "spicy beef bone broth", "spicy lemongrass broth"])) {
    spicyLevel = 3;
  } else if (hasKeyword(textToSearch, ["chilli paste", "red chilli", "chilli oil"])) {
    spicyLevel = 2;
  } else if (
    hasKeyword(textToSearch, ["sweet chilli", "chili jam", "black pepper", "curry powder"])
  ) {
    spicyLevel = 1;
  }

  fc.is_spicy = spicyLevel > 0;

  product.food_content = fc;
  product.spicy_level = spicyLevel;
}

const products = JSON.parse(fs.readFileSync(inputFile, "utf8"));
for (const product of products) {
  updateProduct(product);
}

fs.writeFileSync(inputFile, `${JSON.stringify(products, null, 2)}\n`, "utf8");

const spicyCount = products.filter((p) => (p.spicy_level ?? 0) > 0).length;
const flaggedCount = products.filter((p) =>
  Object.entries(p.food_content ?? {}).some(([key, value]) => key !== "is_spicy" && value),
).length;

console.log(`Updated ${products.length} products in ${inputFile}`);
console.log(`  ${flaggedCount} products with at least one allergen/dietary flag`);
console.log(`  ${spicyCount} products with spicy_level > 0`);
