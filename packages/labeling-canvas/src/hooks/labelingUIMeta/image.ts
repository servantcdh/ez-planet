import { useEffect, useMemo, useState } from "react";

import type { IconName } from "@/components/atoms/Icon";
import type { ToolbarItemType } from "@/types/toolbar";

import { useImageTypeLabelingToolSelectionStore } from "../../store/imageTypeLabelingToolSelection.store";
import { useLayerModeStore } from "../../store/layerMode.store";
import {
  formatShortcutTitle,
  LABELING_SHORTCUTS,
} from "../../utils/labelingShortcuts";
import {
  blankRectTool,
  brushTool,
  eraserTool,
  magicbrushTool,
  polygonTool,
  selectionTool,
  superpixelTool,
} from "../../utils/tools";
import { baseBreadcrumbItems } from "./common";
import type { LabelingUIMetaHook } from "./types";

type SubToolId = "magic-wand" | "superpixel";

const SUB_TOOL_PANEL_BUTTON_ID = "image-subToolPanel";

const subToolIconMap: Record<SubToolId, IconName> = {
  "magic-wand": "icon-magic-wand",
  superpixel: "icon-superpixel",
} as const;

export const useImageLabelingUIMeta: LabelingUIMetaHook = ({
  goToLabelingRoot,
}) => {
  const tool = useImageTypeLabelingToolSelectionStore((state) => state.tool);
  const setTool = useImageTypeLabelingToolSelectionStore(
    (state) => state.setTool
  );
  const layerMode = useLayerModeStore((state) => state.mode);
  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const [isActiveSubToolPanel, setIsActiveSubToolPanel] = useState(false);
  const [selectedSubToolId, setSelectedSubToolId] =
    useState<SubToolId>("magic-wand");
  const subButtonItems = useMemo<ToolbarItemType[] | undefined>(() => {
    if (!isActiveSubToolPanel) {
      return undefined;
    }
    return [
      {
        variant: "button",
        iconType: subToolIconMap["magic-wand"],
        tooltip: formatShortcutTitle(
          "Magic Brush",
          LABELING_SHORTCUTS.image.magicBrush
        ),
        disabled: false,
        onClick: () => {
          setTool(magicbrushTool());
          setSelectedSubToolId("magic-wand");
          setIsActiveSubToolPanel(false);
        },
      },
      {
        variant: "button",
        iconType: subToolIconMap.superpixel,
        tooltip: formatShortcutTitle(
          "Superpixel",
          LABELING_SHORTCUTS.image.superpixel
        ),
        disabled: false,
        onClick: () => {
          setTool(superpixelTool());
          setSelectedSubToolId("superpixel");
          setIsActiveSubToolPanel(false);
        },
      },
    ];
  }, [
    isActiveSubToolPanel,
    setTool,
    setSelectedSubToolId,
    setIsActiveSubToolPanel,
  ]);
  const layerModeIconType = useMemo<IconName>(() => {
    if (layerMode.length === 2) {
      return `icon-all-layer` as IconName;
    }
    return `icon-${layerMode[0] ? "bottom" : "top"}-layer` as IconName;
  }, [layerMode]);
  useEffect(() => {
    if (["magic-wand", "superpixel"].includes(tool?.id ?? "")) {
      setSelectedSubToolId(tool?.id as SubToolId);
    }
    setIsActiveSubToolPanel(false);
  }, [tool, setSelectedSubToolId]);
  useEffect(() => {
    if (!isActiveSubToolPanel) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const wrapper = target.closest(".button-with-sub");
      if (wrapper && wrapper.querySelector(`#${SUB_TOOL_PANEL_BUTTON_ID}`)) {
        return;
      }
      setIsActiveSubToolPanel(false);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isActiveSubToolPanel]);
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
        onClick: () => {
          setTool(selectionTool());
        },
      },
      { variant: "toolbarDivider" },
      {
        variant: "radio",
        iconType: "icon-borderd-rect",
        id: "bounded-box",
        name: "tool",
        title: formatShortcutTitle(
          "Bounding Box",
          LABELING_SHORTCUTS.image.boundingBox
        ),
        disabled: false,
        checked: tool?.id === "bounded-box",
        onClick: () => {
          setTool(blankRectTool());
        },
      },
      {
        variant: "radio",
        iconType: "icon-pen",
        id: "pen",
        name: "tool",
        title: formatShortcutTitle("Pen", LABELING_SHORTCUTS.image.pen),
        disabled: false,
        checked: tool?.id === "pen",
        onClick: () => {
          setTool(polygonTool());
        },
      },
      {
        variant: "radio",
        iconType: "icon-brush",
        id: "brush",
        name: "tool",
        title: formatShortcutTitle("Brush", LABELING_SHORTCUTS.image.brush),
        disabled: false,
        checked: tool?.id === "brush",
        onClick: () => {
          setTool(brushTool());
        },
      },
      {
        variant: "radio",
        iconType: subToolIconMap[selectedSubToolId],
        name: "tool",
        title:
          selectedSubToolId === "magic-wand"
            ? formatShortcutTitle(
                "Magic Brush",
                LABELING_SHORTCUTS.image.magicBrush
              )
            : formatShortcutTitle(
                "Superpixel",
                LABELING_SHORTCUTS.image.superpixel
              ),
        disabled: false,
        checked: tool?.id === selectedSubToolId,
        id: selectedSubToolId,
        onClick: () => {
          switch (selectedSubToolId) {
            case "magic-wand":
              setTool(magicbrushTool());
              break;
            case "superpixel":
              setTool(superpixelTool());
              break;
            default:
              break;
          }
        },
      },
      {
        variant: "button",
        iconType: "icon-down",
        id: SUB_TOOL_PANEL_BUTTON_ID,
        tooltip: "More tools",
        onClick: () => {
          setIsActiveSubToolPanel(!isActiveSubToolPanel);
        },
        disabled: false,
        isSlim: true,
        subButtonItems,
      },
      {
        variant: "radio",
        iconType: "icon-eraser",
        id: "eraser",
        name: "tool",
        title: formatShortcutTitle("Eraser", LABELING_SHORTCUTS.image.eraser),
        disabled: false,
        checked: tool?.id === "eraser",
        onClick: () => {
          setTool(eraserTool());
        },
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
    breadcrumbItems: baseBreadcrumbItems({ goToLabelingRoot }),
  };
};
