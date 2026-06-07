"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__empty__";

export type WholesaleFormSelectOption = {
  value: string;
  label: string;
};

type WholesaleFormSelectProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: WholesaleFormSelectOption[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
};

const triggerClassName =
  "h-auto min-h-[42px] rounded-lg border-white/15 bg-white/8 py-2.5 text-sm text-white shadow-none transition-all focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/40 data-[placeholder]:text-white/45 [&>svg]:text-white/50";

const contentClassName =
  "border-white/15 bg-neutral-950 text-white shadow-xl backdrop-blur-md";

const itemClassName =
  "cursor-pointer rounded-md py-2.5 pl-3 pr-3 text-sm text-white/90 focus:bg-primary/15 focus:text-white data-[highlighted]:bg-primary/15 data-[highlighted]:text-white data-[state=checked]:bg-primary/10 data-[state=checked]:text-white [&>span>span:first-child]:hidden";

export default function WholesaleFormSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  allowEmpty = false,
  emptyLabel,
  disabled = false,
}: WholesaleFormSelectProps) {
  const selectValue = value || (allowEmpty ? EMPTY_VALUE : undefined);

  const handleValueChange = (next: string) => {
    onValueChange(next === EMPTY_VALUE ? "" : next);
  };

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn(triggerClassName, disabled && "opacity-50")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {allowEmpty ? (
          <SelectItem value={EMPTY_VALUE} className={itemClassName}>
            {emptyLabel ?? placeholder}
          </SelectItem>
        ) : null}
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={itemClassName}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
