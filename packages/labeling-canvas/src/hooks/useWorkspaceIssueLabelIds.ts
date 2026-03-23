import { useMemo } from "react";

import { useValidResultSearch } from "@/queries";
import { useWorkspaceIssuePanelStore } from "@/store/workspaceIssuePanel.store";
import { useWorkspaceNavigationDetailSelectionStore } from "@/store/workspaceNavigationDetailSelection.store";
import { useWorkspaceViewModeStore } from "@/store/workspaceViewMode.store";
import type { ValidResultSearchRequest } from "@/types/domain";

import { useWorkspaceLabelSearchParams } from "./useWorkspaceLabelSearchParams";

export function useWorkspaceIssueLabelIds() {
  const { labelContextId, isRecordLabelingMode } =
    useWorkspaceLabelSearchParams();
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const workspaceViewMode = useWorkspaceViewModeStore((state) => state.mode);
  const issueDrafts = useWorkspaceIssuePanelStore((state) => state.drafts);

  const validResultSearchRequest = useMemo<
    ValidResultSearchRequest | undefined
  >(() => {
    if (!labelContextId) {
      return undefined;
    }
    const shouldUseContentSet =
      workspaceViewMode === "Record" ||
      isRecordLabelingMode ||
      (contentType ?? "").toUpperCase() === "TABLE";
    const request: ValidResultSearchRequest = {
      labelContextId: { operator: "EQ", value: labelContextId },
      validType: { operator: "EQ", value: "LABEL" },
      orderBy: { createdDate: "DESC" },
    };
    if (shouldUseContentSet) {
      if (!contentSetId) {
        return undefined;
      }
      request.contentSetId = { operator: "EQ", value: contentSetId };
      return request;
    }
    if (!elementId) {
      return undefined;
    }
    request.elementId = { operator: "EQ", value: elementId };
    return request;
  }, [
    contentSetId,
    contentType,
    elementId,
    isRecordLabelingMode,
    labelContextId,
    workspaceViewMode,
  ]);

  const validResultQuery = useValidResultSearch(validResultSearchRequest);
  const validResults = validResultQuery.data?.list ?? [];

  const issueLabelIdSet = useMemo(() => {
    const ids = new Set<string>();
    issueDrafts.forEach((draft) => {
      draft.labels.forEach((label) => {
        if (label.labelId) {
          ids.add(label.labelId);
        }
      });
    });
    validResults.forEach((result) => {
      if (result.labelId) {
        ids.add(result.labelId);
      }
    });
    return ids;
  }, [issueDrafts, validResults]);

  const hasIssues = issueDrafts.length > 0 || validResults.length > 0;

  return { issueLabelIdSet, hasIssues };
}
