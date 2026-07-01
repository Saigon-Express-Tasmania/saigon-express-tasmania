"use client";

import type { MenuItem } from "@/contexts/CartContext";
import { useProductCustomizations } from "@/contexts/ProductCustomizationsContext";
import {
  buildCustomisationGroups,
  computeExtraPrice,
  getMissingRequiredOptionGroups,
  initialSelections,
  toggleOptionSelection,
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
      const group = groups.find((entry) => entry.id === groupId);
      if (!group) return prev;
      const current = prev[groupId] ?? [];
      return {
        ...prev,
        [groupId]: toggleOptionSelection(group, current, optionId),
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
    groups: buildCustomisationGroups(groups, selections),
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
