import { createRef, type RefObject } from "react";
import { create } from "zustand";

import type { WorkspaceImageInfo } from "@/types/extension";
import { getCanvasInstance } from "@/utils/imageLabelingCore";

// ─── Store ──────────────────────────────────────────────────────

interface WorkspaceCanvasState {
  /** Stable ref that always points to the current fabric.Canvas (or null). */
  canvasRef: RefObject<unknown | null>;
  /** Current image dimensions and URL (null when no image is loaded). */
  imageInfo: WorkspaceImageInfo | null;
  setImageInfo: (info: WorkspaceImageInfo | null) => void;
}

export const useWorkspaceCanvasStore = create<WorkspaceCanvasState>(
  (set) => ({
    canvasRef: createRef<unknown | null>(),
    imageInfo: null,
    setImageInfo: (info) => set({ imageInfo: info }),
  }),
);

// ─── Canvas helpers (thin wrappers around imageLabelingCore) ────

/**
 * Add fabric objects to the canvas.
 * Extensions call this to render results (polygons, boxes, etc.).
 */
export function addCanvasObjects(objects: unknown[]): void {
  const canvas = getCanvasInstance();
  if (!canvas || objects.length === 0) return;
  (canvas as any).add(...objects);
  (canvas as any).renderAll();
}

/**
 * Remove fabric objects matching a predicate from the canvas.
 * Extensions call this to clean up their objects.
 */
export function removeCanvasObjects(
  predicate: (obj: unknown) => boolean,
): void {
  const canvas = getCanvasInstance();
  if (!canvas) return;
  const toRemove = ((canvas as any).getObjects() as unknown[]).filter(predicate);
  if (toRemove.length === 0) return;
  (canvas as any).remove(...toRemove);
  (canvas as any).renderAll();
}
