"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type CustomOption = { id: string; label: string; price: number };

export type OptionGroup = {
  id: string;
  title: string;
  type: "single" | "multi";
  required?: boolean;
  options: CustomOption[];
};

export type ItemCustomisation = {
  selections: Record<string, string[]>;
  qty: number;
  note: string;
  extraPrice: number;
};

interface RawOptionLabel {
  id: string;
  label: string;
}

const PROTEIN_PRICES: Record<string, number> = {
  pork: 0,
  chicken: 0,
  prawn: 1.5,
  beef: 1.5,
  tofu: 0,
  pork_belly: 2.0,
  mixed: 1.0,
};

const EXTRAS_PRICES: Record<string, number> = {
  extra_beef: 3.0,
  extra_chicken: 3.0,
  extra_prawn: 3.0,
  extra_seafood: 5.0,
  extra_crispy_pork: 5.0,
  extra_veggies: 3.0,
  extra_noodles: 2.0,
  extra_fried_egg: 2.5,
  extra_broth: 2.0,
  extra_chilli: 1.0,
  extra_sauce: 2.0,
};

const SAUCE_PRICES: Record<string, number> = {
  sauce_mayo: 1.0,
  sauce_hoisin: 1.0,
  sauce_fish: 1.0,
  sauce_soy: 1.0,
  sauce_chilli: 1.0,
  no_sauce: 0,
};

function mergeLabels(
  raw: RawOptionLabel[],
  prices: Record<string, number>,
): CustomOption[] {
  return raw.map(({ id, label }) => ({ id, label, price: prices[id] ?? 0 }));
}

export function useOptionGroups(category: string): OptionGroup[] {
  const t = useTranslations("ItemCustomiseModal");

  return useMemo(() => {
    const cat = category.toLowerCase();

    const proteins = mergeLabels(
      t.raw("proteinOptions") as RawOptionLabel[],
      PROTEIN_PRICES,
    );
    const extras = mergeLabels(
      t.raw("unifiedExtras") as RawOptionLabel[],
      EXTRAS_PRICES,
    );
    const banhMiVeg = mergeLabels(
      t.raw("banhMiVeggies") as RawOptionLabel[],
      {},
    );
    const spices = mergeLabels(t.raw("spiceOptions") as RawOptionLabel[], {});
    const sauces = mergeLabels(
      t.raw("sauceOptions") as RawOptionLabel[],
      SAUCE_PRICES,
    );

    const titles = t.raw("groupTitles") as Record<string, string>;

    if (cat.includes("bánh mì") || cat.includes("banh mi")) {
      return [
        {
          id: "protein",
          title: titles.protein_banh_mi,
          type: "single",
          required: true,
          options: proteins,
        },
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        {
          id: "veggies",
          title: titles.veggies,
          type: "multi",
          options: banhMiVeg,
        },
        {
          id: "spice",
          title: titles.spice,
          type: "single",
          required: true,
          options: spices,
        },
        {
          id: "sauce",
          title: titles.sauce_banh_mi,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("pho") ||
      cat.includes("phở") ||
      cat.includes("bún bò") ||
      cat.includes("soup")
    ) {
      return [
        {
          id: "extras",
          title: titles.extras,
          type: "multi",
          required: false,
          options: extras,
        },
        {
          id: "spice",
          title: titles.spice,
          type: "single",
          required: true,
          options: spices,
        },
        {
          id: "sauce",
          title: titles.sauce_condiments,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("rice paper") ||
      cat.includes("cuốn") ||
      cat.includes("goi") ||
      cat.includes("gỏi")
    ) {
      return [
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_condiments,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("com") ||
      cat.includes("rice") ||
      cat.includes("fried rice") ||
      cat.includes("bun") ||
      cat.includes("bún")
    ) {
      return [
        {
          id: "protein",
          title: titles.protein_rice,
          type: "single",
          options: proteins,
        },
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_banh_mi,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("chicken") ||
      cat.includes("burger") ||
      cat.includes("stir") ||
      cat.includes("noodle") ||
      cat.includes("main")
    ) {
      return [
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_banh_mi,
          type: "multi",
          options: sauces,
        },
      ];
    }

    if (
      cat.includes("entrée") ||
      cat.includes("entree") ||
      cat.includes("appetis") ||
      cat.includes("starter")
    ) {
      return [
        { id: "extras", title: titles.extras, type: "multi", options: extras },
        { id: "spice", title: titles.spice, type: "single", options: spices },
        {
          id: "sauce",
          title: titles.sauce_condiments,
          type: "multi",
          options: sauces,
        },
      ];
    }

    return [
      { id: "spice", title: titles.spice, type: "single", options: spices },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
}

function initialSelections(groups: OptionGroup[]): Record<string, string[]> {
  const init: Record<string, string[]> = {};
  groups.forEach((g) => {
    init[g.id] = g.id === "spice" ? ["medium"] : [];
  });
  return init;
}

function initialExpanded(groups: OptionGroup[]): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  groups.forEach((g) => {
    init[g.id] = true;
  });
  return init;
}

export function getMissingRequiredOptionGroups(
  groups: OptionGroup[],
  selections: Record<string, string[]>,
): OptionGroup[] {
  return groups.filter(
    (group) =>
      group.required && (selections[group.id] ?? []).length === 0,
  );
}

export function computeExtraPrice(
  groups: OptionGroup[],
  selections: Record<string, string[]>,
): number {
  let total = 0;
  groups.forEach((g) => {
    (selections[g.id] ?? []).forEach((optId) => {
      const opt = g.options.find((o) => o.id === optId);
      if (opt) total += opt.price;
    });
  });
  return total;
}

export function useItemCustomisationState(category: string) {
  const groups = useOptionGroups(category);

  const [selections, setSelections] = useState<Record<string, string[]>>(
    () => initialSelections(groups),
  );
  const [note, setNote] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => initialExpanded(groups),
  );

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleOption = (
    groupId: string,
    optionId: string,
    type: "single" | "multi",
  ) => {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (type === "single") {
        return {
          ...prev,
          [groupId]: current.includes(optionId) ? [] : [optionId],
        };
      }
      return {
        ...prev,
        [groupId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const extraPrice = useMemo(
    () => computeExtraPrice(groups, selections),
    [groups, selections],
  );

  const setGroupSelection = (groupId: string, ids: string[]) => {
    setSelections((prev) => ({ ...prev, [groupId]: ids }));
  };

  const buildCustomisation = (qty: number): ItemCustomisation => ({
    selections,
    qty,
    note,
    extraPrice,
  });

  return {
    groups,
    selections,
    note,
    setNote,
    expandedGroups,
    toggleGroup,
    toggleOption,
    setGroupSelection,
    extraPrice,
    buildCustomisation,
  };
}
