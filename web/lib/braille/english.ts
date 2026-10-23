import { BLANK_CELL, Cell, dots } from "./cells";

export const CAPITAL_SIGN: Cell = dots(6);
export const NUMBER_SIGN: Cell = dots(3, 4, 5, 6); // Placed before a sequence of digits.

export const englishLetters: { [key: string]: Cell } = {
  a: dots(1),
  b: dots(1, 2),
  c: dots(1, 4),
  d: dots(1, 4, 5),
  e: dots(1, 5),
  f: dots(1, 2, 4),
  g: dots(1, 2, 4, 5),
  h: dots(1, 2, 5),
  i: dots(2, 4),
  j: dots(2, 4, 5),
  k: dots(1, 3),
  l: dots(1, 2, 3),
  m: dots(1, 3, 4),
  n: dots(1, 3, 4, 5),
  o: dots(1, 3, 5),
  p: dots(1, 2, 3, 4),
  q: dots(1, 2, 3, 4, 5),
  r: dots(1, 2, 3, 5),
  s: dots(2, 3, 4),
  t: dots(2, 3, 4, 5),
  u: dots(1, 3, 6),
  v: dots(1, 2, 3, 6),
  w: dots(2, 4, 5, 6),
  x: dots(1, 3, 4, 6),
  y: dots(1, 3, 4, 5, 6),
  z: dots(1, 3, 5, 6),
};

// Digits reuse the letters a-j and follow a number sign.
export const digitCells: Cell[] = [
  dots(2, 4, 5), // 0 (j)
  dots(1), // 1 (a)
  dots(1, 2), // 2 (b)
  dots(1, 4), // 3 (c)
  dots(1, 4, 5), // 4 (d)
  dots(1, 5), // 5 (e)
  dots(1, 2, 4), // 6 (f)
  dots(1, 2, 4, 5), // 7 (g)
  dots(1, 2, 5), // 8 (h)
  dots(2, 4), // 9 (i)
];

// --- Punctuation (single-cell) ---
export const punctuation: { [key: string]: Cell } = {
  ".": dots(2, 5, 6), // Period
  ",": dots(2), // Comma
  "'": dots(3), // Apostrophe
  "-": dots(3, 6), // Hyphen
  ";": dots(2, 3), // Semicolon
  ":": dots(2, 5), // Colon
  "?": dots(2, 3, 6), // Question Mark
  "!": dots(2, 3, 5), // Exclamation Mark
  "“": dots(2, 3, 6), // Opening Quote (same as ?)
  "”": dots(3, 5, 6), // Closing Quote
  "(": dots(2, 3, 5), // Opening Paren (same as !)
  ")": dots(3, 5, 6), // Closing Paren (same as ”)
  "/": dots(3, 4), // Slash
};

const isUpper = (c: string) => c >= "A" && c <= "Z";
const isLower = (c: string) => c >= "a" && c <= "z";
export const isAsciiDigit = (c: string) => c >= "0" && c <= "9";

export function unknownCharacter(char: string): Cell {
  console.warn(`Character '${char}' not in Braille map. Using empty cell.`);
  return BLANK_CELL;
}

/**
 * Translates one word (no spaces) to English (uncontracted) Braille cells,
 * adding capital and number indicators.
 */
export function translateEnglishWord(word: string): Cell[] {
  const cells: Cell[] = [];

  // A word counts as all-caps when it has 2+ capitals and no lowercase letters.
  const chars = word.split("");
  const isAllCapsWord =
    word.length > 1 &&
    chars.every((c) => !isLower(c)) &&
    chars.filter(isUpper).length > 1;

  let i = 0;
  while (i < word.length) {
    const char = word[i];

    if (isUpper(char)) {
      if (i === 0 && isAllCapsWord) {
        // Two capital signs for an all-caps word
        cells.push(CAPITAL_SIGN, CAPITAL_SIGN);
      } else if (!isAllCapsWord) {
        // One capital sign for each capital letter
        cells.push(CAPITAL_SIGN);
      }
      cells.push(englishLetters[char.toLowerCase()]);
      i++;
    } else if (isAsciiDigit(char)) {
      cells.push(NUMBER_SIGN);
      while (i < word.length && isAsciiDigit(word[i])) {
        cells.push(digitCells[Number(word[i])]);
        i++;
      }
    } else {
      cells.push(
        englishLetters[char] ?? punctuation[char] ?? unknownCharacter(char)
      );
      i++;
    }
  }

  return cells;
}
