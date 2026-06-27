"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Flame, Leaf, MessageSquare } from "lucide-react";
import { SingleChoiceOptionIndicator } from "@/components/SingleChoiceCheckIndicator";
import type { CustomOption, OptionGroup } from "@/lib/product-customizations";
import {
  isSpiceGroupKey,
  isVeggieGroupKey,
} from "@/lib/product-customizations";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type Props = {
  groups: OptionGroup[];
  selections: Record<string, string[]>;
  onSetGroupSelection: (groupId: string, ids: string[]) => void;
  note: string;
  onNoteChange: (note: string) => void;
  invalidGroupIds?: string[];
};

const invalidTriggerClass =
  "border-brand-red ring-2 ring-brand-red/25 hover:border-brand-red";

const NONE_VALUE = "__none__";

function OptionPriceTag({
  price,
  selected = false,
}: {
  price: number;
  selected?: boolean;
}) {
  if (price <= 0) return null;
  return (
    <span
      className={cn(
        "ml-2 shrink-0 text-sm font-medium",
        selected ? "text-brand-red" : "text-gray-500",
      )}
    >
      +${price.toFixed(2)}
    </span>
  );
}

function GroupIcon({ groupId }: { groupId: string }) {
  if (isSpiceGroupKey(groupId)) {
    return <Flame className="size-4 text-brand-red" />;
  }
  if (isVeggieGroupKey(groupId)) {
    return <Leaf className="size-4 text-green-600" />;
  }
  return null;
}

function GroupLabel({
  group,
  tModal,
}: {
  group: OptionGroup;
  tModal: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <GroupIcon groupId={group.id} />
      <Label className="text-sm font-semibold text-brand-dark">{group.title}</Label>
      {group.required ? (
        <span className="rounded-full bg-brand-red/10 px-1.5 py-0.5 text-xs font-medium text-brand-red">
          {tModal("requiredBadge")}
        </span>
      ) : null}
      {group.type === "multi" ? (
        <span className="text-xs text-brand-dark/50">{tModal("chooseAny")}</span>
      ) : null}
    </div>
  );
}

function selectedLabels(group: OptionGroup, ids: string[]) {
  return ids
    .map((id) => group.options.find((o) => o.id === id))
    .filter((o): o is CustomOption => Boolean(o))
    .map((opt) => opt.label);
}

function MobilePickerTrigger({
  label,
  placeholder,
  onClick,
  invalid = false,
}: {
  label: string;
  placeholder: string;
  onClick: () => void;
  invalid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:border-brand-red/30 focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20 focus-visible:outline-none",
        invalid && invalidTriggerClass,
      )}
    >
      <span
        className={cn(
          "line-clamp-2",
          label ? "text-brand-dark" : "text-brand-dark/45",
        )}
      >
        {label || placeholder}
      </span>
      <ChevronDown className="size-4 shrink-0 text-brand-dark/50" />
    </button>
  );
}

function SingleChoiceField({
  group,
  selectedIds,
  onSelect,
  tPage,
  tModal,
  invalid = false,
}: {
  group: OptionGroup;
  selectedIds: string[];
  onSelect: (optionId: string) => void;
  tPage: ReturnType<typeof useTranslations>;
  tModal: ReturnType<typeof useTranslations>;
  invalid?: boolean;
}) {
  const selected = selectedIds[0];
  const labels = selectedLabels(group, selectedIds);
  const display = labels[0] ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDesktopChange = (value: string) => {
    if (value === NONE_VALUE) {
      onSelect("");
      return;
    }
    onSelect(value);
  };

  return (
    <div>
      <GroupLabel group={group} tModal={tModal} />

      <div className="hidden md:block">
        <Select
          value={selected || (group.required ? undefined : NONE_VALUE)}
          onValueChange={handleDesktopChange}
        >
          <SelectTrigger className={cn(invalid && invalidTriggerClass)}>
            <SelectValue placeholder={tPage("selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {!group.required ? (
              <SelectItem value={NONE_VALUE}>{tPage("noneOption")}</SelectItem>
            ) : null}
            {group.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id} price={opt.price}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:hidden">
        <MobilePickerTrigger
          label={display}
          placeholder={tPage("selectPlaceholder")}
          invalid={invalid}
          onClick={() => setMobileOpen(true)}
        />
        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{group.title}</DrawerTitle>
            </DrawerHeader>
            <div className="max-h-[55vh] overflow-y-auto px-2 pb-2">
              {!group.required ? (
                <OptionRow
                  label={tPage("noneOption")}
                  selected={!selected}
                  onClick={() => {
                    onSelect("");
                    setMobileOpen(false);
                  }}
                />
              ) : null}
              {group.options.map((opt) => (
                <OptionRow
                  key={opt.id}
                  option={opt}
                  selected={selected === opt.id}
                  onClick={() => {
                    onSelect(opt.id);
                    setMobileOpen(false);
                  }}
                />
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

function MultiChoiceField({
  group,
  selectedIds,
  onSetGroupSelection,
  tPage,
  tModal,
  invalid = false,
}: {
  group: OptionGroup;
  selectedIds: string[];
  onSetGroupSelection: (ids: string[]) => void;
  tPage: ReturnType<typeof useTranslations>;
  tModal: ReturnType<typeof useTranslations>;
  invalid?: boolean;
}) {
  const labels = selectedLabels(group, selectedIds);
  const display =
    labels.length === 0
      ? ""
      : labels.length <= 2
        ? labels.join(", ")
        : tPage("multiSelectedCount", { count: labels.length });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (mobileOpen) setDraft(selectedIds);
  }, [mobileOpen, selectedIds]);

  const toggleDraft = (optionId: string) => {
    setDraft((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  };

  const toggleLive = (optionId: string) => {
    const next = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    onSetGroupSelection(next);
  };

  return (
    <div>
      <GroupLabel group={group} tModal={tModal} />

      <div className="hidden md:block">
        <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:border-brand-red/30 focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20 focus-visible:outline-none",
                invalid && invalidTriggerClass,
              )}
            >
              <span
                className={cn(
                  "line-clamp-2",
                  display ? "text-brand-dark" : "text-brand-dark/45",
                )}
              >
                {display || tPage("multiSelectPlaceholder")}
              </span>
              <ChevronDown className="size-4 shrink-0 text-brand-dark/50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-2"
            align="start"
          >
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {group.options.map((opt) => (
                <CheckboxRow
                  key={opt.id}
                  option={opt}
                  checked={selectedIds.includes(opt.id)}
                  onCheckedChange={() => toggleLive(opt.id)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <MobilePickerTrigger
          label={display}
          placeholder={tPage("multiSelectPlaceholder")}
          invalid={invalid}
          onClick={() => setMobileOpen(true)}
        />
        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{group.title}</DrawerTitle>
            </DrawerHeader>
            <div className="max-h-[55vh] overflow-y-auto px-2 pb-2">
              {group.options.map((opt) => (
                <CheckboxRow
                  key={opt.id}
                  option={opt}
                  checked={draft.includes(opt.id)}
                  onCheckedChange={() => toggleDraft(opt.id)}
                />
              ))}
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button
                  type="button"
                  className="h-11 w-full rounded-lg bg-brand-dark text-white hover:bg-brand-dark/90"
                  onClick={() => {
                    onSetGroupSelection(draft);
                    setMobileOpen(false);
                  }}
                >
                  {tPage("done")}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

function OptionRow({
  label,
  option,
  selected,
  onClick,
}: {
  label?: string;
  option?: CustomOption;
  selected: boolean;
  onClick: () => void;
}) {
  const text = option?.label ?? label ?? "";
  const price = option?.price ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-colors",
        selected ? "bg-brand-red/5 text-brand-dark" : "text-brand-dark/80 hover:bg-gray-50",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <SingleChoiceOptionIndicator selected={selected} />
        <span className={cn("truncate", selected && "font-medium")}>{text}</span>
      </span>
      <OptionPriceTag price={price} selected={selected} />
    </button>
  );
}

function CheckboxRow({
  option,
  checked,
  onCheckedChange,
}: {
  option: CustomOption;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCheckedChange}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-2.5 text-left text-sm transition-colors",
        checked ? "bg-brand-red/5" : "hover:bg-gray-50",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
            checked ? "border-brand-red bg-brand-red" : "border-gray-300 bg-white",
          )}
        >
          {checked ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
        </span>
        <span className={cn("truncate text-brand-dark", checked && "font-medium")}>
          {option.label}
        </span>
      </span>
      <OptionPriceTag price={option.price} selected={checked} />
    </button>
  );
}

export default function ItemCustomiseDropdowns({
  groups,
  selections,
  onSetGroupSelection,
  note,
  onNoteChange,
  invalidGroupIds = [],
}: Props) {
  const tPage = useTranslations("MenuItem");
  const tModal = useTranslations("ItemCustomiseModal");

  const handleSingleSelect = (group: OptionGroup, optionId: string) => {
    const current = selections[group.id] ?? [];
    if (!optionId) {
      if (current.length === 0) return;
      onSetGroupSelection(group.id, []);
      return;
    }
    if (current[0] === optionId) {
      if (!group.required) onSetGroupSelection(group.id, []);
      return;
    }
    onSetGroupSelection(group.id, [optionId]);
  };

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const selectedIds = selections[group.id] ?? [];
        const invalid = invalidGroupIds.includes(group.id);
        if (group.type === "single") {
          return (
            <SingleChoiceField
              key={group.id}
              group={group}
              selectedIds={selectedIds}
              onSelect={(id) => handleSingleSelect(group, id)}
              tPage={tPage}
              tModal={tModal}
              invalid={invalid}
            />
          );
        }
        return (
          <MultiChoiceField
            key={group.id}
            group={group}
            selectedIds={selectedIds}
            onSetGroupSelection={(ids) => onSetGroupSelection(group.id, ids)}
            tPage={tPage}
            tModal={tModal}
            invalid={invalid}
          />
        );
      })}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <MessageSquare className="size-4 text-brand-dark/50" />
          <Label className="text-sm font-semibold text-brand-dark">
            {tModal("specialInstructions.title")}
          </Label>
          <span className="text-xs text-brand-dark/50">
            {tModal("specialInstructions.optional")}
          </span>
        </div>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={tModal("specialInstructions.placeholder")}
          rows={3}
          maxLength={200}
          className="resize-none rounded-lg border-gray-200 bg-white focus-visible:border-brand-red focus-visible:ring-brand-red/20"
        />
        <p className="mt-1 text-right text-xs text-brand-dark/45">
          {tModal("specialInstructions.charCount", { count: note.length })}
        </p>
      </div>
    </div>
  );
}
