import { useEffect, useMemo } from "react";

import type { IconName } from "@/components/atoms/Icon";

import { useLayerModeStore } from "../../store/layerMode.store";
import { useNumberLabelingToolSelectionStore } from "../../store/numberLabelingToolSelection.store";
import {
  formatShortcutTitle,
  LABELING_SHORTCUTS,
} from "../../utils/labelingShortcuts";
import { dragSegmentTool, selectionTool } from "../../utils/numberLabelingTools";
import { baseBreadcrumbItems } from "./common";
import type { LabelingUIMetaHook } from "./types";

export const useNumberLabelingUIMeta: LabelingUIMetaHook = ({
  goToLabelingRoot,
  title,
}) => {
  const tool = useNumberLabelingToolSelectionStore((state) => state.tool);
  const setTool = useNumberLabelingToolSelectionStore((state) => state.setTool);
  const layerMode = useLayerModeStore((state) => state.mode);
  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const layerModeIconType = useMemo<IconName>(() => {
    if (layerMode.length === 2) {
      return `icon-all-layer` as IconName;
    }
    return `icon-${layerMode[0] ? "bottom" : "top"}-layer` as IconName;
  }, [layerMode]);

  useEffect(() => {
    if (!tool) {
      setTool(selectionTool());
    }
  }, [setTool, tool]);

  return {
    toolbar: [
      {
        variant: "radio",
        iconType: "icon-selection",
        id: "selection",
        name: "tool",
        title: formatShortcutTitle(
          "Selection",
          LABELING_SHORTCUTS.common.selection
        ),
        disabled: false,
        checked: tool?.id === "selection",
        onClick: () => setTool(selectionTool()),
      },
      { variant: "toolbarDivider" },
      {
        variant: "radio",
        iconType: "icon-cursor-number",
        id: "drag-segment",
        name: "tool",
        title: formatShortcutTitle(
          "Highlighting",
          LABELING_SHORTCUTS.number.highlighting
        ),
        disabled: false,
        checked: tool?.id === "drag-segment",
        onClick: () => setTool(dragSegmentTool()),
      },
      { variant: "toolbarDivider" },
      {
        variant: "button",
        iconType: layerModeIconType,
        tooltip: formatShortcutTitle(
          "Toggle layer mode",
          LABELING_SHORTCUTS.common.layerToggle
        ),
        onClick: cycleLayerMode,
        disabled: false,
      },
    ],
    breadcrumbItems: [
      ...baseBreadcrumbItems({ goToLabelingRoot }),
      { label: title ?? "Number Labeling" },
    ],
  };
};
