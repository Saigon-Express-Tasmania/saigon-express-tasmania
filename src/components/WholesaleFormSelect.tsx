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
  variant?: "light" | "dark";
};

const variantStyles = {
  light: {
    trigger:
      "h-auto min-h-[42px] rounded-lg border-gray-300 bg-white py-2.5 text-sm text-gray-900 shadow-none transition-all focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/40 data-[placeholder]:text-gray-400 [&>svg]:text-gray-500",
    content: "border-gray-200 bg-white text-gray-900 shadow-xl",
    item: "cursor-pointer rounded-md py-2.5 pl-3 pr-3 text-sm text-gray-900 focus:bg-primary/10 focus:text-gray-900 data-[highlighted]:bg-primary/10 data-[highlighted]:text-gray-900 data-[state=checked]:bg-primary/5 data-[state=checked]:text-gray-900 [&>span>span:first-child]:hidden",
  },
  dark: {
    trigger:
      "h-auto min-h-[42px] rounded-lg border-white/15 bg-white/8 py-2.5 text-sm text-white shadow-none transition-all focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/40 data-[placeholder]:text-white/45 [&>svg]:text-white/50",
    content:
      "border-white/15 bg-neutral-950 text-white shadow-xl backdrop-blur-md",
    item: "cursor-pointer rounded-md py-2.5 pl-3 pr-3 text-sm text-white/90 focus:bg-primary/15 focus:text-white data-[highlighted]:bg-primary/15 data-[highlighted]:text-white data-[state=checked]:bg-primary/10 data-[state=checked]:text-white [&>span>span:first-child]:hidden",
  },
} as const;

export default function WholesaleFormSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  allowEmpty = false,
  emptyLabel,
  disabled = false,
  variant = "light",
}: WholesaleFormSelectProps) {
  const styles = variantStyles[variant];
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
      <SelectTrigger
        id={id}
        className={cn(styles.trigger, disabled && "opacity-50")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={styles.content}>
        {allowEmpty ? (
          <SelectItem value={EMPTY_VALUE} className={styles.item}>
            {emptyLabel ?? placeholder}
          </SelectItem>
        ) : null}
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={styles.item}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
