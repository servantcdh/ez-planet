import { useMemo } from "react";

import type { IconName } from "@/components/atoms/Icon";

import { useLayerModeStore } from "../../store/layerMode.store";
import {
  formatShortcutTitle,
  LABELING_SHORTCUTS,
} from "../../utils/labelingShortcuts";
import { baseBreadcrumbItems } from "./common";
import type { LabelingUIMetaHook } from "./types";

export const useRecordLabelingUIMeta: LabelingUIMetaHook = ({
  goToLabelingRoot,
  title,
}) => {
  const layerMode = useLayerModeStore((state) => state.mode);
  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const layerModeIconType = useMemo<IconName>(() => {
    if (layerMode.length === 2) {
      return `icon-all-layer` as IconName;
    }
    return `icon-${layerMode[0] ? "bottom" : "top"}-layer` as IconName;
  }, [layerMode]);
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
        defaultChecked: true,
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
      { label: title ?? "Record Labeling" },
    ],
  };
};
