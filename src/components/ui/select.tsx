"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { SingleChoiceCheckMark } from "@/components/SingleChoiceCheckIndicator";
import { cn } from "@/lib/utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  iconClassName,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  iconClassName?: string;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-brand-dark shadow-xs outline-none transition-colors",
        "focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>span]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 text-brand-dark/50", iconClassName)}
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  viewportClassName,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  viewportClassName?: string;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-gray-200 bg-white text-brand-dark shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className={cn("p-1", viewportClassName)}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs text-brand-dark/60", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  price,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  price?: number;
}) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "group flex w-full cursor-default select-none items-center justify-between gap-2 rounded-md py-2.5 pr-3 pl-3 text-sm outline-none",
        "focus:bg-brand-red/5 data-[highlighted]:bg-brand-red/5",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 transition-colors",
            "group-data-[state=checked]:border-brand-red group-data-[state=checked]:bg-brand-red",
          )}
        >
          <SelectPrimitive.ItemIndicator className="flex items-center justify-center">
            <SingleChoiceCheckMark />
          </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText className="truncate">
          {children}
        </SelectPrimitive.ItemText>
      </span>
      {price != null && price > 0 ? (
        <span
          className={cn(
            "ml-2 shrink-0 text-sm font-medium text-gray-500",
            "group-data-[state=checked]:text-brand-red",
          )}
        >
          +${price.toFixed(2)}
        </span>
      ) : null}
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-gray-100", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
