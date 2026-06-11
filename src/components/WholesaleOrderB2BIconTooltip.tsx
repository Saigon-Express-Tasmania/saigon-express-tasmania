"use client";

import { WholesaleOrderB2BTooltipContent } from "@/components/WholesaleOrderB2BTooltipContent";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WholesaleOrderB2B, WholesaleOrderB2BSection } from "@/types/WholesaleB2BOrder";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";

function isTouchLikePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export default function WholesaleOrderB2BIconTooltip({
  section,
  label,
  icon: Icon,
  b2b,
  disabled,
}: {
  section: Exclude<WholesaleOrderB2BSection, "all">;
  label: string;
  icon: LucideIcon;
  b2b: WholesaleOrderB2B;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isTouchLikePointer()) {
      setOpen((current) => !current);
    }
  }, []);

  const handlePointerEnter = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse") {
        setOpen(true);
      }
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse") {
        setOpen(false);
      }
    },
    [],
  );

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-[min(calc(100vw-2rem),18rem)] border border-white/15 bg-neutral-900 px-3 py-2.5 text-white shadow-2xl [&>svg]:bg-neutral-900 [&>svg]:fill-neutral-900"
      >
        <WholesaleOrderB2BTooltipContent section={section} b2b={b2b} />
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}
