import { BLANK_CELL, Cell, describeCell, dots } from "./cells";

/** State of the "Braille keyboard (dots)" input mode. */
export interface DotKeyboardState {
  /** Finished cells. Blank cells are spaces between words. */
  cells: Cell[];
  /** Dots raised in the cell being typed, in the order they were typed. */
  current: number[];
}

export const emptyDotKeyboardState: DotKeyboardState = { cells: [], current: [] };

export type DotKeyboardAction =
  /** Number key 1-6: raise a dot (pressing it again does nothing). */
  | { type: "dot"; dot: number }
  /** On-screen dot button: raise or lower a dot. */
  | { type: "toggleDot"; dot: number }
  /** Space/Enter or "Next cell": finish the cell, or add a blank if it is empty. */
  | { type: "nextCell" }
  /** "Space" button: finish the cell (if any) and add a blank. */
  | { type: "space" }
  /** Perkins-style chord: enter a whole cell at once. */
  | { type: "chord"; cell: Cell }
  /** Backspace/"Delete": remove the last dot typed, or the last cell. */
  | { type: "delete" }
  | { type: "clear" };

export interface DotKeyboardResult {
  state: DotKeyboardState;
  /** Short message for screen readers describing what happened. */
  message: string;
}

const currentCell = (state: DotKeyboardState): Cell => dots(...state.current);

const describeCurrent = (current: number[]) =>
  current.length === 0
    ? "Current cell is empty."
    : `Current cell: ${describeCell(dots(...current))}.`;

export function dotKeyboardReducer(
  state: DotKeyboardState,
  action: DotKeyboardAction
): DotKeyboardResult {
  switch (action.type) {
    case "dot": {
      if (state.current.includes(action.dot)) {
        return { state, message: `Dot ${action.dot} already raised.` };
      }
      const current = [...state.current, action.dot];
      return {
        state: { ...state, current },
        message: `Dot ${action.dot}. ${describeCurrent(current)}`,
      };
    }
    case "toggleDot": {
      if (!state.current.includes(action.dot)) {
        return dotKeyboardReducer(state, { type: "dot", dot: action.dot });
      }
      const current = state.current.filter((d) => d !== action.dot);
      return {
        state: { ...state, current },
        message: `Dot ${action.dot} removed. ${describeCurrent(current)}`,
      };
    }
    case "nextCell": {
      if (state.current.length === 0) {
        return {
          state: { cells: [...state.cells, BLANK_CELL], current: [] },
          message: `Space added. ${state.cells.length + 1} cells.`,
        };
      }
      const cell = currentCell(state);
      const cells = [...state.cells, cell];
      return {
        state: { cells, current: [] },
        message: `Cell ${cells.length}: ${describeCell(cell)}.`,
      };
    }
    case "space": {
      const cells =
        state.current.length > 0
          ? [...state.cells, currentCell(state), BLANK_CELL]
          : [...state.cells, BLANK_CELL];
      return {
        state: { cells, current: [] },
        message: `Space added. ${cells.length} cells.`,
      };
    }
    case "chord": {
      const cells = [...state.cells, action.cell];
      return {
        state: { cells, current: [] },
        message: `Cell ${cells.length}: ${describeCell(action.cell)}.`,
      };
    }
    case "delete": {
      if (state.current.length > 0) {
        const removed = state.current[state.current.length - 1];
        const current = state.current.slice(0, -1);
        return {
          state: { ...state, current },
          message: `Removed dot ${removed}. ${describeCurrent(current)}`,
        };
      }
      if (state.cells.length > 0) {
        const removed = state.cells[state.cells.length - 1];
        return {
          state: { cells: state.cells.slice(0, -1), current: [] },
          message: `Removed cell ${state.cells.length} (${describeCell(removed)}).`,
        };
      }
      return { state, message: "Nothing to delete." };
    }
    case "clear":
      return { state: emptyDotKeyboardState, message: "All cells cleared." };
  }
}

/** All cells to print, including the cell still being typed. */
export function dotKeyboardCells(state: DotKeyboardState): Cell[] {
  return state.current.length > 0
    ? [...state.cells, currentCell(state)]
    : state.cells;
}
