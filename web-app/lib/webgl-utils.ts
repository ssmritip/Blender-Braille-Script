/**
 * WebGL utilities for handling context loss and restoration
 */

export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!context;
  } catch {
    return false;
  }
}

export function getWebGLContextInfo(): {
  supported: boolean;
  renderer?: string;
  vendor?: string;
  version?: string;
  maxTextureSize?: number;
} {
  if (!isWebGLSupported()) {
    return { supported: false };
  }

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;

    if (!gl) {
      return { supported: false };
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

    return {
      supported: true,
      renderer: debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : "Unknown",
      vendor: debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : "Unknown",
      version: gl.getParameter(gl.VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    };
  } catch {
    return { supported: false };
  }
}

export function logWebGLInfo(): void {
  const info = getWebGLContextInfo();
  console.log("WebGL Support Info:", info);
}

export class WebGLContextManager {
  private canvas: HTMLCanvasElement | null = null;
  private onContextLost?: (event: Event) => void;
  private onContextRestored?: (event: Event) => void;

  constructor(
    onContextLost?: (event: Event) => void,
    onContextRestored?: (event: Event) => void
  ) {
    this.onContextLost = onContextLost;
    this.onContextRestored = onContextRestored;
  }

  attachToCanvas(canvas: HTMLCanvasElement): void {
    this.detachFromCanvas(); // Clean up previous canvas if any

    this.canvas = canvas;

    if (this.onContextLost) {
      this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    }

    if (this.onContextRestored) {
      this.canvas.addEventListener(
        "webglcontextrestored",
        this.onContextRestored
      );
    }
  }

  detachFromCanvas(): void {
    if (this.canvas) {
      if (this.onContextLost) {
        this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
      }

      if (this.onContextRestored) {
        this.canvas.removeEventListener(
          "webglcontextrestored",
          this.onContextRestored
        );
      }

      this.canvas = null;
    }
  }

  dispose(): void {
    this.detachFromCanvas();
  }
}
