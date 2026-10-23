import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Cell, hasDot } from "./braille/cells";

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

// "standard" models: how far each closed dot sinks into the base, so the dot and
// the base overlap instead of only touching (touching coplanar faces confuse slicers).
const DOT_SINK_DEPTH = 0.1;

/**
 * - "print-ready": base and dots welded into ONE closed, manifold solid (recommended).
 * - "standard": the base and every dot are separate closed solids that overlap,
 *   like the original generator's layout but without its open dot shells.
 */
export type ModelVariant = "print-ready" | "standard";

export interface Braille3DOptions {
  unitScale?: number;
  baseHeight?: number;
  paddingX?: number;
  paddingY?: number;
  variant?: ModelVariant;
}

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

/**
 * Creates a single dome-shaped Braille dot (indexed, position-only geometry).
 * Without `sinkDepth` the dome is open at the bottom: its rim ring lies at y = 0 and
 * is welded to a matching circular hole in the base's top face.
 * With `sinkDepth` the dome gets a short wall down to y = -sinkDepth and a flat
 * bottom, making it a closed solid on its own.
 */
const createDot = (
  cx: number,
  cz: number,
  radius: number,
  height: number,
  sinkDepth?: number
): THREE.BufferGeometry => {
  const positions: number[] = [cx, height, cz]; // index 0 = pole
  const indices: number[] = [];

  for (let i = 1; i <= DOT_RINGS; i++) {
    if (i === DOT_RINGS) {
      // Rim ring, exactly on the base plane
      for (let k = 0; k < DOT_SEGMENTS; k++) {
        const [px, pz] = rimPoint(cx, cz, radius, k);
        positions.push(px, 0, pz);
      }
    } else {
      const theta = (i / DOT_RINGS) * (Math.PI / 2);
      const ringRadius = radius * Math.sin(theta);
      const y = height * Math.cos(theta);
      for (let k = 0; k < DOT_SEGMENTS; k++) {
        const a = (k / DOT_SEGMENTS) * Math.PI * 2;
        positions.push(cx + ringRadius * Math.cos(a), y, cz + ringRadius * Math.sin(a));
      }
    }
  }

  let ringCount = DOT_RINGS;
  if (sinkDepth !== undefined) {
    // Wall ring below the base plane
    for (let k = 0; k < DOT_SEGMENTS; k++) {
      const [px, pz] = rimPoint(cx, cz, radius, k);
      positions.push(px, -sinkDepth, pz);
    }
    ringCount++;
  }

  const ringIndex = (i: number, k: number) =>
    1 + (i - 1) * DOT_SEGMENTS + (k % DOT_SEGMENTS);

  // Pole fan (outward-facing triangles)
  for (let k = 0; k < DOT_SEGMENTS; k++) {
    indices.push(0, ringIndex(1, k + 1), ringIndex(1, k));
  }
  // Quads between rings
  for (let i = 1; i < ringCount; i++) {
    for (let k = 0; k < DOT_SEGMENTS; k++) {
      const A = ringIndex(i, k);
      const B = ringIndex(i, k + 1);
      const C = ringIndex(i + 1, k);
      const D = ringIndex(i + 1, k + 1);
      indices.push(A, B, C, B, D, C);
    }
  }

  if (sinkDepth !== undefined) {
    // Flat bottom (downward-facing fan)
    const bottom = positions.length / 3;
    positions.push(cx, -sinkDepth, cz);
    for (let k = 0; k < DOT_SEGMENTS; k++) {
      indices.push(bottom, ringIndex(ringCount, k), ringIndex(ringCount, k + 1));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
};

/** Position-only, indexed copy of a box's faces, optionally without its top (+Y) face. */
const boxFaces = (
  width: number,
  height: number,
  depth: number,
  center: THREE.Vector3,
  includeTop: boolean
): THREE.BufferGeometry => {
  const box = new THREE.BoxGeometry(width, height, depth);
  box.translate(center.x, center.y, center.z);

  // Top face is group materialIndex 2
  const boxIndex = box.getIndex()!;
  const faceIndices: number[] = [];
  for (const g of box.groups) {
    if (g.materialIndex === 2 && !includeTop) continue;
    for (let n = g.start; n < g.start + g.count; n++) {
      faceIndices.push(boxIndex.getX(n));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", box.getAttribute("position").clone());
  geometry.setIndex(faceIndices);
  box.dispose();
  return geometry;
};

/**
 * Generates a complete 3D Braille model.
 * @param lines Lines of Braille cells, already wrapped (see wrapLines). Blank cells are spaces.
 * @returns A THREE.Group containing the merged Braille model.
 */
export function generateBraille3DModel(
  lines: Cell[][],
  options: Braille3DOptions = {}
): THREE.Group {
  const {
    unitScale = 1,
    baseHeight: customBaseHeight,
    paddingX: customPaddingX,
    paddingY: customPaddingY,
    variant = "print-ready",
  } = options;

  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.1,
    roughness: 0.5,
  });

  const maxCellsInLine = Math.max(0, ...lines.map((line) => line.length));
  if (maxCellsInLine === 0) {
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

  // Relative (x, z) positions for dots 1-6 within a Braille cell.
  const dotRelativePositions: [number, number][] = [
    [0, -2 * scaledDotSpacingY], // Dot 1 (top-left)
    [0, -scaledDotSpacingY], // Dot 2 (middle-left)
    [0, 0], // Dot 3 (bottom-left)
    [scaledDotSpacingX, -2 * scaledDotSpacingY], // Dot 4 (top-right)
    [scaledDotSpacingX, -scaledDotSpacingY], // Dot 5 (middle-right)
    [scaledDotSpacingX, 0], // Dot 6 (bottom-right)
  ];

  // Dot centers; X steps per cell, Z steps per line.
  const dotCenters: { x: number; z: number }[] = [];
  lines.forEach((line, lineIndex) => {
    const z = lineIndex * scaledLineSpacingY;
    line.forEach((cell, cellIndex) => {
      const x = cellIndex * scaledCellSpacingX;
      for (let d = 1; d <= 6; d++) {
        if (hasDot(cell, d)) {
          const [rx, rz] = dotRelativePositions[d - 1];
          dotCenters.push({ x: x + rx, z: z + rz });
        }
      }
    });
  });

  // Calculate the span of the dot origins (center points)
  const originSpanX =
    (maxCellsInLine - 1) * scaledCellSpacingX + scaledDotSpacingX;
  const highestZOrigin = (lines.length - 1) * scaledLineSpacingY;
  const lowestZOrigin = -2 * scaledDotSpacingY;
  const originSpanZ = highestZOrigin - lowestZOrigin;

  // Calculate the full geometric bounding box by adding the dot radius on all sides
  const geomWidth = originSpanX + 2 * scaledDotRadius;
  const geomDepth = originSpanZ + 2 * scaledDotRadius;

  // Calculate the final base dimensions including padding
  const baseWidth = geomWidth + 2 * scaledPaddingX;
  const baseDepth = geomDepth + 2 * scaledPaddingY;

  // Calculate the center of the base.
  const baseCenter = new THREE.Vector3(
    originSpanX / 2,
    -scaledBaseHeight / 2,
    (highestZOrigin + lowestZOrigin) / 2
  );

  const parts: THREE.BufferGeometry[] = [];

  if (variant === "standard") {
    // Closed box + one closed solid per dot, overlapping the box.
    parts.push(boxFaces(baseWidth, scaledBaseHeight, baseDepth, baseCenter, true));
    for (const c of dotCenters) {
      parts.push(
        createDot(c.x, c.z, scaledDotRadius, scaledDotHeight, DOT_SINK_DEPTH * unitScale)
      );
    }
  } else {
    // --- Base: box side/bottom walls + a top face with a circular hole under every dot ---
    parts.push(boxFaces(baseWidth, scaledBaseHeight, baseDepth, baseCenter, false));

    // Top face: rectangle with holes. Shape space is (x, -z) so that a +90deg
    // rotation about X (x, y, 0) -> (x, 0, -y) gives an upward-facing face.
    const x0 = baseCenter.x - baseWidth / 2;
    const x1 = baseCenter.x + baseWidth / 2;
    const z0 = baseCenter.z - baseDepth / 2;
    const z1 = baseCenter.z + baseDepth / 2;
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
    parts.push(topGeometry);

    for (const c of dotCenters) {
      parts.push(createDot(c.x, c.z, scaledDotRadius, scaledDotHeight));
    }
  }

  // Weld coincident vertices. For "print-ready" this joins domes, top face and
  // walls into ONE closed, manifold surface; for "standard" each solid is closed on its own.
  const merged = BufferGeometryUtils.mergeGeometries(parts);
  parts.forEach((geom) => geom.dispose());

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
 * Safely disposes of a 3D model's GPU resources. The model's structure is left
 * intact, so it can still be rendered (three.js re-uploads disposed buffers).
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
}
