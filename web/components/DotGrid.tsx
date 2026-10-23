"use client";

import { Cell, hasDot } from "@/lib/braille/cells";
import { cn } from "@/lib/utils";

interface DotGridProps {
  cell: Cell;
  onToggle: (dot: number) => void;
  label: string;
  size?: "md" | "lg";
}

/**
 * Six toggle buttons laid out like a Braille cell:
 *   1 4
 *   2 5
 *   3 6
 */
export function DotGrid({ cell, onToggle, label, size = "md" }: DotGridProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid grid-rows-3 grid-flow-col w-fit",
        size === "lg" ? "gap-x-6 gap-y-3" : "gap-x-4 gap-y-2"
      )}
    >
      {[1, 2, 3, 4, 5, 6].map((dot) => {
        const raised = hasDot(cell, dot);
        return (
          <button
            key={dot}
            type="button"
            aria-pressed={raised}
            aria-label={`Dot ${dot}`}
            onClick={() => onToggle(dot)}
            className={cn(
              "flex items-center justify-center rounded-full border-2 font-bold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
              size === "lg" ? "size-16 sm:size-20 text-2xl" : "size-11 text-base",
              raised
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-500"
            )}
          >
            {dot}
          </button>
        );
      })}
    </div>
  );
}
