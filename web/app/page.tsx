"use client";

import { useState, Suspense, useEffect, useRef } from "react";
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
import {
  generateBraille3DModel,
  disposeBraille3DModel,
  prepareBrailleText,
} from "@/lib/braille3D";
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

export default function HomePage() {
  const [text, setText] = useState("Tactil.");
  const [maxCellsPerLine, setMaxCellsPerLine] = useState(40);
  const [baseHeight, setBaseHeight] = useState(3.0);
  const [paddingX, setPaddingX] = useState(3.0);
  const [paddingY, setPaddingY] = useState(3.0);
  // Default unit scale: 1 for meters, 0.001 for millimeters (GLB and GLTF only, STL defaults to millimeters for unit scale: 1)
  const [model, setModel] = useState<THREE.Group>(() =>
    generateBraille3DModel(
      prepareBrailleText(text),
      1,
      maxCellsPerLine,
      baseHeight,
      paddingX,
      paddingY
    )
  );
  const previousModelRef = useRef<THREE.Group | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up previous model when component unmounts
  useEffect(() => {
    return () => {
      if (previousModelRef.current) {
        disposeBraille3DModel(previousModelRef.current);
      }
    };
  }, []);

  // Handles changes to the input field and updates the Braille output
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);
    // Debounce filename update when text changes
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setFilename(newText);
    }, 500);

    try {
      // Convert regular newlines to our custom delimiter before processing
      const brailleFormattedText = prepareBrailleText(newText);
      const newModel = generateBraille3DModel(
        brailleFormattedText,
        1,
        maxCellsPerLine,
        baseHeight,
        paddingX,
        paddingY
      );

      // Dispose of the previous model
      if (previousModelRef.current) {
        disposeBraille3DModel(previousModelRef.current);
      }

      previousModelRef.current = model;
      setModel(newModel);
    } catch (error) {
      console.error("Error generating 3D model:", error);
      // Keep the previous model if generation fails
    }
  };

  // Handles changes to the line length limit
  const handleLineLengthChange = (value: number[]) => {
    const newMaxCells = value[0] || 40;
    setMaxCellsPerLine(newMaxCells);

    // Debounce model update when max cells per line changes
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        // Convert regular newlines to our custom delimiter before processing
        const brailleFormattedText = prepareBrailleText(text);
        const newModel = generateBraille3DModel(
          brailleFormattedText,
          1,
          newMaxCells,
          baseHeight,
          paddingX,
          paddingY
        );

        // Dispose of the previous model
        if (previousModelRef.current) {
          disposeBraille3DModel(previousModelRef.current);
        }

        previousModelRef.current = model;
        setModel(newModel);
      } catch (error) {
        console.error("Error generating 3D model:", error);
        // Keep the previous model if generation fails
      }
    }, 200);
  };

  // Helper function to regenerate the model with current parameters
  const regenerateModel = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        const brailleFormattedText = prepareBrailleText(text);
        const newModel = generateBraille3DModel(
          brailleFormattedText,
          1,
          maxCellsPerLine,
          baseHeight,
          paddingX,
          paddingY
        );

        // Dispose of the previous model
        if (previousModelRef.current) {
          disposeBraille3DModel(previousModelRef.current);
        }

        previousModelRef.current = model;
        setModel(newModel);
      } catch (error) {
        console.error("Error generating 3D model:", error);
      }
    }, 200);
  };

  // Handles changes to base height
  const handleBaseHeightChange = (value: number[]) => {
    const newBaseHeight = value[0] || 3.0;
    setBaseHeight(newBaseHeight);
    regenerateModel();
  };

  // Handles changes to padding X
  const handlePaddingXChange = (value: number[]) => {
    const newPaddingX = value[0] || 3.0;
    setPaddingX(newPaddingX);
    regenerateModel();
  };

  // Handles changes to padding Y
  const handlePaddingYChange = (value: number[]) => {
    const newPaddingY = value[0] || 3.0;
    setPaddingY(newPaddingY);
    regenerateModel();
  };

  // Exports the current 3D model in glb, gltf or stl format (default: stl)

  const [filename, setFilename] = useState(text);
  const [fileType, setFileType] = useState<"glb" | "gltf" | "stl">("stl");

  const handleFilenameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilename(event.target.value);
  };

  const handleExport = () => {
    try {
      // Set model scale to millimeters (assuming 1 unit = 1 mm)
      // You can adjust the scale factor if your model units differ
      const originalScale = model.scale.clone();
      model.scale.set(1, 1, 1);

      if (fileType === "stl") {
        // Export STL using STLExporter
        const stlExporter = new STLExporter();
        const stlString = stlExporter.parse(model);
        // Restore original scale after export
        model.scale.copy(originalScale);

        const blob = new Blob([stlString], { type: "model/stl" });
        const extension = "stl";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename || "3d-braille"}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const exporter = new GLTFExporter();
      exporter.parse(
        model,
        (result) => {
          // Restore original scale after export
          model.scale.copy(originalScale);

          let blob: Blob | null = null;
          let extension: string | null = null;
          if (fileType === "glb") {
            blob = new Blob([result as ArrayBuffer], {
              type: "application/octet-stream",
            });
            extension = "glb";
          } else if (fileType === "gltf") {
            blob = new Blob([JSON.stringify(result, null, 2)], {
              type: "application/json",
            });
            extension = "gltf";
          } else if (fileType === "blend") {
            alert(
              "Export to Blender (.blend) is not supported. Please use GLB, GLTF, or STL."
            );
            return;
          }
          if (blob && extension) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${filename || "braille"}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        },
        (error) => {
          // Restore original scale if error occurs
          model.scale.copy(originalScale);

          console.error("An error happened during parsing", error);
          alert(
            "Failed to export 3D model. Please try again or refresh the page."
          );
        },
        { binary: fileType === "glb" }
      );
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export 3D model. Please try again or refresh the page.");
    }
  };

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
          <CardDescription className="text-center">
            Type text to generate a 3D Braille model. Press Enter to create new
            lines. You can rotate and zoom the model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Textarea
              value={text}
              onChange={handleInputChange}
              placeholder="Enter text to convert... (Press Enter for new lines)"
              className="p-4 h-10 resize-none"
              rows={4}
            />

            <div className="w-full h-72 md:h-96 sm:h-84 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border">
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
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label className="text-sm sm:text-base font-semibold flex">
                  <div className="">Maximum Characters Per Line: </div>
                  <div className="font-medium text-xs sm:text-base">
                    {maxCellsPerLine} ({(maxCellsPerLine * 7).toFixed(1)} units)
                  </div>
                </Label>
                <div className="pt-2">
                  <Slider
                    value={[maxCellsPerLine]}
                    onValueChange={handleLineLengthChange}
                    min={10}
                    max={100}
                    step={1}
                    className="w-full"
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
                      onValueChange={handleBaseHeightChange}
                      min={1.0}
                      max={10.0}
                      step={0.1}
                      className="w-full"
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
                      onValueChange={handlePaddingXChange}
                      min={0.5}
                      max={10.0}
                      step={0.1}
                      className="w-full"
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
                      onValueChange={handlePaddingYChange}
                      min={0.5}
                      max={10.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center items-start w-full gap-2">
              <div className="flex-1">
                <Label className="text-sm sm:text-base font-semibold">
                  File Name
                </Label>
                <Input
                  type="text"
                  value={filename}
                  onChange={handleFilenameChange}
                  placeholder="Filename"
                  className="text-base w-full"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm sm:text-base font-semibold">
                  Export Format
                </Label>

                <Select
                  value={fileType}
                  onValueChange={(value: string) =>
                    setFileType(value as "glb" | "gltf" | "stl")
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
            <Button onClick={handleExport}>
              Export as .{fileType.toUpperCase()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
