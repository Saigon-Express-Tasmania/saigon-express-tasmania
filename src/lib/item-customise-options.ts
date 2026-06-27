"use client";

import type { MenuItem } from "@/contexts/CartContext";
import { useProductCustomizations } from "@/contexts/ProductCustomizationsContext";
import {
  computeExtraPrice,
  getMissingRequiredOptionGroups,
  initialSelections,
  type ItemCustomisation,
  type OptionGroup,
} from "@/lib/product-customizations";
import { useMemo, useState } from "react";

export type {
  CustomOption,
  ItemCustomisation,
  OptionGroup,
} from "@/lib/product-customizations";

export { computeExtraPrice, getMissingRequiredOptionGroups };

export function useOptionGroupsForItem(item: MenuItem): OptionGroup[] {
  const { getOptionGroupsForItem } = useProductCustomizations();
  return useMemo(() => getOptionGroupsForItem(item), [getOptionGroupsForItem, item]);
}

function initialExpanded(groups: OptionGroup[]): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  groups.forEach((group) => {
    init[group.id] = true;
  });
  return init;
}

export function useItemCustomisationState(item: MenuItem) {
  const groups = useOptionGroupsForItem(item);

  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    initialSelections(groups),
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
