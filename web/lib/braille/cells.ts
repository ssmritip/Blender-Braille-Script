/**
 * A Braille cell is stored as a 6-bit mask: bit 0 = dot 1 ... bit 5 = dot 6.
 * This is the same bit order Unicode uses for the Braille Patterns block,
 * so `String.fromCodePoint(0x2800 + cell)` is the printable character.
 *
 *   1 ● ● 4
 *   2 ● ● 5
 *   3 ● ● 6
 */
export type Cell = number;

export const BLANK_CELL: Cell = 0;
export const FULL_CELL: Cell = 0b111111; // dots 1-2-3-4-5-6 (⠿)

const BRAILLE_UNICODE_START = 0x2800;
const BRAILLE_UNICODE_END = 0x28ff;

/** Builds a cell from dot numbers, e.g. dots(1, 2, 5). */
export function dots(...dotNumbers: number[]): Cell {
  let cell = 0;
  for (const d of dotNumbers) {
    if (d >= 1 && d <= 6) cell |= 1 << (d - 1);
  }
  return cell;
}

/** Returns the raised dot numbers of a cell in ascending order. */
export function cellDots(cell: Cell): number[] {
  const result: number[] = [];
  for (let d = 1; d <= 6; d++) {
    if (cell & (1 << (d - 1))) result.push(d);
  }
  return result;
}

export function hasDot(cell: Cell, dot: number): boolean {
  return (cell & (1 << (dot - 1))) !== 0;
}

export function cellToUnicode(cell: Cell): string {
  return String.fromCodePoint(BRAILLE_UNICODE_START + (cell & FULL_CELL));
}

/** Returns the cell for a Unicode Braille character, or null if it is not one. Dots 7/8 are dropped. */
export function unicodeToCell(char: string): Cell | null {
  const code = char.codePointAt(0);
  if (code === undefined || code < BRAILLE_UNICODE_START || code > BRAILLE_UNICODE_END) {
    return null;
  }
  return (code - BRAILLE_UNICODE_START) & FULL_CELL;
}

/** Human-readable description, e.g. "dots 1-2-5" or "blank". */
export function describeCell(cell: Cell): string {
  const d = cellDots(cell);
  if (d.length === 0) return "blank";
  return `${d.length === 1 ? "dot" : "dots"} ${d.join("-")}`;
}
