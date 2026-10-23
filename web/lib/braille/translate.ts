import { BLANK_CELL, Cell, FULL_CELL, dots, unicodeToCell } from "./cells";
import { translateEnglishWord } from "./english";
import { translateNepaliWord } from "./nepali";

/**
 * Tokens that work in every language and bypass the language rules:
 *  - `\`             a full six-dot cell (⠿)
 *  - `[1-2-5]`/`[125]` a custom cell with exactly those dots raised
 *  - any Unicode Braille character (U+2800–U+28FF), used as-is
 */
const DIRECT_CELL_PATTERN = /\\|\[[1-6](?:-?[1-6])*\]|[⠀-⣿]/g;

function directCell(token: string): Cell {
  if (token === "\\") return FULL_CELL;
  if (token.startsWith("[")) {
    return dots(...token.slice(1, -1).replace(/-/g, "").split("").map(Number));
  }
  return unicodeToCell(token) ?? BLANK_CELL;
}

// The language is picked per run of characters: Devanagari (U+0900–U+097F)
// uses the Nepali table, everything else English, so mixed text like
// "abc जून" works without choosing a language.
const DEVANAGARI_PATTERN = /[ऀ-ॿ]+/g;

/** True if the text contains Devanagari (used to set the input's `lang`). */
export const hasDevanagari = (text: string) => /[ऀ-ॿ]/.test(text);

function translateRun(text: string): Cell[] {
  const cells: Cell[] = [];
  let last = 0;
  for (const match of text.matchAll(DEVANAGARI_PATTERN)) {
    if (match.index > last) {
      cells.push(...translateEnglishWord(text.slice(last, match.index)));
    }
    cells.push(...translateNepaliWord(match[0]));
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    cells.push(...translateEnglishWord(text.slice(last)));
  }
  return cells;
}

function translateWord(word: string): Cell[] {
  const cells: Cell[] = [];
  let last = 0;
  for (const match of word.matchAll(DIRECT_CELL_PATTERN)) {
    if (match.index > last) {
      cells.push(...translateRun(word.slice(last, match.index)));
    }
    cells.push(directCell(match[0]));
    last = match.index + match[0].length;
  }
  if (last < word.length) {
    cells.push(...translateRun(word.slice(last)));
  }
  return cells;
}

/**
 * Translates text to Braille. Each line of the input becomes one line of cells;
 * words are separated by one blank cell.
 */
export function translateText(text: string): Cell[][] {
  return text.split("\n").map((line) => {
    const cells: Cell[] = [];
    const words = line.split(/\s+/).filter((w) => w.length > 0);
    words.forEach((word, index) => {
      if (index > 0) cells.push(BLANK_CELL);
      cells.push(...translateWord(word));
    });
    return cells;
  });
}

/**
 * Wraps lines of cells so no line is longer than `maxCellsPerLine`, breaking
 * only at blank cells. A single word longer than the limit stays on its own line.
 */
export function wrapLines(lines: Cell[][], maxCellsPerLine: number): Cell[][] {
  const result: Cell[][] = [];

  for (const line of lines) {
    let current: Cell[] = [];
    let i = 0;
    while (i < line.length) {
      // Blank run (gap between words)
      let j = i;
      while (j < line.length && line[j] === BLANK_CELL) j++;
      const gap = j - i;
      // Following word
      let k = j;
      while (k < line.length && line[k] !== BLANK_CELL) k++;
      const word = line.slice(j, k);

      const isLineStart = current.length === 0;
      if (
        !isLineStart &&
        current.length + gap + word.length > maxCellsPerLine
      ) {
        // Break here; the gap is dropped at the line break.
        result.push(current);
        current = [...word];
      } else {
        for (let g = 0; g < gap; g++) current.push(BLANK_CELL);
        current.push(...word);
      }
      i = k;
    }
    result.push(current);
  }

  return result;
}
