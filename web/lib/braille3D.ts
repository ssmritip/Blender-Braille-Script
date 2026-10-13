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
  number_sign: [0, 0, 1, 1, 1, 1], // Dots 3-4-5-6: Placed before a sequence of digits.

  // --- Punctuation (Grade 2, single-cell) ---
  ".": [0, 1, 0, 0, 1, 1], // Period (Dots 2-5-6)
  ",": [0, 1, 0, 0, 0, 0], // Comma (Dot 2)
  "'": [0, 0, 1, 0, 0, 0], // Apostrophe (Dot 3)
  "-": [0, 0, 1, 0, 0, 1], // Hyphen (Dots 3-6)
  ";": [0, 1, 1, 0, 0, 0], // Semicolon (Dots 2-3)
  ":": [0, 1, 0, 0, 1, 0], // Colon (Dots 2-5)
  "?": [0, 1, 1, 0, 0, 1], // Question Mark (Dots 2-3-6)
  "!": [0, 1, 1, 0, 1, 0], // Exclamation Mark (Dots 2-3-5)
  "“": [0, 1, 1, 0, 0, 1], // Opening Quote (Dots 2-3-6, same as ?)
  "”": [0, 0, 1, 0, 1, 1], // Closing Quote (Dots 3-5-6)
  "(": [0, 1, 1, 0, 1, 0], // Opening Paren (Dots 2-3-5, same as !)
  ")": [0, 0, 1, 0, 1, 1], // Closing Paren (Dots 3-5-6, same as ”)
  "/": [0, 0, 1, 1, 0, 0], // Slash (Dots 3-4)
};

// --- Model Parameters ---
const dotRadius = 0.7;
const dotHeight = 0.768612;
const dotSpacingX = 2.3;
const dotSpacingY = 2.3; // This now refers to the spacing along the Z-axis in Three.js
const cellSpacingX = 5.7;
const lineSpacingY = 9.2; // This now refers to the spacing along the Z-axis for lines in Three.js
const baseHeight = 3.0;
const paddingX = 3.0;
const paddingY = 3.0; // This now refers to padding along the Z-axis for the base

// Resolution of each dome. The rim of every dome (DOT_SEGMENTS points) is stitched
// directly into a circular hole of the same resolution in the top face of the base.
const DOT_SEGMENTS = 32;
const DOT_RINGS = 16;

/**
 * Returns the (x, z) position of rim point `k` of a dot centered at (cx, cz).
 * Used for BOTH the dome and the hole in the base so the vertices coincide exactly.
 */
const rimPoint = (
  cx: number,
  cz: number,
  radius: number,
  k: number
): [number, number] => {
  const a = (k / DOT_SEGMENTS) * Math.PI * 2;
  return [cx + radius * Math.cos(a), cz + radius * Math.sin(a)];
};

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
 * @param customBaseHeight Custom base height (uses default if not provided).
 * @param customPaddingX Custom padding along X-axis (uses default if not provided).
 * @param customPaddingY Custom padding along Y-axis (uses default if not provided).
 * @returns A THREE.Group containing the merged Braille model.
 */

export function generateBraille3DModel(
  text: string,
  unitScale: number = 1,
  maxCellsPerLine: number = 40,
  customBaseHeight?: number,
  customPaddingX?: number,
  customPaddingY?: number
): THREE.Group {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const dotCenters: { x: number; z: number }[] = [];
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
  const scaledBaseHeight = (customBaseHeight ?? baseHeight) * unitScale;
  const scaledPaddingX = (customPaddingX ?? paddingX) * unitScale;
  const scaledPaddingY = (customPaddingY ?? paddingY) * unitScale;

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
   * Creates a single dome-shaped Braille dot (indexed, position-only geometry).
   * The dome is intentionally open at the bottom: its rim ring lies at y = 0 and is
   * welded to a matching circular hole in the base's top face, so the base surface
   * closes the dome and the final mesh is one watertight solid.
   * @param location The (x, z) position of the dot center (y is ignored, base top is y = 0).
   * @param radius The base radius of the dot.
   * @param height The height of the dome.
   */
  const createDot = (
    location: THREE.Vector3,
    radius: number,
    height: number
  ): THREE.BufferGeometry => {
    const positions: number[] = [location.x, height, location.z]; // index 0 = pole
    const indices: number[] = [];

    for (let i = 1; i <= DOT_RINGS; i++) {
      if (i === DOT_RINGS) {
        // Rim ring, exactly on the base plane
        for (let k = 0; k < DOT_SEGMENTS; k++) {
          const [px, pz] = rimPoint(location.x, location.z, radius, k);
          positions.push(px, 0, pz);
        }
      } else {
        const theta = (i / DOT_RINGS) * (Math.PI / 2);
        const ringRadius = radius * Math.sin(theta);
        const y = height * Math.cos(theta);
        for (let k = 0; k < DOT_SEGMENTS; k++) {
          const a = (k / DOT_SEGMENTS) * Math.PI * 2;
          positions.push(
            location.x + ringRadius * Math.cos(a),
            y,
            location.z + ringRadius * Math.sin(a)
          );
        }
      }
    }

    const ringIndex = (i: number, k: number) =>
      1 + (i - 1) * DOT_SEGMENTS + (k % DOT_SEGMENTS);

    // Pole fan (outward-facing triangles)
    for (let k = 0; k < DOT_SEGMENTS; k++) {
      indices.push(0, ringIndex(1, k + 1), ringIndex(1, k));
    }
    // Quads between rings
    for (let i = 1; i < DOT_RINGS; i++) {
      for (let k = 0; k < DOT_SEGMENTS; k++) {
        const A = ringIndex(i, k);
        const B = ringIndex(i, k + 1);
        const C = ringIndex(i + 1, k);
        const D = ringIndex(i + 1, k + 1);
        indices.push(A, B, C, B, D, C);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    return geo;
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
        dotCenters.push({ x: dotLocation.x, z: dotLocation.z });
      }
    }
  };

  /**
   * Checks if a character is a digit (0-9)
   * @param char The character to check
   * @returns True if the character is a digit
   */
  const isDigit = (char: string): boolean => {
    return char >= "0" && char <= "9";
  };

  /**
   * Calculates the number of cells a word will occupy, including capitalization, number signs, and punctuation.
   * @param word The word to calculate cells for.
   * @returns The number of Braille cells needed for the word.
   */
  const calculateWordCells = (word: string): number => {
    if (!word) return 0;

    let cells = 0;
    let i = 0;
    // Check if the entire word is all-caps once at the beginning
    const isAllCapsWord =
      word.length > 1 &&
      word
        .split("")
        .every(
          (c) =>
            (c >= "A" && c <= "Z") ||
            !((c >= "a" && c <= "z") || (c >= "A" && c <= "Z"))
        ) &&
      word.split("").filter((c) => c >= "A" && c <= "Z").length > 1;

    while (i < word.length) {
      const char = word[i];

      // Handle capitalization indicators
      if (char >= "A" && char <= "Z") {
        // Check if this is part of an all-caps sequence
        if (i === 0 && isAllCapsWord) {
          cells += 2; // Two CAPS cells for all-caps words
        } else if (i === 0 && !isAllCapsWord) {
          cells += 1; // One CAPS cell for single capital letter at start
        } else if (i > 0 && !isAllCapsWord) {
          cells += 1; // CAPS cell for capital letters in the middle of words (but not in all-caps words)
        }
        // If isAllCapsWord and i > 0, skip the CAPS indicator
        cells += 1; // The letter itself
        i++;
      }
      // Handle number sequences
      else if (isDigit(char)) {
        cells += 1; // Number sign
        // Count all consecutive digits
        while (i < word.length && isDigit(word[i])) {
          cells += 1; // Each digit
          i++;
        }
      }
      // Handle regular characters (letters and punctuation)
      else {
        cells += 1;
        i++;
      }
    }

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

      // --- Process each character in the word with proper indicators ---
      let i = 0;
      // Check if the entire word is all-caps once at the beginning
      const isAllCapsWord =
        word.length > 1 &&
        word
          .split("")
          .every(
            (c) =>
              (c >= "A" && c <= "Z") ||
              !((c >= "a" && c <= "z") || (c >= "A" && c <= "Z"))
          ) &&
        word.split("").filter((c) => c >= "A" && c <= "Z").length > 1;

      while (i < word.length) {
        const char = word[i];

        // Handle capitalization indicators
        if (char >= "A" && char <= "Z") {
          // Check if this is part of an all-caps sequence
          if (i === 0 && isAllCapsWord) {
            // Two CAPS cells for all-caps words
            generateCell(brailleMap["CAPS"], currentX, currentZ);
            currentX += scaledCellSpacingX;
            cellsThisLine++;
            generateCell(brailleMap["CAPS"], currentX, currentZ);
            currentX += scaledCellSpacingX;
            cellsThisLine++;
          } else if (i === 0 && !isAllCapsWord) {
            // One CAPS cell for single capital letter at start
            generateCell(brailleMap["CAPS"], currentX, currentZ);
            currentX += scaledCellSpacingX;
            cellsThisLine++;
          } else if (i > 0 && !isAllCapsWord) {
            // CAPS cell for capital letters in the middle of words (but not in all-caps words)
            generateCell(brailleMap["CAPS"], currentX, currentZ);
            currentX += scaledCellSpacingX;
            cellsThisLine++;
          }
          // If isAllCapsWord and i > 0, skip the CAPS indicator

          // Generate the letter itself
          const lowerChar = char.toLowerCase();
          const pattern = brailleMap[lowerChar];
          if (pattern) {
            generateCell(pattern, currentX, currentZ);
          } else {
            console.warn(
              `Character '${lowerChar}' not in Braille map. Using empty cell.`
            );
            generateCell([0, 0, 0, 0, 0, 0], currentX, currentZ);
          }
          currentX += scaledCellSpacingX;
          cellsThisLine++;
          i++;
        }
        // Handle number sequences
        else if (isDigit(char)) {
          // Add number sign before the first digit in a sequence
          generateCell(brailleMap["number_sign"], currentX, currentZ);
          currentX += scaledCellSpacingX;
          cellsThisLine++;

          // Generate all consecutive digits
          while (i < word.length && isDigit(word[i])) {
            const digitPattern = brailleMap[word[i]];
            if (digitPattern) {
              generateCell(digitPattern, currentX, currentZ);
            } else {
              console.warn(
                `Digit '${word[i]}' not in Braille map. Using empty cell.`
              );
              generateCell([0, 0, 0, 0, 0, 0], currentX, currentZ);
            }
            currentX += scaledCellSpacingX;
            cellsThisLine++;
            i++;
          }
        }
        // Handle regular characters (letters and punctuation)
        else {
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
          i++;
        }
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

  // --- Base: box side/bottom walls + a top face with a circular hole under every dot ---
  const box = new THREE.BoxGeometry(baseWidth, scaledBaseHeight, baseDepth);
  box.translate(baseCenterX, baseCenterY, baseCenterZ);

  // Keep every box face except the top (+Y, group materialIndex 2)
  const boxIndex = box.getIndex()!;
  const wallIndices: number[] = [];
  for (const g of box.groups) {
    if (g.materialIndex === 2) continue;
    for (let n = g.start; n < g.start + g.count; n++) {
      wallIndices.push(boxIndex.getX(n));
    }
  }
  const wallGeometry = new THREE.BufferGeometry();
  wallGeometry.setAttribute("position", box.getAttribute("position").clone());
  wallGeometry.setIndex(wallIndices);
  box.dispose();

  // Top face: rectangle with holes. Shape space is (x, -z) so that a +90deg
  // rotation about X (x, y, 0) -> (x, 0, -y) gives an upward-facing face.
  const x0 = baseCenterX - baseWidth / 2;
  const x1 = baseCenterX + baseWidth / 2;
  const z0 = baseCenterZ - baseDepth / 2;
  const z1 = baseCenterZ + baseDepth / 2;
  const topShape = new THREE.Shape();
  topShape.moveTo(x0, -z0);
  topShape.lineTo(x1, -z0);
  topShape.lineTo(x1, -z1);
  topShape.lineTo(x0, -z1);
  topShape.closePath();

  for (const c of dotCenters) {
    const hole = new THREE.Path();
    for (let k = 0; k < DOT_SEGMENTS; k++) {
      const [px, pz] = rimPoint(c.x, c.z, scaledDotRadius, k);
      if (k === 0) hole.moveTo(px, -pz);
      else hole.lineTo(px, -pz);
    }
    hole.closePath();
    topShape.holes.push(hole);
  }

  const shapeGeo = new THREE.ShapeGeometry(topShape);
  const sp = shapeGeo.getAttribute("position");
  const topPositions: number[] = [];
  for (let n = 0; n < sp.count; n++) {
    topPositions.push(sp.getX(n), 0, -sp.getY(n));
  }
  const topIndices = Array.from(shapeGeo.getIndex()!.array);
  shapeGeo.dispose();

  // Make sure the top face points up (+Y); flip the winding if it does not.
  {
    const i0 = topIndices[0] * 3;
    const i1 = topIndices[1] * 3;
    const i2 = topIndices[2] * 3;
    const ux = topPositions[i1] - topPositions[i0];
    const uz = topPositions[i1 + 2] - topPositions[i0 + 2];
    const vx = topPositions[i2] - topPositions[i0];
    const vz = topPositions[i2 + 2] - topPositions[i0 + 2];
    const normalY = uz * vx - ux * vz; // y component of u x v
    if (normalY < 0) {
      for (let n = 0; n < topIndices.length; n += 3) {
        const t = topIndices[n + 1];
        topIndices[n + 1] = topIndices[n + 2];
        topIndices[n + 2] = t;
      }
    }
  }
  const topGeometry = new THREE.BufferGeometry();
  topGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(topPositions, 3)
  );
  topGeometry.setIndex(topIndices);

  // Weld everything (domes + top face + walls) into ONE closed, manifold surface.
  const parts = [wallGeometry, topGeometry, ...geometries];
  const merged = BufferGeometryUtils.mergeGeometries(parts);
  parts.forEach((geom) => geom.dispose());
  geometries.length = 0;

  const welded = BufferGeometryUtils.mergeVertices(merged, 1e-4 * unitScale);
  merged.dispose();

  // Crease-aware normals: smooth domes, sharp box edges and dome/base rims.
  const finalGeometry = BufferGeometryUtils.toCreasedNormals(
    welded,
    Math.PI / 3
  );
  welded.dispose();

  const mesh = new THREE.Mesh(finalGeometry, material);
  group.add(mesh);

  // Center the final model
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
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