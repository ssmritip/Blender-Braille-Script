"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

// The main page component for the application
export default function HomePage() {
  const [text, setText] = useState("3D Braille");
  const [maxCellsPerLine, setMaxCellsPerLine] = useState(40);
  // Default unit scale: 1 for meters, 0.001 for millimeters
  const [model, setModel] = useState<THREE.Group>(() =>
    generateBraille3DModel(prepareBrailleText(text), 1, maxCellsPerLine)
  );
  const previousModelRef = useRef<THREE.Group | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up previous model when component unmounts
  useEffect(() => {
    return () => {
      if (previousModelRef.current) {
        disposeBraille3DModel(previousModelRef.current);
      }
      // Note: Current model will be handled by the next model generation or unmount
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
        maxCellsPerLine
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

    try {
      // Convert regular newlines to our custom delimiter before processing
      const brailleFormattedText = prepareBrailleText(text);
      const newModel = generateBraille3DModel(
        brailleFormattedText,
        1,
        newMaxCells
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
      <Card className="w-full max-w-4xl shadow-lg rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-center pt-4">
            3D Text to Braille Converter
          </CardTitle>
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
              className="text-lg p-4 min-h-[100px] resize-y"
              rows={4}
            />

            <div className="w-full h-96 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border">
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
                <Label className="text-base font-semibold">
                  Maximum Characters Per Line: {maxCellsPerLine} (
                  {(maxCellsPerLine * 7).toFixed(1)} units)
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
            <div className="flex justify-center items-start w-full gap-2">
              <div className="flex-1">
                <Label className="text-lg font-semibold">File Name</Label>
                <Input
                  type="text"
                  value={filename}
                  onChange={handleFilenameChange}
                  placeholder="Filename"
                  className="text-base w-full"
                />
              </div>
              <div className="flex-1">
                <Label className="text-lg font-semibold">Export Format</Label>

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
