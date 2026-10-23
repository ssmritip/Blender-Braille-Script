"use client";

import { cn } from "@/lib/utils";

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface ChoiceGroupProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** A group of large, labelled radio buttons (native inputs, so keyboard and screen readers work as expected). */
export function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="text-sm sm:text-base font-semibold mb-2">{legend}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/40 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/60"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{option.label}</span>
              {option.description && (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
