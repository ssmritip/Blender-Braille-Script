"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import { useState, useCallback, useRef } from "react";
import * as THREE from "three";
import { Button } from "./ui/button";

interface Braille3DViewerProps {
  model: THREE.Group;
}

export function Braille3DViewer({ model }: Braille3DViewerProps) {
  const [contextLost, setContextLost] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    console.warn("WebGL context lost. Attempting to restore...");
    setContextLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    console.log("WebGL context restored successfully.");
    setContextLost(false);
    setRetryCount(0);
  }, []);

  const handleCreated = useCallback(
    ({ gl }: { gl: THREE.WebGLRenderer }) => {
      const canvas = gl.domElement;

      // Add event listeners for context loss/restore
      canvas.addEventListener("webglcontextlost", handleContextLost);
      canvas.addEventListener("webglcontextrestored", handleContextRestored);

      // Configure renderer for better stability
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      gl.setSize(canvas.clientWidth, canvas.clientHeight);

      // Log WebGL info for debugging
      const glContext = gl.getContext();
      console.log("WebGL Renderer initialized:", {
        renderer: gl.info.render,
        memory: gl.info.memory,
        version: glContext.getParameter(glContext.VERSION),
        vendor: glContext.getParameter(glContext.VENDOR),
      });

      return () => {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener(
          "webglcontextrestored",
          handleContextRestored
        );
      };
    },
    [handleContextLost, handleContextRestored]
  );

  const retryRender = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      setContextLost(false);
      // Force a small delay before retry
      setTimeout(() => {
        if (contextLost) {
          setContextLost(false);
        }
      }, 1000);
    }
  }, [retryCount, contextLost]);

  if (contextLost) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-700 rounded-lg">
        <div className="text-center p-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            3D Preview Temporarily Unavailable
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            WebGL context was lost. This can happen due to GPU driver issues or
            browser limitations.
          </div>
          {retryCount < 3 ? (
            <Button onClick={retryRender}>
              Retry Rendering ({retryCount + 1}/3)
            </Button>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Maximum retry attempts reached. Try refreshing the page or
              restarting your browser.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Canvas
      ref={canvasRef}
      camera={{ fov: 45, position: [-10, 10, 15] }}
      onCreated={handleCreated}
      gl={{
        preserveDrawingBuffer: false,
        antialias: true,
        alpha: true,
        powerPreference: "default",
      }}
    >
      <Stage environment="city" intensity={0.01}>
        <primitive object={model} />
      </Stage>
      <OrbitControls makeDefault />
    </Canvas>
  );
}
