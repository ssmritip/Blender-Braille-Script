import { Cell, dots } from "./cells";
import {
  NUMBER_SIGN,
  digitCells,
  englishLetters,
  isAsciiDigit,
  punctuation,
  unknownCharacter,
} from "./english";

/**
 * Nepali Braille (Bharati Braille for Devanagari).
 *
 * Bharati Braille is phonetic: a consonant is written as one cell and its
 * inherent "a" is not written; a vowel sign (matra) is written as the full
 * vowel cell AFTER the consonant, which matches Unicode logical order.
 *
 * NOTE: this table should be reviewed by a Nepali Braille reader before
 * relying on it for production labels.
 */

const VIRAMA = "्"; // ् (halant)

// Some characters take more than one cell.
type Cells = Cell | Cell[];

// Conjuncts with their own Braille cells. Checked before single characters.
const conjuncts: { [key: string]: Cells } = {
  ["क" + VIRAMA + "ष"]: dots(1, 2, 3, 4, 5), // क्ष
  ["ज" + VIRAMA + "ञ"]: dots(1, 5, 6), // ज्ञ
  ["त" + VIRAMA + "र"]: [dots(5), dots(1, 2, 4, 5, 6)], // त्र
};

const vowels: { [key: string]: Cells } = {
  अ: dots(1),
  आ: dots(3, 4, 5),
  इ: dots(2, 4),
  ई: dots(3, 5),
  उ: dots(1, 3, 6),
  ऊ: dots(1, 2, 5, 6),
  ऋ: [dots(5), dots(1, 2, 3, 5)],
  ए: dots(1, 5),
  ऐ: dots(3, 4),
  ओ: dots(1, 3, 5),
  औ: dots(2, 4, 6),
};

// Vowel signs use the same cells as the independent vowels.
const vowelSigns: { [key: string]: Cells } = {
  "ा": vowels["आ"], // ा
  "ि": vowels["इ"], // ि
  "ी": vowels["ई"], // ी
  "ु": vowels["उ"], // ु
  "ू": vowels["ऊ"], // ू
  "ृ": vowels["ऋ"], // ृ
  "े": vowels["ए"], // े
  "ै": vowels["ऐ"], // ै
  "ो": vowels["ओ"], // ो
  "ौ": vowels["औ"], // ौ
};

const consonants: { [key: string]: Cell } = {
  क: dots(1, 3),
  ख: dots(4, 6),
  ग: dots(1, 2, 4, 5),
  घ: dots(1, 2, 6),
  ङ: dots(3, 4, 6),
  च: dots(1, 4),
  छ: dots(1, 6),
  ज: dots(2, 4, 5),
  झ: dots(3, 5, 6),
  ञ: dots(2, 5),
  ट: dots(2, 3, 4, 5, 6),
  ठ: dots(2, 4, 5, 6),
  ड: dots(1, 2, 4, 6),
  ढ: dots(1, 2, 3, 4, 5, 6),
  ण: dots(3, 4, 5, 6),
  त: dots(2, 3, 4, 5),
  थ: dots(1, 4, 5, 6),
  द: dots(1, 4, 5),
  ध: dots(2, 3, 4, 6),
  न: dots(1, 3, 4, 5),
  प: dots(1, 2, 3, 4),
  फ: dots(2, 3, 5),
  ब: dots(1, 2),
  भ: dots(4, 5),
  म: dots(1, 3, 4),
  य: dots(1, 3, 4, 5, 6),
  र: dots(1, 2, 3, 5),
  ल: dots(1, 2, 3),
  व: dots(1, 2, 3, 6),
  श: dots(1, 4, 6),
  ष: dots(1, 2, 3, 4, 6),
  स: dots(2, 3, 4),
  ह: dots(1, 2, 5),
};

const signs: { [key: string]: Cell } = {
  "ँ": dots(3), // ँ chandrabindu
  "ं": dots(5, 6), // ं anusvara
  "ः": dots(6), // ः visarga
  [VIRAMA]: dots(4), // ् halant
  "।": dots(2, 5, 6), // danda
};

const DEVANAGARI_ZERO = 0x0966;
const devanagariDigit = (c: string): number | null => {
  const n = c.charCodeAt(0) - DEVANAGARI_ZERO;
  return n >= 0 && n <= 9 ? n : null;
};
const digitValue = (c: string): number | null =>
  isAsciiDigit(c) ? Number(c) : devanagariDigit(c);

export function translateNepaliWord(word: string): Cell[] {
  const text = word.normalize("NFC");
  const cells: Cell[] = [];

  let i = 0;
  while (i < text.length) {
    const char = text[i];

    const conjunct = text.slice(i, i + 3);
    if (conjuncts[conjunct] !== undefined) {
      cells.push(...[conjuncts[conjunct]].flat());
      i += 3;
      continue;
    }

    if (digitValue(char) !== null) {
      cells.push(NUMBER_SIGN);
      while (i < text.length && digitValue(text[i]) !== null) {
        cells.push(digitCells[digitValue(text[i])!]);
        i++;
      }
      continue;
    }

    if (char === "॥") {
      cells.push(signs["।"], signs["।"]);
      i++;
      continue;
    }

    const cell =
      consonants[char] ??
      vowels[char] ??
      vowelSigns[char] ??
      signs[char] ??
      punctuation[char] ??
      englishLetters[char.toLowerCase()];
    cells.push(...[cell ?? unknownCharacter(char)].flat());
    i++;
  }

  return cells;
}
