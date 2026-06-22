#!/usr/bin/env python3
"""Populate food_content and spicy_level on refs/alacarte-products.json from text fields."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT_FILE = ROOT / "refs" / "alacarte-products.json"

FOOD_CONTENT_KEYS = [
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
]


def empty_food_content() -> dict:
    return {key: False for key in FOOD_CONTENT_KEYS}


def has_keyword(text_to_search: str, keywords: list[str]) -> bool:
    return any(re.search(rf"\b{re.escape(kw)}\b", text_to_search) for kw in keywords)


def update_product(product: dict) -> None:
    name = product.get("name", "").lower()
    desc = product.get("description", "").lower()
    ingredients = product.get("ingredients") or {}
    contents = (ingredients.get("contents") or "").lower()
    allergens = (ingredients.get("allergens") or "").lower()

    text_to_search = f"{name} | {desc} | {contents} | {allergens}"

    fc = empty_food_content()

    # Meat & Poultry
    fc["contains_pork"] = has_keyword(text_to_search, ["pork", "char siu", "bacon", "ham"])
    fc["contains_beef"] = has_keyword(text_to_search, ["beef", "steak", "brisket"])
    fc["contains_chicken"] = has_keyword(text_to_search, ["chicken", "poultry"])
    fc["contains_duck"] = has_keyword(text_to_search, ["duck", "vit quay"])
    fc["contains_lamb"] = has_keyword(text_to_search, ["lamb", "mutton"])

    # Seafood
    fc["contains_shellfish"] = has_keyword(
        text_to_search,
        ["shellfish", "prawn", "prawns", "shrimp", "crab", "lobster", "mussel", "squid"],
    )
    fc["contains_fish"] = has_keyword(text_to_search, ["fish", "fish sauce", "salmon", "tuna"])
    fc["contains_crustaceans"] = has_keyword(
        text_to_search, ["crustacean", "prawn", "prawns", "shrimp", "crab", "lobster"]
    )
    fc["contains_molluscs"] = has_keyword(
        text_to_search, ["mollusc", "squid", "mussel", "octopus", "scallop"]
    )

    # Nuts, Seeds & Legumes
    fc["contains_peanuts"] = has_keyword(text_to_search, ["peanut", "peanuts"])
    fc["contains_tree_nuts"] = has_keyword(
        text_to_search,
        ["tree nut", "tree nuts", "almond", "cashew", "walnut", "macadamia", "pecan"],
    )
    fc["contains_almonds"] = has_keyword(text_to_search, ["almond", "almonds"])
    fc["contains_cashews"] = has_keyword(text_to_search, ["cashew", "cashews"])
    fc["contains_walnuts"] = has_keyword(text_to_search, ["walnut", "walnuts"])
    fc["contains_sesame"] = has_keyword(text_to_search, ["sesame", "sesame seeds"])
    fc["contains_soy"] = has_keyword(text_to_search, ["soy", "soya", "tofu", "hoisin"])

    # Dairy & Egg
    fc["contains_eggs"] = has_keyword(text_to_search, ["egg", "eggs", "mayo", "mayonnaise"])
    fc["contains_dairy"] = has_keyword(text_to_search, ["dairy", "milk", "cheese", "butter", "cream"])
    fc["contains_milk"] = has_keyword(text_to_search, ["milk", "dairy"])
    fc["contains_cheese"] = has_keyword(text_to_search, ["cheese"])

    # Gluten & Wheat
    fc["contains_wheat"] = has_keyword(text_to_search, ["wheat", "flour", "noodles", "baguette", "batter"])
    fc["contains_gluten"] = has_keyword(
        text_to_search, ["gluten", "wheat", "soy sauce", "hoisin", "batter", "baguette", "wonton"]
    )

    # Allergens explicitly mentioned
    fc["contains_celery"] = has_keyword(text_to_search, ["celery"])
    fc["contains_mustard"] = has_keyword(text_to_search, ["mustard"])
    fc["contains_sulphites"] = has_keyword(text_to_search, ["sulphite", "sulfite", "wine"])

    # Dietary Flags
    is_meat_free = not any(
        [
            fc["contains_pork"],
            fc["contains_beef"],
            fc["contains_chicken"],
            fc["contains_duck"],
            fc["contains_lamb"],
            fc["contains_shellfish"],
            fc["contains_fish"],
            fc["contains_crustaceans"],
            fc["contains_molluscs"],
        ]
    )

    fc["is_vegetarian"] = is_meat_free and not has_keyword(
        text_to_search, ["fish sauce", "shrimp paste", "oyster sauce"]
    )
    fc["is_vegan"] = (
        fc["is_vegetarian"]
        and not fc["contains_eggs"]
        and not fc["contains_dairy"]
        and not has_keyword(text_to_search, ["honey", "pâté"])
    )

    fc["is_gluten_free"] = not fc["contains_gluten"]
    fc["is_dairy_free"] = not fc["contains_dairy"]
    fc["is_lactose_free"] = not fc["contains_dairy"]

    # Spicy level (scale 0-5)
    spicy_level = 0
    if has_keyword(text_to_search, ["fiery", "spicy beef bone broth", "spicy lemongrass broth"]):
        spicy_level = 3
    elif has_keyword(text_to_search, ["chilli paste", "red chilli", "chilli oil"]):
        spicy_level = 2
    elif has_keyword(text_to_search, ["sweet chilli", "chili jam", "black pepper", "curry powder"]):
        spicy_level = 1

    fc["is_spicy"] = spicy_level > 0

    product["food_content"] = fc
    product["spicy_level"] = spicy_level


def main() -> None:
    with INPUT_FILE.open(encoding="utf-8") as f:
        products = json.load(f)

    for product in products:
        update_product(product)

    with INPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
        f.write("\n")

    spicy_count = sum(1 for p in products if p.get("spicy_level", 0) > 0)
    flagged_count = sum(
        1
        for p in products
        if any(v for k, v in p.get("food_content", {}).items() if k != "is_spicy" and v)
    )
    print(f"Updated {len(products)} products in {INPUT_FILE}")
    print(f"  {flagged_count} products with at least one allergen/dietary flag")
    print(f"  {spicy_count} products with spicy_level > 0")


if __name__ == "__main__":
    main()
