import { createContext, createRef, useContext, useMemo } from "react";

import type {
  ExtensionRenderContext,
  LabelingExtension,
} from "@/types/extension";

// ─── Context ────────────────────────────────────────────────────

interface ExtensionContextValue {
  extensions: LabelingExtension[];
  renderContext: ExtensionRenderContext;
}

const EMPTY: LabelingExtension[] = [];
const NOOP = () => {};

const ExtensionContext = createContext<ExtensionContextValue>({
  extensions: EMPTY,
  renderContext: {
    contentSetId: null,
    labelContextId: null,
    policyIds: [],
    datasetId: "",
    datasetVersion: "",
    requestDataRefresh: NOOP,
    canvasRef: createRef(),
    imageInfo: null,
    addCanvasObjects: NOOP,
    removeCanvasObjects: NOOP,
  },
});

// ─── Provider ───────────────────────────────────────────────────

interface ExtensionProviderProps {
  extensions: LabelingExtension[];
  renderContext: ExtensionRenderContext;
  children: React.ReactNode;
}

export function ExtensionProvider({
  extensions,
  renderContext,
  children,
}: ExtensionProviderProps) {
  const value = useMemo(
    () => ({ extensions, renderContext }),
    [extensions, renderContext],
  );

  return (
    <ExtensionContext.Provider value={value}>
      {children}
    </ExtensionContext.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────

export function useExtensions() {
  return useContext(ExtensionContext);
}

export type ExtensionSlot = "renderInfoPanelAction" | "renderOverlay" | "renderToolbarAction";

/**
 * Returns only the enabled extensions that have a specific render slot.
 */
export function useExtensionsBySlot(slot: ExtensionSlot) {
  const { extensions, renderContext } = useContext(ExtensionContext);

  return useMemo(() => {
    const active = extensions.filter(
      (ext) => ext.enabled !== false && ext[slot] != null,
    );
    return { extensions: active, renderContext };
  }, [extensions, renderContext, slot]);
}
