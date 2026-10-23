/**
 * Generates sample labels and checks that every exported STL is made of closed,
 * correctly oriented solids (no open edges, no non-manifold edges).
 *
 * Run: npm run check:stl
 */
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { generateBraille3DModel, ModelVariant } from "../lib/braille3D";
import { translateText, wrapLines } from "../lib/braille/translate";
import { Cell, FULL_CELL, dots } from "../lib/braille/cells";

interface Sample {
  name: string;
  lines: Cell[][];
  expectDots?: number;
}

const text = (t: string, lang = "en") => wrapLines(translateText(t, lang), 40);

const samples: Sample[] = [
  { name: "English 'Tactil.'", lines: text("Tactil."), expectDots: 20 },
  { name: "Eight backslashes", lines: text("\\\\\\\\\\\\\\\\"), expectDots: 48 },
  { name: "Custom cells [1-2-5] ⠿", lines: text("[1-2-5] ⠿ [36]"), expectDots: 11 },
  { name: "Multi-line + wrap", lines: wrapLines(translateText("Hello World 2026\nline two", "en"), 10) },
  { name: "Nepali", lines: text("नमस्ते क्षमा ज्ञान १२३", "ne") },
  {
    name: "Dot keyboard cells",
    lines: wrapLines([[dots(1), 0, dots(1, 2), FULL_CELL, 0, 0, dots(3, 6)]], 40),
    expectDots: 11,
  },
];

function analyze(stl: DataView) {
  const count = stl.getUint32(80, true);
  const key = (o: number) =>
    [0, 4, 8].map((d) => stl.getFloat32(o + d, true).toFixed(4)).join(",");
  const edges = new Map<string, number>();
  const vertexId = new Map<string, number>();
  const id = (k: string) => {
    if (!vertexId.has(k)) vertexId.set(k, vertexId.size);
    return vertexId.get(k)!;
  };
  const parent: number[] = [];
  const find = (a: number): number => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  const union = (a: number, b: number) => (parent[find(a)] = find(b));
  let volume = 0;

  for (let t = 0; t < count; t++) {
    const base = 84 + t * 50 + 12;
    const v = [0, 1, 2].map((n) => id(key(base + n * 12)));
    v.forEach((x) => parent[x] ?? (parent[x] = x));
    union(v[0], v[1]);
    union(v[1], v[2]);
    for (let e = 0; e < 3; e++) {
      const a = v[e];
      const b = v[(e + 1) % 3];
      // Directed edge: in a closed, consistently oriented mesh each a->b has exactly one b->a.
      const k = `${a}>${b}`;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
    const p = [0, 1, 2].map((n) =>
      [0, 4, 8].map((d) => stl.getFloat32(base + n * 12 + d, true))
    );
    volume +=
      (p[0][0] * (p[1][1] * p[2][2] - p[1][2] * p[2][1]) -
        p[0][1] * (p[1][0] * p[2][2] - p[1][2] * p[2][0]) +
        p[0][2] * (p[1][0] * p[2][1] - p[1][1] * p[2][0])) /
      6;
  }

  let openEdges = 0;
  let badEdges = 0;
  for (const [k, n] of edges) {
    const [a, b] = k.split(">");
    const reverse = edges.get(`${b}>${a}`) ?? 0;
    if (reverse === 0) openEdges++;
    else if (n !== 1 || reverse !== 1) badEdges++;
  }
  const shells = new Set(parent.map((_, i) => find(i))).size;
  return { triangles: count, openEdges, badEdges, shells, volume };
}

let failed = false;
for (const sample of samples) {
  for (const variant of ["print-ready", "standard"] as ModelVariant[]) {
    const model = generateBraille3DModel(sample.lines, { variant });
    model.updateMatrixWorld(true);
    const stl = new STLExporter().parse(model, { binary: true }) as DataView;
    const r = analyze(stl);
    const dotCount = sample.lines.flat().reduce((n, c) => n + (c.toString(2).split("1").length - 1), 0);
    const expectedShells = variant === "standard" ? 1 + dotCount : 1;
    const ok =
      r.openEdges === 0 &&
      r.badEdges === 0 &&
      r.volume > 0 &&
      r.shells === expectedShells &&
      (sample.expectDots === undefined || sample.expectDots === dotCount);
    if (!ok) failed = true;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${sample.name.padEnd(26)} ${variant.padEnd(11)} ` +
        `dots=${dotCount} tris=${r.triangles} open=${r.openEdges} bad=${r.badEdges} ` +
        `shells=${r.shells}/${expectedShells} volume=${r.volume.toFixed(1)}mm³`
    );
  }
}

process.exit(failed ? 1 : 0);
