import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Braille mapping, including a special character for capitalization.
const brailleMap: { [key: string]: number[] } = {
  a: [1, 0, 0, 0, 0, 0],
  b: [1, 1, 0, 0, 0, 0],
  c: [1, 0, 0, 1, 0, 0],
  d: [1, 0, 0, 1, 1, 0],
  e: [1, 0, 0, 0, 1, 0],
  f: [1, 1, 0, 1, 0, 0],
  g: [1, 1, 0, 1, 1, 0],
  h: [1, 1, 0, 0, 1, 0],
  i: [0, 1, 0, 1, 0, 0],
  j: [0, 1, 0, 1, 1, 0],
  k: [1, 0, 1, 0, 0, 0],
  l: [1, 1, 1, 0, 0, 0],
  m: [1, 0, 1, 1, 0, 0],
  n: [1, 0, 1, 1, 1, 0],
  o: [1, 0, 1, 0, 1, 0],
  p: [1, 1, 1, 1, 0, 0],
  q: [1, 1, 1, 1, 1, 0],
  r: [1, 1, 1, 0, 1, 0],
  s: [0, 1, 1, 1, 0, 0],
  t: [0, 1, 1, 1, 1, 0],
  u: [1, 0, 1, 0, 0, 1],
  v: [1, 1, 1, 0, 0, 1],
  w: [0, 1, 0, 1, 1, 1],
  x: [1, 0, 1, 1, 0, 1],
  y: [1, 0, 1, 1, 1, 1],
  z: [1, 0, 1, 0, 1, 1],
  "1": [1, 0, 0, 0, 0, 0],
  "2": [1, 1, 0, 0, 0, 0],
  "3": [1, 0, 0, 1, 0, 0],
  "4": [1, 0, 0, 1, 1, 0],
  "5": [1, 0, 0, 0, 1, 0],
  "6": [1, 1, 0, 1, 0, 0],
  "7": [1, 1, 0, 1, 1, 0],
  "8": [1, 1, 0, 0, 1, 0],
  "9": [0, 1, 0, 1, 0, 0],
  "0": [0, 1, 0, 1, 1, 0],
  CAPS: [0, 0, 0, 0, 0, 1], // Dot 6 indicates a capital letter.
  CAPS_WORD: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // Two Dot 6 for all caps word
};

// --- Model Parameters ---
const dotRadius = 0.85;
const dotHeight = 0.768612;
const dotSpacingX = 2.5;
const dotSpacingY = 2.5; // This now refers to the spacing along the Z-axis in Three.js
const cellSpacingX = 7;
const lineSpacingY = 10.0; // This now refers to the spacing along the Z-axis for lines in Three.js
const baseHeight = 3.0;
const paddingX = 3.0;
const paddingY = 3.0; // This now refers to padding along the Z-axis for the base

// --- Line Break Delimiter ---
export const NEWLINE_DELIMITER = "|NEWLINE|";

/**
 * Helper function to convert regular text with \n line breaks to the format expected by the Braille generator.
 * @param text Text with regular \n line breaks
 * @returns Text with |NEWLINE| delimiters
 */
export function prepareBrailleText(text: string): string {
  return text.replace(/\n/g, NEWLINE_DELIMITER);
}

/**
 * Helper function to convert Braille-formatted text back to regular text with \n line breaks.
 * @param text Text with |NEWLINE| delimiters
 * @returns Text with regular \n line breaks
 */
export function formatDisplayText(text: string): string {
  return text.replace(new RegExp(`\\${NEWLINE_DELIMITER}`, "g"), "\n");
}

/**
 * Generates a complete 3D Braille model for the given text.
 * @param text The input string. Use |NEWLINE| to create line breaks.
 * @param unitScale Scale factor for all dimensions.
 * @param maxCellsPerLine Maximum number of Braille cells per line before wrapping.
 * @returns A THREE.Group containing the merged Braille model.
 */

export function generateBraille3DModel(
  text: string,
  unitScale: number = 1,
  maxCellsPerLine: number = 40
): THREE.Group {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const material = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.1,
    roughness: 0.5,
  });

  if (!text) {
    return group;
  }

  // Scale all parameters by unitScale
  const scaledDotRadius = dotRadius * unitScale;
  const scaledDotHeight = dotHeight * unitScale;
  const scaledDotSpacingX = dotSpacingX * unitScale;
  const scaledDotSpacingY = dotSpacingY * unitScale;
  const scaledCellSpacingX = cellSpacingX * unitScale;
  const scaledLineSpacingY = lineSpacingY * unitScale;
  const scaledBaseHeight = baseHeight * unitScale;
  const scaledPaddingX = paddingX * unitScale;
  const scaledPaddingY = paddingY * unitScale;

  // Define relative positions for the 6 dots within a Braille cell.
  const dotRelativePositions = [
    new THREE.Vector3(0, 0, -2 * scaledDotSpacingY), // Index 0 -> Dot 1 (top-left)
    new THREE.Vector3(0, 0, -scaledDotSpacingY), // Index 1 -> Dot 2 (middle-left)
    new THREE.Vector3(0, 0, 0), // Index 2 -> Dot 3 (bottom-left)
    new THREE.Vector3(scaledDotSpacingX, 0, -2 * scaledDotSpacingY), // Index 3 -> Dot 4 (top-right)
    new THREE.Vector3(scaledDotSpacingX, 0, -scaledDotSpacingY), // Index 4 -> Dot 5 (middle-right)
    new THREE.Vector3(scaledDotSpacingX, 0, 0), // Index 5 -> Dot 6 (bottom-right)
  ];

  /**
   * Creates a single 3D dome-shaped Braille dot (a hemisphere).
   * @param location The (x, y, z) coordinates for the center of the dot's base.
   * @param radius The radius of the spherical part of the dot.
   * @param height The desired height of the dome.
   * @returns A THREE.BufferGeometry for the dot.
   */
  const createDot = (
    location: THREE.Vector3,
    radius: number,
    height: number
  ): THREE.BufferGeometry => {
    // Create a top hemisphere of a sphere
    const dotGeometry = new THREE.SphereGeometry(
      radius,
      32,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    // Scale Y to achieve desired height, assuming radius is the base radius
    dotGeometry.scale(1, height / radius, 1);
    // Position the dot: X and Z from location, Y is 0 to sit on the base
    dotGeometry.translate(location.x, 0, location.z); // Fix: Set Y-translation to 0
    return dotGeometry;
  };

  /**
   * Helper function to create the dots for a single Braille cell.
   * @param pattern The 6-element array representing the Braille dot pattern.
   * @param x The X-coordinate for the cell's origin.
   * @param z The Z-coordinate for the cell's origin (representing vertical position of the cell).
   */
  const generateCell = (pattern: number[], x: number, z: number) => {
    for (let i = 0; i < 6; i++) {
      if (pattern[i] === 1) {
        const relPos = dotRelativePositions[i];
        // The Y component of dotLocation is 0, as the dot's height is handled by createDot's translate
        const dotLocation = new THREE.Vector3(
          x + relPos.x,
          0, // Y-coordinate is constant for the base of the dots
          z + relPos.z // Z-coordinate controls the vertical spacing of dots within a cell and lines
        );
        geometries.push(
          createDot(dotLocation, scaledDotRadius, scaledDotHeight)
        );
      }
    }
  };

  /**
   * Calculates the number of cells a word will occupy, including capitalization.
   * @param word The word to calculate cells for.
   * @returns The number of Braille cells needed for the word.
   */
  const calculateWordCells = (word: string): number => {
    if (!word) return 0;

    let cells = 0;

    // Check for capitalization indicators
    if (word.length > 0 && word.toUpperCase() === word && word.length > 1) {
      cells += 2; // Two CAPS cells for all-caps words
    } else if (word.length > 0 && word[0] >= "A" && word[0] <= "Z") {
      cells += 1; // One CAPS cell for first letter capitalization
    }

    // Add cells for each character
    cells += word.length;

    return cells;
  };

  let currentZ = 0.0;
  let maxCellsInLine = 0;
  const lines = text.split("|NEWLINE|");
  const processedLines: string[][] = [];

  // Process each original line and apply word wrapping
  for (const line of lines) {
    const words = line.split(" ").filter((word) => word.length > 0);
    let currentLineWords: string[] = [];
    let currentLineCells = 0;

    for (const word of words) {
      const wordCells = calculateWordCells(word);
      const spaceCell = currentLineWords.length > 0 ? 1 : 0; // Space between words
      const totalCellsNeeded = wordCells + spaceCell;

      // Check if adding this word would exceed the line limit
      if (
        currentLineCells + totalCellsNeeded > maxCellsPerLine &&
        currentLineWords.length > 0
      ) {
        // Start a new line
        processedLines.push([...currentLineWords]);
        currentLineWords = [word];
        currentLineCells = wordCells;
      } else {
        // Add word to current line
        currentLineWords.push(word);
        currentLineCells += totalCellsNeeded;
      }
    }

    // Add the last line if it has content
    if (currentLineWords.length > 0) {
      processedLines.push(currentLineWords);
    } else if (words.length === 0) {
      // Handle empty lines
      processedLines.push([]);
    }
  }

  // Generate Braille cells for all processed lines
  for (const lineWords of processedLines) {
    let currentX = 0.0;
    let cellsThisLine = 0;

    for (let wordIndex = 0; wordIndex < lineWords.length; wordIndex++) {
      const word = lineWords[wordIndex];

      // Add space between words (except for the first word)
      if (wordIndex > 0) {
        currentX += scaledCellSpacingX;
        cellsThisLine++;
      }

      // --- Capitalization Logic ---
      if (word.length > 0 && word.toUpperCase() === word && word.length > 1) {
        generateCell(brailleMap["CAPS"], currentX, currentZ);
        currentX += scaledCellSpacingX;
        cellsThisLine++;
        generateCell(brailleMap["CAPS"], currentX, currentZ);
        currentX += scaledCellSpacingX;
        cellsThisLine++;
      } else if (word.length > 0 && word[0] >= "A" && word[0] <= "Z") {
        generateCell(brailleMap["CAPS"], currentX, currentZ);
        currentX += scaledCellSpacingX;
        cellsThisLine++;
      }

      // Generate cells for each character in the word
      for (const char of word.toLowerCase()) {
        const pattern = brailleMap[char];
        if (pattern) {
          generateCell(pattern, currentX, currentZ);
        } else {
          console.warn(
            `Character '${char}' not in Braille map. Using empty cell.`
          );
          generateCell([0, 0, 0, 0, 0, 0], currentX, currentZ);
        }
        currentX += scaledCellSpacingX;
        cellsThisLine++;
      }
    }

    if (cellsThisLine > maxCellsInLine) {
      maxCellsInLine = cellsThisLine;
    }

    currentZ += scaledLineSpacingY; // Changed from -= to += to fix line order
  }

  const numLines = processedLines.length;

  // --- Create the solid base ---
  if (maxCellsInLine === 0) {
    console.warn("No text to generate. Aborting base creation.");
    return group;
  }

  // Calculate the span of the dot origins (center points)
  const originSpanX =
    (maxCellsInLine - 1) * scaledCellSpacingX + scaledDotSpacingX;
  const highestZOrigin = (numLines - 1) * scaledLineSpacingY;
  const lowestZOrigin = -2 * scaledDotSpacingY;
  const originSpanZ = highestZOrigin - lowestZOrigin;

  // Calculate the full geometric bounding box by adding the dot radius on all sides
  const geomWidth = originSpanX + 2 * scaledDotRadius;
  const geomDepth = originSpanZ + 2 * scaledDotRadius;

  // Calculate the final base dimensions including padding
  const baseWidth = geomWidth + 2 * scaledPaddingX;
  const baseDepth = geomDepth + 2 * scaledPaddingY;

  // Calculate the center of the base.
  const baseCenterX = originSpanX / 2;
  const baseCenterZ = (highestZOrigin + lowestZOrigin) / 2;
  const baseCenterY = -scaledBaseHeight / 2;

  const baseGeometry = new THREE.BoxGeometry(
    baseWidth,
    scaledBaseHeight,
    baseDepth
  );
  baseGeometry.translate(baseCenterX, baseCenterY, baseCenterZ);

  geometries.push(baseGeometry);

  // Merge all geometries into one for performance
  if (geometries.length > 0) {
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    const mesh = new THREE.Mesh(mergedGeometry, material);
    group.add(mesh);

    // Clean up individual geometries to free memory
    geometries.forEach((geom) => geom.dispose());
  }

  // Center the final model
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);

  // Rotate the model -90 degrees about the X axis for Blender compatibility
  group.rotateX(THREE.MathUtils.degToRad(90));

  return group;
}

/**
 * Safely disposes of a 3D model and its resources
 * @param model The THREE.Group to dispose
 */
export function disposeBraille3DModel(model: THREE.Group): void {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });

  // Clear the group
  model.clear();
}
