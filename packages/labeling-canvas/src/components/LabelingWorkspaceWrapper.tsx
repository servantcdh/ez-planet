import { useMemo } from "react";

import { useLabelingData } from "../providers/LabelingDataProvider";
import { useLabelingMutations } from "../providers/LabelingMutationProvider";
import {
  ExtensionProvider,
  useExtensionsBySlot,
} from "../providers/ExtensionProvider";
import { useFilterBySearchParams } from "../lib/hooks/useSearchInfoMeta";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { LabelWorkspaceDirtyProvider } from "../hooks/useLabelWorkspaceDirty";
import {
  useWorkspaceLayoutStore,
  useWorkspaceNavigationActiveStore,
} from "../store/workspaceLayout.store";
import {
  useWorkspaceCanvasStore,
  addCanvasObjects,
  removeCanvasObjects,
} from "../store/workspaceCanvas.store";
import type { LabelingExtension, ExtensionRenderContext } from "../types/extension";
import WorkspaceControl from "./WorkspaceControl";
import WorkspaceInfoPanel from "./WorkspaceInfoPanel";
import WorkspaceNavigation from "./WorkspaceNavigation";
import WorkspaceSection from "./WorkspaceSection";

const EMPTY_EXTENSIONS: LabelingExtension[] = [];

export interface LabelingWorkspaceProps {
  extensions?: LabelingExtension[];
}

export function LabelingWorkspace({
  extensions = EMPTY_EXTENSIONS,
}: LabelingWorkspaceProps) {
  const direction = useWorkspaceLayoutStore((state) => state.direction);
  const navigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.active
  );

  // Build render context from current workspace state
  const { filter } = useFilterBySearchParams();
  const { labelContext } = useLabelingData();
  const { onMutationSuccess } = useLabelingMutations();
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (s) => s.selectionSnapshot?.contentSetId ?? null,
  );

  const datasetId =
    (filter.datasetId as { value?: string } | undefined)?.value ?? "";
  const datasetVersion =
    (filter.datasetVersion as { value?: string } | undefined)?.value ?? "";
  const policyIds =
    (filter.policyIds as { value?: string[] } | undefined)?.value ?? [];

  // Canvas access for extensions
  const canvasRef = useWorkspaceCanvasStore((s) => s.canvasRef);
  const imageInfo = useWorkspaceCanvasStore((s) => s.imageInfo);

  const renderContext = useMemo<ExtensionRenderContext>(
    () => ({
      contentSetId,
      labelContextId: labelContext.data?.id ?? null,
      policyIds,
      datasetId,
      datasetVersion,
      requestDataRefresh: onMutationSuccess,
      canvasRef,
      imageInfo,
      addCanvasObjects,
      removeCanvasObjects,
    }),
    [contentSetId, labelContext.data?.id, policyIds, datasetId, datasetVersion, onMutationSuccess, canvasRef, imageInfo],
  );

  return (
    <ExtensionProvider extensions={extensions} renderContext={renderContext}>
      <LabelWorkspaceDirtyProvider>
        <div className="lc-root" style={{ height: "100%", overflow: "hidden" }}>
          <div className="content-body workspace">
            <div className="content-main-section">
              <div className="content-main-section__functions">
                <div className="content-main-section__controls">
                  <WorkspaceControl />
                </div>
              </div>
              <div
                className="content-main-section__content"
                data-slot="workspace-content"
                style={{
                  ...(navigationActive
                    ? direction === "vertical"
                      ? { gridTemplateRows: "1fr auto" }
                      : { gridTemplateColumns: "auto 1fr" }
                    : direction === "vertical"
                      ? { gridTemplateRows: "1fr" }
                      : { gridTemplateColumns: "1fr" }),
                }}
              >
                <WorkspaceSection />
                <WorkspaceNavigation />
              </div>
            </div>
            <WorkspaceInfoPanel />
          </div>
        </div>
        <ExtensionOverlays />
      </LabelWorkspaceDirtyProvider>
    </ExtensionProvider>
  );
}

function ExtensionOverlays() {
  const { extensions, renderContext } = useExtensionsBySlot("renderOverlay");
  if (extensions.length === 0) return null;
  return (
    <>
      {extensions.map((ext) => (
        <div key={ext.id}>{ext.renderOverlay!(renderContext)}</div>
      ))}
    </>
  );
}
