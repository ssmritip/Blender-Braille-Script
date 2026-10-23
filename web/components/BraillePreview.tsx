"use client";

import { Cell, cellDots, cellToUnicode, describeCell } from "@/lib/braille/cells";
import { cn } from "@/lib/utils";

interface BraillePreviewProps {
  /** Wrapped lines, exactly as they will be printed. */
  lines: Cell[][];
  /** Highlight the last cell of the last line (the cell being typed). */
  highlightLast?: boolean;
}

/** Shows each Braille cell with its dot numbers, line by line. */
export function BraillePreview({ lines, highlightLast }: BraillePreviewProps) {
  const cellCount = lines.reduce((n, line) => n + line.length, 0);

  return (
    <section
      aria-label="Braille preview"
      className="rounded-lg border bg-white dark:bg-gray-800 p-3"
    >
      <h2 className="text-sm sm:text-base font-semibold mb-2">
        Braille preview{" "}
        <span className="font-normal text-gray-700 dark:text-gray-300">
          ({cellCount} {cellCount === 1 ? "cell" : "cells"}, {lines.length}{" "}
          {lines.length === 1 ? "line" : "lines"})
        </span>
      </h2>
      {cellCount === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">No Braille cells yet.</p>
      ) : (
        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
          {lines.map((line, lineIndex) => (
            <ol
              key={lineIndex}
              aria-label={`Line ${lineIndex + 1}`}
              className="flex flex-wrap gap-1"
            >
              {line.map((cell, cellIndex) => {
                const isCurrent =
                  highlightLast &&
                  lineIndex === lines.length - 1 &&
                  cellIndex === line.length - 1;
                return (
                  <li
                    key={cellIndex}
                    aria-label={`Cell ${cellIndex + 1}: ${describeCell(cell)}${isCurrent ? " (being typed)" : ""}`}
                    className={cn(
                      "flex flex-col items-center min-w-10 rounded-md border px-1 py-1",
                      isCurrent
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <span aria-hidden="true" className="text-3xl leading-none">
                      {cellToUnicode(cell)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-xs text-gray-700 dark:text-gray-300"
                    >
                      {cellDots(cell).join("") || "–"}
                    </span>
                  </li>
                );
              })}
            </ol>
          ))}
        </div>
      )}
    </section>
  );
}
