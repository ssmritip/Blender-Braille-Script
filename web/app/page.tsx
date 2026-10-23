"use client";

import { useState, Suspense, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Braille3DViewer } from "@/components/Braille3DViewer";
import { BrailleKeyboard } from "@/components/BrailleKeyboard";
import { BraillePreview } from "@/components/BraillePreview";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { DotGrid } from "@/components/DotGrid";
import {
  generateBraille3DModel,
  disposeBraille3DModel,
  ModelVariant,
} from "@/lib/braille3D";
import { Cell, cellToUnicode, describeCell } from "@/lib/braille/cells";
import {
  DotKeyboardState,
  dotKeyboardCells,
  emptyDotKeyboardState,
} from "@/lib/braille/dotKeyboard";
import {
  hasDevanagari,
  translateText,
  wrapLines,
} from "@/lib/braille/translate";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Navbar from "@/components/Navbar";
import Logo from "@/public/assets/tactil-logo.png";

type InputMode = "text" | "dots";
type FileType = "glb" | "gltf" | "stl";

const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

/** Default file name from the typed text: first line, without characters that break file names. */
const filenameFromText = (text: string) =>
  text
    .split("\n")[0]
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 60);

export default function HomePage() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [text, setText] = useState("Tactil.");
  const [dotKeyboard, setDotKeyboard] = useState<DotKeyboardState>(
    emptyDotKeyboardState,
  );
  const [customCell, setCustomCell] = useState<Cell>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [maxCellsPerLine, setMaxCellsPerLine] = useState(40);
  const [baseHeight, setBaseHeight] = useState(3.0);
  const [paddingX, setPaddingX] = useState(3.0);
  const [paddingY, setPaddingY] = useState(3.0);

  const [filenameOverride, setFilenameOverride] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType>("stl");
  const [stlVariant, setStlVariant] = useState<ModelVariant>("print-ready");

  // Sliders are debounced so dragging does not rebuild the model on every step.
  const sliderValues = useMemo(
    () => ({ maxCellsPerLine, baseHeight, paddingX, paddingY }),
    [maxCellsPerLine, baseHeight, paddingX, paddingY],
  );
  const params = useDebouncedValue(sliderValues, 200);
  // Typed text is debounced too: translating and rebuilding the 3D model on
  // every keystroke makes typing lag.
  const debouncedText = useDebouncedValue(text, 250);

  // Braille cells, wrapped exactly as they will be printed.
  const lines = useMemo(() => {
    const source =
      inputMode === "text"
        ? translateText(debouncedText)
        : [dotKeyboardCells(dotKeyboard)];
    return wrapLines(source, params.maxCellsPerLine);
  }, [inputMode, debouncedText, dotKeyboard, params.maxCellsPerLine]);

  // The preview always shows the print-ready model; both variants look the same.
  const model = useMemo(() => {
    try {
      return generateBraille3DModel(lines, params);
    } catch (error) {
      console.error("Error generating 3D model:", error);
      return new THREE.Group();
    }
  }, [lines, params]);

  // Free the GPU resources of a model once it has been replaced.
  useEffect(() => () => disposeBraille3DModel(model), [model]);

  const filename =
    filenameOverride ??
    (inputMode === "text" ? filenameFromText(text) : "braille");

  // Inserts text at the cursor in the textarea (used by the custom cell picker).
  const insertAtCursor = (insert: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + insert + text.slice(end));
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + insert.length, start + insert.length);
    });
  };

  // Exports the current 3D model in glb, gltf or stl format (default: stl)
  const handleExport = () => {
    const name = filename.trim() || "braille";
    try {
      if (fileType === "stl") {
        const exportModel =
          stlVariant === "print-ready"
            ? model
            : generateBraille3DModel(lines, { ...params, variant: stlVariant });
        exportModel.updateMatrixWorld(true);
        const stl = new STLExporter().parse(exportModel, { binary: true });
        if (exportModel !== model) disposeBraille3DModel(exportModel);

        downloadBlob(
          new Blob([stl.buffer as ArrayBuffer], { type: "model/stl" }),
          `${name}.stl`,
        );
        return;
      }

      new GLTFExporter().parse(
        model,
        (result) => {
          const blob =
            fileType === "glb"
              ? new Blob([result as ArrayBuffer], {
                  type: "application/octet-stream",
                })
              : new Blob([JSON.stringify(result, null, 2)], {
                  type: "application/json",
                });
          downloadBlob(blob, `${name}.${fileType}`);
        },
        (error) => {
          console.error("An error happened during parsing", error);
          alert(
            "Failed to export 3D model. Please try again or refresh the page.",
          );
        },
        { binary: fileType === "glb" },
      );
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export 3D model. Please try again or refresh the page.");
    }
  };

  const toggleCustomDot = (dot: number) =>
    setCustomCell((cell) => cell ^ (1 << (dot - 1)));

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-100 dark:bg-gray-900 p-2 w-full">
      <Image
        src={Logo}
        alt="Tactil Logo"
        width={100}
        height={100}
        className="fixed w-10 h-10 top-4 left-4 rounded-lg shadow-md hidden sm:block "
      />

      <Navbar />
      <Card className="w-full max-w-2xl shadow-none border-0 rounded-3xl bg-transparent mt-20 sm:mt-24">
        <CardHeader>
          <CardDescription className="text-center text-base text-gray-700 dark:text-gray-300">
            Type text or dot numbers to generate a 3D Braille label. Check the
            preview, then download the file for 3D printing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <ChoiceGroup<InputMode>
              legend="Input mode"
              name="input-mode"
              value={inputMode}
              onChange={setInputMode}
              options={[
                {
                  value: "text",
                  label: "Text",
                  description:
                    "Type English or Nepali words (or both); they are translated to Braille.",
                },
                {
                  value: "dots",
                  label: "Braille keyboard (dots)",
                  description:
                    "Type dot numbers 1–6 to build each cell. Works for any language.",
                },
              ]}
            />

            {inputMode === "text" ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="braille-text"
                    className="text-sm sm:text-base font-semibold"
                  >
                    Text
                  </Label>
                  <Textarea
                    id="braille-text"
                    ref={textareaRef}
                    lang={hasDevanagari(text) ? "ne" : "en"}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text to convert..."
                    // Grows with its content (field-sizing), starting at one line.
                    // Browsers without field-sizing get a fixed 4-line box instead.
                    className="p-4 min-h-0 max-h-80 resize-none text-base bg-white dark:bg-gray-800 [@supports_not_(field-sizing:content)]:min-h-28"
                    rows={1}
                    aria-describedby="braille-text-hint"
                  />
                  <p
                    id="braille-text-hint"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Type <kbd className="font-mono font-bold">\</kbd> for a full
                    cell (⠿), or dot numbers in brackets like{" "}
                    <kbd className="font-mono font-bold">[1-2-3-4]</kbd> for any
                    cell.
                  </p>
                </div>

                <details className="rounded-lg border bg-white dark:bg-gray-800 p-3">
                  <summary className="cursor-pointer font-semibold">
                    Custom cell picker
                  </summary>
                  <div className="mt-3 flex flex-col sm:flex-row items-center sm:items-end gap-4">
                    <DotGrid
                      label="Custom cell dots"
                      cell={customCell}
                      onToggle={toggleCustomDot}
                    />
                    <div className="flex flex-col gap-2">
                      <p aria-live="polite">
                        <span aria-hidden="true" className="text-4xl mr-2">
                          {cellToUnicode(customCell)}
                        </span>
                        {describeCell(customCell)}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={customCell === 0}
                        onClick={() =>
                          insertAtCursor(cellToUnicode(customCell))
                        }
                      >
                        Insert cell into text
                      </Button>
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <BrailleKeyboard
                state={dotKeyboard}
                onStateChange={setDotKeyboard}
              />
            )}

            <BraillePreview
              lines={lines}
              highlightLast={
                inputMode === "dots" && dotKeyboard.current.length > 0
              }
            />

            <div
              className="w-full h-72 md:h-96 sm:h-84 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border"
              role="img"
              aria-label="3D preview of the Braille label. You can rotate and zoom it with a mouse or touch."
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    Loading 3D Preview...
                  </div>
                }
              >
                <Braille3DViewer model={model} />
              </Suspense>
            </div>
            <section
              aria-label="Label and file settings"
              className="flex flex-col gap-4 rounded-lg border bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label className="text-sm sm:text-base font-semibold flex">
                    <div className="">Maximum Characters Per Line: </div>
                    <div className="font-medium text-xs sm:text-base">
                      {maxCellsPerLine} ({(maxCellsPerLine * 7).toFixed(1)}{" "}
                      units)
                    </div>
                  </Label>
                  <div className="pt-2">
                    <Slider
                      value={[maxCellsPerLine]}
                      onValueChange={(value) =>
                        setMaxCellsPerLine(value[0] || 40)
                      }
                      min={10}
                      max={100}
                      step={1}
                      className="w-full"
                      aria-label="Maximum characters per line"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex-1">
                    <Label className="text-sm sm:text-base font-semibold flex">
                      <div className="">Base Height: </div>
                      <div className="font-medium text-xs sm:text-base">
                        {baseHeight.toFixed(1)} units
                      </div>
                    </Label>
                    <div className="pt-2">
                      <Slider
                        value={[baseHeight]}
                        onValueChange={(value) =>
                          setBaseHeight(value[0] || 3.0)
                        }
                        min={1.0}
                        max={10.0}
                        step={0.1}
                        className="w-full"
                        aria-label="Base height"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm sm:text-base font-semibold flex">
                      <div className="">Padding X: </div>
                      <div className="font-medium text-xs sm:text-base">
                        {paddingX.toFixed(1)} units
                      </div>
                    </Label>
                    <div className="pt-2">
                      <Slider
                        value={[paddingX]}
                        onValueChange={(value) => setPaddingX(value[0] || 3.0)}
                        min={0.5}
                        max={10.0}
                        step={0.1}
                        className="w-full"
                        aria-label="Padding X"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm sm:text-base font-semibold flex">
                      <div className="">Padding Y: </div>
                      <div className="font-medium text-xs sm:text-base">
                        {paddingY.toFixed(1)} units
                      </div>
                    </Label>
                    <div className="pt-2">
                      <Slider
                        value={[paddingY]}
                        onValueChange={(value) => setPaddingY(value[0] || 3.0)}
                        min={0.5}
                        max={10.0}
                        step={0.1}
                        className="w-full"
                        aria-label="Padding Y"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center items-start w-full gap-2">
                <div className="flex-1">
                  <Label
                    htmlFor="filename"
                    className="text-sm sm:text-base font-semibold"
                  >
                    File Name
                  </Label>
                  <Input
                    id="filename"
                    type="text"
                    value={filename}
                    onChange={(e) => setFilenameOverride(e.target.value)}
                    placeholder="Filename"
                    className="text-base w-full"
                  />
                </div>
                <div className="flex-1">
                  <Label
                    htmlFor="fileType"
                    className="text-sm sm:text-base font-semibold"
                  >
                    Export Format
                  </Label>

                  <Select
                    value={fileType}
                    onValueChange={(value: string) =>
                      setFileType(value as FileType)
                    }
                  >
                    <SelectTrigger id="fileType" className="w-full">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="glb">GLB (.glb)</SelectItem>
                      <SelectItem value="gltf">GLTF (.gltf)</SelectItem>
                      <SelectItem value="stl">STL (.stl)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {fileType === "stl" && (
                <ChoiceGroup<ModelVariant>
                  legend="STL type"
                  name="stl-variant"
                  value={stlVariant}
                  onChange={setStlVariant}
                  options={[
                    {
                      value: "print-ready",
                      label: "Print-ready STL (recommended)",
                      description:
                        "One closed, watertight solid. Prints correctly in any slicer.",
                    },
                    {
                      value: "standard",
                      label: "Standard STL",
                      description:
                        "Base and each dot as separate closed parts, like the original generator. Some slicers merge them automatically.",
                    },
                  ]}
                />
              )}
            </section>
            <Button onClick={handleExport} size="lg" className="text-base">
              Download .{fileType.toUpperCase()}
              {fileType === "stl" &&
                (stlVariant === "print-ready"
                  ? " (print-ready)"
                  : " (standard)")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
