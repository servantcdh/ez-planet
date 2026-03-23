import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import type { IconName } from "@/components/atoms/Icon";
import type { ToolbarItemType } from "@/types/toolbar";

import { useLayerModeStore } from "../../store/layerMode.store";
import { useTextAutoHighlightStore } from "../../store/textAutoHighlight.store";
import { useTextTypeLabelingToolSelectionStore } from "../../store/textTypeLabelingToolSelection.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceViewModeStore } from "../../store/workspaceViewMode.store";
import {
  formatShortcutTitle,
  LABELING_SHORTCUTS,
} from "../../utils/labelingShortcuts";
import { dragSegmentTool, selectionTool } from "../../utils/textLabelingTools";
import { resolveWorkspaceViewModeFromContentType } from "../../utils/workspaceViewMode";
import { baseBreadcrumbItems } from "./common";
import type { LabelingUIMetaHook } from "./types";

export const useTextLabelingUIMeta: LabelingUIMetaHook = ({
  goToLabelingRoot,
  isDirty: _isDirty,
}) => {
  const tool = useTextTypeLabelingToolSelectionStore((state) => state.tool);
  const setTool = useTextTypeLabelingToolSelectionStore(
    (state) => state.setTool
  );
  const workspaceViewMode = useWorkspaceViewModeStore((state) => state.mode);
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const layerMode = useLayerModeStore((state) => state.mode);
  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const isEnglishHighlightActive = useTextAutoHighlightStore(
    (state) => state.english
  );
  const isNumberHighlightActive = useTextAutoHighlightStore(
    (state) => state.number
  );
  const isSpecialHighlightActive = useTextAutoHighlightStore(
    (state) => state.special
  );
  const setEnglishHighlightActive = useTextAutoHighlightStore(
    (state) => state.setEnglish
  );
  const setNumberHighlightActive = useTextAutoHighlightStore(
    (state) => state.setNumber
  );
  const setSpecialHighlightActive = useTextAutoHighlightStore(
    (state) => state.setSpecial
  );
  const layerModeIconType = useMemo<IconName>(() => {
    if (layerMode.length === 2) {
      return `icon-all-layer` as IconName;
    }
    return `icon-${layerMode[0] ? "bottom" : "top"}-layer` as IconName;
  }, [layerMode]);
  const subToolIconType = useMemo<IconName>(() => {
    if (isEnglishHighlightActive) {
      return "icon-highlight-text";
    }
    if (isNumberHighlightActive) {
      return "icon-highlight-number";
    }
    if (isSpecialHighlightActive) {
      return "icon-highlight-special";
    }
    return "icon-highlight-text";
  }, [
    isEnglishHighlightActive,
    isNumberHighlightActive,
    isSpecialHighlightActive,
  ]);
  const resolvedViewMode = useMemo(() => {
    if (workspaceViewMode !== "Record") {
      return workspaceViewMode;
    }
    return (
      resolveWorkspaceViewModeFromContentType(contentType) ?? workspaceViewMode
    );
  }, [contentType, workspaceViewMode]);
  const previousViewModeRef = useRef<string | null>(null);

  const [isSubToolPanelOpen, setIsSubToolPanelOpen] = useState(false);
  const hasAutoHighlight =
    isEnglishHighlightActive ||
    isNumberHighlightActive ||
    isSpecialHighlightActive;
  const isSubToolPanelChecked = isSubToolPanelOpen || hasAutoHighlight;

  useEffect(() => {
    if (!tool) {
      setTool(selectionTool());
    }
  }, [setTool, tool]);
  useEffect(() => {
    const previous = previousViewModeRef.current;
    if (previous && previous !== resolvedViewMode) {
      setTool(selectionTool());
      setIsSubToolPanelOpen(false);
    }
    previousViewModeRef.current = resolvedViewMode;
  }, [resolvedViewMode, setTool, setIsSubToolPanelOpen]);

  const subButtonItems = useMemo<ToolbarItemType[] | undefined>(() => {
    if (!isSubToolPanelOpen) {
      return undefined;
    }
    return [
      {
        variant: "checkbox",
        name: "autoHighlight",
        id: "auto-highlight-english",
        label: "English",
        title: "English",
        checked: isEnglishHighlightActive,
        onChange(event: ChangeEvent<HTMLInputElement>) {
          setEnglishHighlightActive(event.target.checked);
        },
      },
      {
        variant: "checkbox",
        name: "autoHighlight",
        id: "auto-highlight-number",
        label: "Number",
        title: "Number",
        checked: isNumberHighlightActive,
        onChange(event: ChangeEvent<HTMLInputElement>) {
          setNumberHighlightActive(event.target.checked);
        },
      },
      {
        variant: "checkbox",
        name: "autoHighlight",
        id: "auto-highlight-special",
        label: "Special",
        title: "Special",
        checked: isSpecialHighlightActive,
        onChange(event: ChangeEvent<HTMLInputElement>) {
          setSpecialHighlightActive(event.target.checked);
        },
      },
    ];
  }, [
    isEnglishHighlightActive,
    isNumberHighlightActive,
    isSpecialHighlightActive,
    isSubToolPanelOpen,
    setEnglishHighlightActive,
    setNumberHighlightActive,
    setSpecialHighlightActive,
  ]);

  useEffect(() => {
    if (!isSubToolPanelOpen) {
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
      if (wrapper && wrapper.querySelector("#subToolPanel")) {
        return;
      }
      setIsSubToolPanelOpen(false);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isSubToolPanelOpen]);
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
        // 선택된 element context에 따라 아이콘 연동 (문자, 숫자)
        // contentType CUSTOM, fieldType string > icon-cursor-text
        // contentType CUSTOM, fieldType number > icon-cursor-number
        iconType: "icon-cursor-text", // icon-cursor-number
        id: "drag-segment",
        name: "tool",
        title: formatShortcutTitle(
          "Highlighting",
          LABELING_SHORTCUTS.text.highlighting
        ),
        disabled: false,
        checked: tool?.id === "drag-segment",
        onClick: () => {
          setTool(dragSegmentTool());
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
        // 역슬래쉬 단축키로도 작동 가능해야 함 (Image 뷰 모드와 동일)
      },
      {
        variant: "checkbox",
        name: "subToolPanel",
        id: "subToolPanel",
        // 활성화된 오토 하이라이팅 유틸 대표 아이콘 표시 (영문자, 숫자문자, 특수문자)
        // 오토 하이라이팅 유틸을 활용하면 특정 유형의 문자가 하이라이트되므로 드래그세그먼트 툴을 사용하기 쉬움
        iconType: subToolIconType,
        title: formatShortcutTitle(
          "Auto highlight",
          LABELING_SHORTCUTS.text.autoHighlight
        ),
        checked: isSubToolPanelChecked,
        onChange: () => {
          setIsSubToolPanelOpen((prev) => !prev);
        },
        subButtonItems,
      },
    ],
    breadcrumbItems: [
      ...baseBreadcrumbItems({ goToLabelingRoot }),
      { label: "Create New Labeling" },
    ],
  };
};
