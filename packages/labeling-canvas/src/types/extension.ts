import type { ReactNode, RefObject } from "react";

import type { MutationSuccessHint } from "./asyncData";

// ─── Core Extension Interface ───────────────────────────────────

/**
 * A pluggable extension that the host registers to add optional
 * features (e.g. SAM, Automated Labeling) to the labeling workspace.
 *
 * The library provides render slots only — the host owns all UI and logic.
 */
export interface LabelingExtension {
  /** Unique identifier for this extension. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Set to false to disable the extension without removing it. */
  enabled?: boolean;

  /**
   * Renders action buttons / sections inside the InfoPanel.
   * The returned node is placed at the bottom of the InfoPanel, after the
   * label lists and before the issue panel toggle.
   */
  renderInfoPanelAction?: (ctx: ExtensionRenderContext) => ReactNode;

  /**
   * Renders a floating overlay on top of the workspace (e.g. a modal).
   * Rendered at the root level so it can use portals / z-index freely.
   */
  renderOverlay?: (ctx: ExtensionRenderContext) => ReactNode;

  /**
   * Renders an additional tool button in the floating toolbar.
   * Use this for canvas-based tools (e.g. SAM point/box input).
   */
  renderToolbarAction?: (ctx: ExtensionRenderContext) => ReactNode;
}

// ─── Canvas Access ──────────────────────────────────────────────

/** Information about the currently displayed image in the workspace. */
export interface WorkspaceImageInfo {
  url: string;
  width: number;
  height: number;
}

// ─── Render Context ─────────────────────────────────────────────

/**
 * Context object passed to every extension render function, giving it
 * access to the current workspace state and canvas interaction.
 */
export interface ExtensionRenderContext {
  /** Currently selected content-set ID (null when nothing is selected). */
  contentSetId: string | null;
  /** Active label context ID. */
  labelContextId: string | null;
  /** Policy IDs used in the current labeling context. */
  policyIds: string[];
  /** Dataset ID. */
  datasetId: string;
  /** Dataset version. */
  datasetVersion: string;
  /**
   * Call this after a mutation succeeds so the host can invalidate /
   * refetch the appropriate caches.
   */
  requestDataRefresh: (hint: MutationSuccessHint) => void;

  // ─── Canvas access (for tool extensions like SAM) ──────────

  /** Ref to the fabric.Canvas instance (null when no image is loaded). */
  canvasRef: RefObject<unknown | null>;
  /** Current image dimensions and URL (null when no image is loaded). */
  imageInfo: WorkspaceImageInfo | null;
  /** Add fabric objects to the canvas. */
  addCanvasObjects: (objects: unknown[]) => void;
  /** Remove fabric objects matching a predicate from the canvas. */
  removeCanvasObjects: (predicate: (obj: unknown) => boolean) => void;
}
