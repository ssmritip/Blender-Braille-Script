"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DotGrid } from "@/components/DotGrid";
import { dots } from "@/lib/braille/cells";
import {
  DotKeyboardAction,
  DotKeyboardState,
  dotKeyboardReducer,
} from "@/lib/braille/dotKeyboard";

interface BrailleKeyboardProps {
  state: DotKeyboardState;
  onStateChange: (state: DotKeyboardState) => void;
}

// Number keys 1-6 (top row and numeric keypad), matched by physical key so
// non-English keyboard layouts work too.
const NUMBER_KEYS: { [code: string]: number } = {
  Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5, Digit6: 6,
  Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4, Numpad5: 5, Numpad6: 6,
};

// Perkins Brailler layout: F D S = dots 1 2 3, J K L = dots 4 5 6.
const PERKINS_KEYS: { [code: string]: number } = {
  KeyF: 1, KeyD: 2, KeyS: 3, KeyJ: 4, KeyK: 5, KeyL: 6,
};

const INSTRUCTIONS_ID = "braille-keyboard-instructions";

/**
 * "Braille keyboard (dots)" input: type dot numbers 1-6 to build each cell, or use
 * the on-screen buttons. Optional Perkins mode enters a whole cell as a chord.
 */
export function BrailleKeyboard({ state, onStateChange }: BrailleKeyboardProps) {
  const [perkins, setPerkins] = useState(false);
  // `count` makes repeated identical messages still change, so they are re-announced.
  const [status, setStatus] = useState({ message: "", count: 0 });
  const pressedKeys = useRef(new Set<string>());
  const chordDots = useRef(new Set<number>());

  const dispatch = (action: DotKeyboardAction) => {
    const result = dotKeyboardReducer(state, action);
    if (result.state !== state) onStateChange(result.state);
    setStatus((s) => ({ message: result.message, count: s.count + 1 }));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (perkins && PERKINS_KEYS[event.code]) {
      event.preventDefault();
      if (!event.repeat) {
        pressedKeys.current.add(event.code);
        chordDots.current.add(PERKINS_KEYS[event.code]);
      }
      return;
    }

    if (!perkins && NUMBER_KEYS[event.code]) {
      event.preventDefault();
      if (!event.repeat) dispatch({ type: "dot", dot: NUMBER_KEYS[event.code] });
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) dispatch({ type: "nextCell" });
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      dispatch({ type: "delete" });
    }
    // Every other key is ignored (and Tab still moves focus).
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!perkins || !PERKINS_KEYS[event.code]) return;
    event.preventDefault();
    pressedKeys.current.delete(event.code);
    // The cell is entered once every chord key has been released.
    if (pressedKeys.current.size === 0 && chordDots.current.size > 0) {
      dispatch({ type: "chord", cell: dots(...chordDots.current) });
      chordDots.current.clear();
    }
  };

  const resetChord = () => {
    pressedKeys.current.clear();
    chordDots.current.clear();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="application"
        tabIndex={0}
        aria-label="Braille dot typing area"
        aria-describedby={INSTRUCTIONS_ID}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={resetChord}
        className="rounded-lg border-2 border-dashed border-gray-500 bg-white dark:bg-gray-800 p-4 outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/60"
      >
        <p className="font-semibold mb-1">
          Click or Tab here, then type on your keyboard.
        </p>
        <p id={INSTRUCTIONS_ID} className="text-sm text-gray-700 dark:text-gray-300">
          {perkins
            ? "Perkins mode: press F D S J K L together for dots 1 2 3 4 5 6; the cell is entered when you release all keys."
            : "Press number keys 1 to 6 to raise dots in the current cell."}{" "}
          Space or Enter finishes the cell, or adds a space if the cell is empty.
          Backspace removes the last dot or cell.
        </p>
        {/* Always rendered so screen readers pick up the first message; hidden until then. */}
        <p
          role="status"
          aria-live="polite"
          className={status.message ? "mt-2 text-base font-medium" : "sr-only"}
        >
          {status.message}
          {status.count % 2 === 1 ? " " : ""}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <DotGrid
          size="lg"
          label="Dots of the current cell"
          cell={dots(...state.current)}
          onToggle={(dot) => dispatch({ type: "toggleDot", dot })}
        />
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:min-w-52">
          <Button
            type="button"
            size="lg"
            className="h-14 text-base col-span-2"
            onClick={() => dispatch({ type: "nextCell" })}
          >
            Next cell
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 text-base"
            onClick={() => dispatch({ type: "space" })}
          >
            Space
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 text-base"
            onClick={() => dispatch({ type: "delete" })}
          >
            Delete
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="col-span-2 underline"
            onClick={() => dispatch({ type: "clear" })}
            disabled={state.cells.length === 0 && state.current.length === 0}
          >
            Clear all cells
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm sm:text-base">
        <input
          type="checkbox"
          checked={perkins}
          onChange={(e) => {
            setPerkins(e.target.checked);
            resetChord();
          }}
          className="size-4 accent-primary"
        />
        Perkins style (F D S J K L pressed together, for experienced Braille users)
      </label>
    </div>
  );
}
