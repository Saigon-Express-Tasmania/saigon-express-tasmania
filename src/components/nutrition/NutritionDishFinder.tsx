"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  NUTRITION_DISHES,
  type AllergenKey,
  type NutritionDish,
} from "@/data/nutrition-dishes";
import { nutritionDietStyles } from "@/lib/nutrition-palette";

type DietFilter = "all" | "veg" | "vegan" | "halal";

const ALLERGEN_LABELS: Record<AllergenKey, string> = {
  gluten: "Gluten",
  nuts: "Nuts",
  dairy: "Dairy",
  egg: "Egg",
  soy: "Soy",
  fish: "Fish",
  crustacean: "Shellfish",
  sesame: "Sesame",
};

const DIET_FILTERS: {
  id: DietFilter;
  label: string;
  dot?: string;
}[] = [
  { id: "all", label: "All dishes" },
  { id: "veg", label: "Vegetarian", dot: nutritionDietStyles.vegetarian.dot },
  { id: "vegan", label: "Vegan", dot: nutritionDietStyles.vegan.dot },
  { id: "halal", label: "Halal (Sandy Bay)", dot: nutritionDietStyles.halal.dot },
];

const ALLERGEN_FILTERS: { id: AllergenKey; label: string }[] = [
  { id: "gluten", label: "Gluten" },
  { id: "nuts", label: "Nuts / Peanut" },
  { id: "dairy", label: "Dairy" },
  { id: "egg", label: "Egg" },
  { id: "soy", label: "Soy" },
  { id: "fish", label: "Fish" },
  { id: "crustacean", label: "Crustacean / Shellfish" },
  { id: "sesame", label: "Sesame" },
];

const CATEGORY_ORDER = NUTRITION_DISHES.reduce<string[]>((order, dish) => {
  if (!order.includes(dish.category)) order.push(dish.category);
  return order;
}, []);

function dishMatches(
  dish: NutritionDish,
  diet: DietFilter,
  avoid: Set<AllergenKey>,
) {
  if (diet === "veg" && !dish.veg) return false;
  if (diet === "vegan" && !dish.vegan) return false;
  if (diet === "halal" && !dish.halal) return false;
  return !dish.allergens.some((allergen) => avoid.has(allergen));
}

function DishCard({ dish }: { dish: NutritionDish }) {
  const { vegetarian, vegan, halal, allergen } = nutritionDietStyles;

  return (
    <div className="rounded-xl border border-stone-200 bg-brand-cream p-4">
      <h4 className="text-[0.98rem] font-semibold text-brand-dark">
        {dish.name}
      </h4>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {dish.veg ? (
          <span
            className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide"
            style={{
              backgroundColor: vegetarian.badgeBg,
              color: vegetarian.badgeText,
            }}
          >
            Vegetarian
          </span>
        ) : null}
        {dish.vegan ? (
          <span
            className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide"
            style={{
              backgroundColor: vegan.badgeBg,
              color: vegan.badgeText,
            }}
          >
            Vegan
          </span>
        ) : null}
        {dish.halal ? (
          <span
            className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide"
            style={{
              backgroundColor: halal.badgeBg,
              color: halal.badgeText,
            }}
          >
            Halal · Sandy Bay
          </span>
        ) : null}
        {dish.allergens.map((item) => (
          <span
            key={item}
            className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide"
            style={{
              backgroundColor: allergen.badgeBg,
              color: allergen.badgeText,
            }}
          >
            {ALLERGEN_LABELS[item]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function NutritionDishFinder() {
  const [diet, setDiet] = useState<DietFilter>("all");
  const [avoid, setAvoid] = useState<Set<AllergenKey>>(() => new Set());
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set());

  const filtersActive = diet !== "all" || avoid.size > 0;

  const grouped = useMemo(() => {
    const matches = NUTRITION_DISHES.filter((dish) =>
      dishMatches(dish, diet, avoid),
    );
    const byCategory = new Map<string, NutritionDish[]>();

    for (const dish of matches) {
      const items = byCategory.get(dish.category) ?? [];
      items.push(dish);
      byCategory.set(dish.category, items);
    }

    return CATEGORY_ORDER.flatMap((category) => {
      const items = byCategory.get(category);
      return items?.length ? [{ category, items }] : [];
    });
  }, [diet, avoid]);

  const shownCount = grouped.reduce((sum, group) => sum + group.items.length, 0);

  const toggleAllergen = (allergen: AllergenKey) => {
    setAvoid((current) => {
      const next = new Set(current);
      if (next.has(allergen)) next.delete(allergen);
      else next.add(allergen);
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    if (filtersActive) return;
    setOpenCats((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const expandAll = () => setOpenCats(new Set(CATEGORY_ORDER));
  const collapseAll = () => setOpenCats(new Set());

  return (
    <section
      id="finder"
      className="scroll-mt-24 border-y border-stone-200 bg-white py-16 md:py-[66px]"
    >
      <div className="mx-auto max-w-[1120px] px-6">
        <SectionEyebrow>The live finder</SectionEyebrow>
        <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,2.9rem)] font-black leading-tight text-brand-red">
          What can I eat?
        </h2>
        <p className="mt-2 max-w-[640px] font-light text-stone-600">
          Pick a diet, then tell us what to avoid. Showing{" "}
          <span className="font-semibold text-brand-red">{shownCount}</span>{" "}
          dishes.{" "}
          <em className="text-stone-500">
            Halal-suitable options are available at our Sandy Bay store only.
          </em>
        </p>

        <div className="mt-9 flex flex-wrap gap-2.5">
          {DIET_FILTERS.map((filter) => {
            const active = diet === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setDiet(filter.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2 text-[0.82rem] font-semibold transition-colors ${
                  active
                    ? "border-brand-red bg-brand-red text-white"
                    : "border-stone-200 bg-white text-brand-dark hover:border-brand-red"
                }`}
              >
                {filter.dot ? (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: filter.dot }}
                  />
                ) : null}
                {filter.label}
              </button>
            );
          })}
        </div>

        <p className="mb-2.5 mt-5 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-stone-500">
          Avoid these allergens
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          {ALLERGEN_FILTERS.map((filter) => {
            const active = avoid.has(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => toggleAllergen(filter.id)}
                className={`rounded-[9px] border-[1.5px] px-3 py-1.5 text-[0.78rem] font-medium transition-colors ${
                  active
                    ? "font-semibold"
                    : "border-stone-200 bg-white text-stone-500 hover:border-brand-amber hover:text-brand-dark"
                }`}
                style={
                  active
                    ? {
                        borderColor: nutritionDietStyles.allergen.activeBorder,
                        backgroundColor: nutritionDietStyles.allergen.activeBg,
                        color: nutritionDietStyles.allergen.activeText,
                      }
                    : undefined
                }
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={expandAll}
            className="text-[0.8rem] font-semibold text-brand-red underline underline-offset-[3px] hover:text-[#a50d25]"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[0.8rem] font-semibold text-brand-red underline underline-offset-[3px] hover:text-[#a50d25]"
          >
            Collapse all
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {grouped.length === 0 ? (
            <div className="py-10 text-center font-light text-stone-500">
              No dishes match those filters — try removing an allergen, or ask
              our staff about custom options.
            </div>
          ) : (
            grouped.map(({ category, items }) => {
              const expanded = filtersActive || openCats.has(category);
              return (
                <div
                  key={category}
                  className="rounded-[14px] border border-stone-200 bg-white p-3"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-brand-cream"
                  >
                    <span className="font-serif text-[1.15rem] font-semibold text-brand-red">
                      {category}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-[22px] min-w-[26px] items-center justify-center rounded-full bg-brand-red px-2 text-[0.74rem] font-semibold text-white">
                        {items.length}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-brand-red transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>
                  {expanded ? (
                    <div className="grid gap-3.5 pt-2 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((dish) => (
                        <DishCard key={dish.name} dish={dish} />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-brand-red">
      <span className="h-0.5 w-[26px] bg-brand-red" />
      {children}
    </p>
  );
}
