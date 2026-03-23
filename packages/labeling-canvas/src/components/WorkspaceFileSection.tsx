import { useEffect, useMemo } from "react";

import { Button, Icon, Tip, Wrapper } from "@/components";
import UploadBox from "@/components/molecules/UploadBox";

import { useLabelInsertPayloadStore } from "../store/labelInsertPayload.store";
import { useWorkspaceFileLabelStore } from "../store/workspaceFileLabel.store";
import { useWorkspaceNavigationActiveStore } from "../store/workspaceLayout.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { resolveFileIconType } from "../utils/fileLabel";
import {
  getLabelingShortcutKey,
  LABELING_SHORTCUTS,
  shouldIgnoreLabelingShortcutEvent,
} from "../utils/labelingShortcuts";

interface WorkspaceFileSectionProps {
  active: boolean;
  hideUpload?: boolean;
}

function WorkspaceFileSection({
  active,
  hideUpload,
}: WorkspaceFileSectionProps) {
  const labelInsertPayload = useLabelInsertPayloadStore(
    (state) => state.payload
  );
  const labelInsertClassMeta = useLabelInsertPayloadStore(
    (state) => state.classMeta
  );
  const fileDrafts = useWorkspaceFileLabelStore((state) => state.drafts);
  const setDraft = useWorkspaceFileLabelStore((state) => state.setDraft);
  const clearDrafts = useWorkspaceFileLabelStore((state) => state.clearDrafts);
  const isUploading = useWorkspaceFileLabelStore((state) => state.isUploading);
  const navigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.active
  );
  const setNavigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.setActive
  );

  useEffect(() => {
    if (!active) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreLabelingShortcutEvent(event.target)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const key = getLabelingShortcutKey(event);
      if (key === LABELING_SHORTCUTS.common.navigationToggle.key) {
        setNavigationActive(!navigationActive);
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, navigationActive, setNavigationActive]);
  const selectedRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.selectedRows
  );
  const rows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.rows
  );

  const selectedRow = useMemo(() => {
    return rows[selectedRows[0]] ?? null;
  }, [rows, selectedRows]);
  const selectedFileName =
    typeof selectedRow?.fileName === "string" ? selectedRow.fileName : "";
  const selectedEndpointUrl =
    typeof selectedRow?.endpointUrl === "string" ? selectedRow.endpointUrl : "";
  const hasSelectedFileInfo =
    selectedFileName.length > 0 && selectedEndpointUrl.length > 0;

  const existingFileName = hasSelectedFileInfo ? selectedFileName : "";
  const existingFileIconType = resolveFileIconType(existingFileName);
  const downloadUrl = hasSelectedFileInfo ? selectedEndpointUrl : "";
  const hasPolicySelected = Boolean(labelInsertPayload?.policyId);
  const activeDraft = fileDrafts[0] ?? null;

  const handleFileUpload = (files: FileList) => {
    if (!hasPolicySelected || isUploading) {
      return;
    }
    if (files.length > 1) {
      window.alert("Only one file can be uploaded at a time.");
      return;
    }
    const nextFile = files.item(0);
    if (!nextFile) {
      return;
    }
    if (!labelInsertPayload) {
      return;
    }
    setDraft(nextFile, labelInsertPayload, labelInsertClassMeta);
  };

  const handleDownload = () => {
    if (!downloadUrl) {
      return;
    }
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={active ? undefined : { display: "none" }}
      className="workspace-section workspace-section--file"
      aria-busy={isUploading}
    >
      <Wrapper
        direction="vertical"
        gapSize="1rem"
        className="workspace-section__file-wrapper !w-full !max-w-none"
      >
        {hasSelectedFileInfo ? (
          <div className="workspace-file-preview">
            <p className="workspace-file-preview__title">
              This file type is not supported for preview.
            </p>
            <div className="workspace-file-preview__meta">
              <Icon iconType={existingFileIconType} size="sm" />
              <span>{existingFileName || "File"}</span>
            </div>
            <Button
              title="Download"
              style="gray-outline"
              className="workspace-file-preview__download"
              onClick={handleDownload}
              disabled={!downloadUrl}
            >
              <Icon iconType="icon-download" size="sm" />
            </Button>
          </div>
        ) : (
          <Tip
            title="No file data to display"
            content="The selected element does not include fileName or endpointUrl."
            isClosable={false}
          />
        )}
        {!hideUpload && (
          <UploadBox
            className="!h-96 !w-11/12 mt-4"
            file={activeDraft?.file ?? null}
            disabled={!hasPolicySelected || isUploading}
            onFileUpload={handleFileUpload}
            onRemoveFile={
              activeDraft && !isUploading ? () => clearDrafts() : undefined
            }
          />
        )}
      </Wrapper>
    </div>
  );
}

export default WorkspaceFileSection;
