import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Icon } from "@/components";
import Image from "@/components/atoms/Image";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import { useWorkspaceIssueLabelIds } from "../hooks/useWorkspaceIssueLabelIds";
import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import { useLabelingPoliciesBatch, useLabelSearch } from "../queries";
import { useImageTypeLabelingToolSelectionStore } from "../store/imageTypeLabelingToolSelection.store";
import { useMagicBrushConfigStore } from "../store/imageTypeMagicBrushConfig.store";
import { useSuperPixelConfigStore } from "../store/imageTypeSuperPixelConfig.store";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelingCanvasObjectsStore } from "../store/labelingCanvasObjects.store";
import {
  useBrushStore,
  usePaletteStore,
} from "../store/labelingPaletteSelection.store";
import { useLabelInsertPayloadStore } from "../store/labelInsertPayload.store";
import { useLabelSelectionStore } from "../store/labelSelection.store";
import { useLabelVisibilityStore } from "../store/labelVisibility.store";
import {
  ORIGIN_LAYER_INDEX,
  OVERLAY_LAYER_INDEX,
  useLayerModeStore,
} from "../store/layerMode.store";
import { useSelectedLabelObjectsStore } from "../store/selectedLabelObjects.store";
import { useWorkspaceIssuePanelStore } from "../store/workspaceIssuePanel.store";
import { useWorkspaceNavigationActiveStore } from "../store/workspaceLayout.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceCanvasStore } from "../store/workspaceCanvas.store";
import { useWorkspaceZoomStore } from "../store/workspaceZoom.store";
import type { ClassificationValue, LabelInsertData } from "../types/domain";
import {
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_BRUSHCURSOR,
  TOOL_INFO_FILLED_BOX,
  TOOL_INFO_SUPERPIXEL_BOUNDARY,
} from "../utils/imageLabelingConstants";
import {
  createCanvasJSON,
  getCanvasInstance,
} from "../utils/imageLabelingCore";
import {
  emitLabelEvent,
  globalInit,
  type LabelingTool,
  setKeyboardEventsEnabled,
  subscribeLabelEvents,
} from "../utils/imageLabelingTools";
import type {
  LabeledFabricObject,
  ZoomPayload,
} from "../utils/imageLabelingTypes";
import { mapLabelResponsesToFabricObjects } from "../utils/labelServerMapper";
import {
  IMAGE_SECTION_CANVAS_OBJECT_SELECTED_LAYOUT_STYLE,
  resolveWorkspaceBorderStyle,
} from "../utils/workspaceFocusBorder";

const getObjectClassLabel = (object: LabeledFabricObject): string => {
  if (typeof object.class === "string" && object.class.length) {
    return object.class;
  }
  const labelValue =
    typeof object.labelInsertData === "object" &&
    object.labelInsertData &&
    (object.labelInsertData as { labelValue?: unknown }).labelValue;
  if (
    labelValue &&
    typeof labelValue === "object" &&
    labelValue !== null &&
    "className" in labelValue &&
    typeof (labelValue as { className?: unknown }).className === "string"
  ) {
    return (labelValue as { className?: string }).className ?? "";
  }
  return "";
};
import {
  getLabelingShortcutKey,
  LABELING_SHORTCUTS,
  shouldIgnoreLabelingShortcutEvent,
} from "../utils/labelingShortcuts";
import {
  blankRectTool,
  brushTool,
  eraserTool,
  magicbrushTool,
  polygonTool,
  selectionTool,
  superpixelTool,
} from "../utils/tools";

const getTextColorForBackground = (color?: string): string => {
  if (!color) {
    return "#fff";
  }

  // Handle RGB/RGBA
  if (color.startsWith("rgb")) {
    const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#000" : "#fff";
    }
  }

  // Handle Hex
  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) {
    return "#fff";
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#fff";

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000" : "#fff";
};

const NO_ELEMENT_KEY = "__no_element__";

const normalizeElementKey = (value?: string | null): string =>
  typeof value === "string" && value.length > 0 ? value : NO_ELEMENT_KEY;

type ClassificationBadgeEntry = {
  tempId: string;
  label: LabelInsertData & { id?: string };
  color?: string;
};

const createTempId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `temp-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
};

interface WorkspaceImageSectionProps {
  active: boolean;
  endpointUrl: string;
  readOnly?: boolean;
}

function WorkspaceImageSection({
  active,
  endpointUrl,
  readOnly = false,
}: WorkspaceImageSectionProps) {
  const colorCode = usePaletteStore((state) => state.colorCode);
  const brush = useBrushStore((state) => state.brush);
  const tool = useImageTypeLabelingToolSelectionStore((state) => state.tool);
  const setTool = useImageTypeLabelingToolSelectionStore(
    (state) => state.setTool
  );
  const zoomLevel = useWorkspaceZoomStore((state) => state.level);
  const setZoomLevel = useWorkspaceZoomStore((state) => state.setLevel);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const toolRef = useRef<LabelingTool | null>(null);
  const prevToolRef = useRef<LabelingTool | null>(null);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const magicbrushConfig = useMagicBrushConfigStore((state) => state.config);
  const superpixelConfig = useSuperPixelConfigStore((state) => state.config);
  const layerMode = useLayerModeStore((state) => state.mode);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [toolHistory, setToolHistory] = useState<LabelingTool[]>([]);
  const skipCanvasSyncRef = useRef(false);
  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const navigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.active
  );
  const setSelectedLabelObjects = useSelectedLabelObjectsStore(
    (state) => state.setObjects
  );
  const canvasObjects = useLabelingCanvasObjectsStore((state) => state.objects);
  const setCanvasObjects = useLabelingCanvasObjectsStore(
    (state) => state.setObjects
  );
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const selectedClassificationInfo = useLabelSelectionStore(
    (state) => state.selectedClassificationInfo
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const { issueLabelIdSet } = useWorkspaceIssueLabelIds();
  const openIssuePanel = useWorkspaceIssuePanelStore((state) => state.open);
  const setNavigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.setActive
  );
  const syncFabricObjects = useLabelBatchStore(
    (state) => state.syncFabricObjects
  );
  const replaceFabricEntriesFromServer = useLabelBatchStore(
    (state) => state.replaceFabricEntriesFromServer
  );
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const labelDataRevision = useLabelBatchStore(
    (state) => state.labelDataRevision
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const { filter } = useFilterBySearchParams();
  const policyIdsFilter = filter.policyIds as SearchOperatorValue<string[]>;
  const policyIds = policyIdsFilter?.value ?? [];
  const { data: policies = [] } = useLabelingPoliciesBatch(policyIds);
  const { request: labelSearchRequest } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const { refetch: refetchLabelSearch } = labelSearchQuery;
  const serverLabels = useMemo(
    () => {
      const list = labelSearchQuery.data?.list ?? [];
      if (!elementId) {
        return list;
      }
      return list.filter((label) => label.elementId === elementId);
    },
    [elementId, labelSearchQuery.data?.list]
  );
  const lastRefetchedRevisionRef = useRef(labelDataRevision);
  const resolveClassificationMeta = useCallback(
    (
      policyId: string | null | undefined,
      value: ClassificationValue | undefined
    ) => {
      if (!policyId || !value) {
        return null;
      }
      const policy = policies.find((policyItem) => policyItem.id === policyId);
      if (!policy) {
        return null;
      }
      const classes = policy.classes ?? [];
      const byIndex =
        typeof value.classIndex === "number"
          ? classes.find((item) => item.index === value.classIndex)
          : undefined;
      if (byIndex) {
        return byIndex;
      }
      if (value.className) {
        return classes.find((item) => item.name === value.className) ?? null;
      }
      return null;
    },
    [policies]
  );

  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const classificationInsertPayload = useLabelInsertPayloadStore(
    (state) => state.payload
  );
  const isContentSetClassification = useMemo(() => {
    const unitType = (
      classificationInsertPayload?.unitType ?? ""
    ).toUpperCase();
    const elementKey = classificationInsertPayload?.elementId;
    return unitType === "CONTENTSET" && !elementKey;
  }, [
    classificationInsertPayload?.elementId,
    classificationInsertPayload?.unitType,
  ]);
  useEffect(() => {
    setSelectedClassificationId(null);
    setIsCanvasFocused(false);
  }, [elementId, setSelectedClassificationId, setIsCanvasFocused]);

  const serverClassificationEntries = useMemo<
    ClassificationBadgeEntry[]
  >(() => {
    return serverLabels
      .filter((label) => label.inferenceType === "CLASSIFICATION")
      .map((label) => {
        const classificationValue =
          (label.labelValue as ClassificationValue | undefined) ?? undefined;
        const classMeta = resolveClassificationMeta(
          label.policyId ?? undefined,
          classificationValue
        );
        return {
          tempId: label.id,
          label: {
            id: label.id,
            contentSetId: label.contentSetId ?? undefined,
            elementId: label.elementId ?? undefined,
            policyId: label.policyId ?? "",
            inferenceType: "CLASSIFICATION",
            unitType: label.unitType ?? "ELEMENT",
            labelType: label.labelType ?? undefined,
            labelValue: label.labelValue ?? undefined,
            attributeValues: label.attributeValues ?? [],
          },
          color: classMeta?.color,
        };
      });
  }, [resolveClassificationMeta, serverLabels]);
  const visibleClassificationLabels = useMemo<
    ClassificationBadgeEntry[]
  >(() => {
    const getClassificationKey = (entry: ClassificationBadgeEntry) => {
      const policyKey = entry.label.policyId ?? "";
      const value = entry.label.labelValue as
        | { classIndex?: number; className?: string }
        | undefined;
      const classIndex =
        typeof value?.classIndex === "number"
          ? `idx-${value.classIndex}`
          : null;
      const className = value?.className ? `name-${value.className}` : null;
      const keyPart = classIndex ?? className;
      if (!keyPart) {
        return entry.label.id ?? entry.tempId ?? null;
      }
      return `${policyKey}::${keyPart}`;
    };

    const currentKey = normalizeElementKey(elementId);
    const serverEntries = serverClassificationEntries.filter((entry) => {
      const entryKey = normalizeElementKey(entry.label.elementId ?? null);
      return entryKey === currentKey;
    });
    const merged = new Map<string, ClassificationBadgeEntry>();
    serverEntries.forEach((entry) => {
      const key = getClassificationKey(entry);
      merged.set(key, entry);
    });
    classificationLabels.forEach((entry) => {
      const entryKey = normalizeElementKey(entry.label.elementId ?? null);
      if (entryKey !== currentKey) {
        return;
      }
      const key = getClassificationKey(entry);
      merged.set(key, entry);
    });
    return Array.from(merged.values()).filter((entry) => {
      const key = entry.label.id ?? entry.tempId;
      if (!key) {
        return true;
      }
      return !hiddenClassificationIds[key];
    });
  }, [
    classificationLabels,
    elementId,
    hiddenClassificationIds,
    serverClassificationEntries,
  ]);
  const lastLabelRequestRef = useRef(labelSearchRequest);

  useEffect(() => {
    if (lastLabelRequestRef.current === labelSearchRequest) {
      return;
    }
    lastLabelRequestRef.current = labelSearchRequest;
    emitLabelEvent("reset");
  }, [labelSearchRequest]);

  useEffect(() => {
    if (!labelSearchRequest) {
      return;
    }
    if (labelDataRevision === 0) {
      return;
    }
    if (labelDataRevision === lastRefetchedRevisionRef.current) {
      return;
    }
    lastRefetchedRevisionRef.current = labelDataRevision;
    void refetchLabelSearch();
  }, [labelDataRevision, labelSearchRequest, refetchLabelSearch]);

  useEffect(() => {
    setPanelOffset({ x: 0, y: 0 });
    emitLabelEvent("zoom", {
      direction: 0,
      level: 1,
      onChange: ({ level }) => setZoomLevel(level),
    } satisfies ZoomPayload);
    setImageWidth(0);
    setImageHeight(0);
    setCanvasKey((key) => key + 1);
  }, [endpointUrl, setPanelOffset, setZoomLevel]);

  const stopPanning = useCallback(() => {
    if (!isPanningRef.current) {
      return;
    }
    isPanningRef.current = false;
  }, []);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isSpacePressedRef.current || event.button !== 0) {
        return;
      }
      isPanningRef.current = true;
      panStartRef.current = { x: event.clientX, y: event.clientY };
      panOriginRef.current = { ...panelOffset };
      event.preventDefault();
    },
    [panelOffset]
  );

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) {
        return;
      }
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      setPanelOffset({
        x: panOriginRef.current.x + dx,
        y: panOriginRef.current.y + dy,
      });
      event.preventDefault();
    },
    []
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const target = canvasRef.current?.parentElement ?? panelRef.current;
      const rect = target?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const hasArea = rect.width > 0 && rect.height > 0;
      const pointerOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const direction: ZoomPayload["direction"] = event.deltaY < 0 ? 1 : -1;
      emitLabelEvent("zoom", {
        direction,
        level: zoomLevel,
        point: {
          x: hasArea ? pointerOffset.x / zoomLevel : 0,
          y: hasArea ? pointerOffset.y / zoomLevel : 0,
        },
        onChange: ({ level }) => {
          setZoomLevel(level);
          if (!hasArea) {
            return;
          }
          const ratio = level / zoomLevel;
          if (!Number.isFinite(ratio) || ratio === 0 || ratio === 1) {
            return;
          }
          setPanelOffset((prev) => ({
            x: prev.x + (1 - ratio) * (pointerOffset.x - rect.width / 2),
            y: prev.y + (1 - ratio) * (pointerOffset.y - rect.height / 2),
          }));
        },
      } satisfies ZoomPayload);
    },
    [setPanelOffset, setZoomLevel, zoomLevel]
  );

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    panel.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      panel.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  useEffect(() => {
    setKeyboardEventsEnabled(active);
    if (!active) {
      if (isSpacePressedRef.current && prevToolRef.current) {
        setTool(prevToolRef.current);
      }
      isSpacePressedRef.current = false;
      prevToolRef.current = null;
      stopPanning();
      skipCanvasSyncRef.current = true;
      setCanvasObjects([]);
      setSelectedLabelObjects([]);
      setIsCanvasFocused(false);
    }
    return () => {
      setKeyboardEventsEnabled(true);
    };
  }, [
    active,
    setCanvasObjects,
    setSelectedLabelObjects,
    setTool,
    stopPanning,
    setIsCanvasFocused,
  ]);

  useEffect(() => {
    toolRef.current = tool;
    if (!tool) {
      return;
    }
    setToolHistory(
      (prevState) =>
        (prevState.length ? [prevState.pop(), tool] : [tool]) as LabelingTool[]
    );
  }, [tool]);

  useEffect(() => {
    if (!canvasReady || readOnly) {
      return;
    }
    if (isContentSetClassification) {
      return;
    }
    const focusClassification = () => {
      if (toolRef.current?.id !== "selection") {
        return;
      }
      const classificationValue =
        (classificationInsertPayload?.labelValue as
          | ClassificationValue
          | undefined) ?? undefined;
      const tempId =
        selectedClassificationInfo?.tempId &&
        selectedClassificationInfo.isCanvasFocused
          ? selectedClassificationInfo.tempId
          : createTempId();
      setIsCanvasFocused(true);
      setSelectedClassificationId(null, {
        policyId: classificationInsertPayload?.policyId ?? null,
        classIndex: classificationValue?.classIndex ?? null,
        className: classificationValue?.className ?? null,
        labelId: null,
        tempId,
        isCanvasFocused: true,
      });
    };
    const unsubscribe = subscribeLabelEvents((action) => {
      if (action === "blur") {
        focusClassification();
        return;
      }
      if (action === "focus") {
        setIsCanvasFocused(false);
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, [
    canvasKey,
    canvasReady,
    classificationInsertPayload,
    selectedClassificationInfo?.isCanvasFocused,
    selectedClassificationInfo?.tempId,
    setIsCanvasFocused,
    setSelectedClassificationId,
    isContentSetClassification,
  ]);

  useEffect(() => {
    if (!canvasReady || readOnly) {
      return;
    }
    const fabricCanvas = getCanvasInstance();
    if (!fabricCanvas) {
      return;
    }
    if (isContentSetClassification) {
      return;
    }
    const handleCanvasMouseDown = (event: any) => {
      if (event?.e && event.e.button !== 0) {
        return;
      }
      if (readOnly) {
        return;
      }
      if (toolRef.current?.id !== "selection") {
        return;
      }
      // 빈 영역 클릭에만 반응
      const target = (event as unknown as { target?: LabeledFabricObject })
        .target;
      if (target) {
        return;
      }
      const classificationValue =
        (classificationInsertPayload?.labelValue as
          | ClassificationValue
          | undefined) ?? undefined;
      const tempId =
        selectedClassificationInfo?.tempId &&
        selectedClassificationInfo.isCanvasFocused
          ? selectedClassificationInfo.tempId
          : createTempId();
      setIsCanvasFocused(true);
      setSelectedClassificationId(null, {
        policyId: classificationInsertPayload?.policyId ?? null,
        classIndex: classificationValue?.classIndex ?? null,
        className: classificationValue?.className ?? null,
        labelId: null,
        tempId,
        isCanvasFocused: true,
      });
    };
    fabricCanvas.on("mouse:down", handleCanvasMouseDown);
    return () => {
      fabricCanvas.off("mouse:down", handleCanvasMouseDown);
    };
  }, [
    canvasKey,
    canvasReady,
    classificationInsertPayload,
    selectedClassificationInfo?.isCanvasFocused,
    selectedClassificationInfo?.tempId,
    setSelectedClassificationId,
    isContentSetClassification,
  ]);

  useEffect(() => {
    if (tool?.id !== "selection") {
      setIsCanvasFocused(false);
    }
  }, [tool]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container || imageWidth === 0 || imageHeight === 0) {
      return;
    }
    const canvasElement = document.createElement("canvas");
    canvasRef.current = canvasElement;
    container.appendChild(canvasElement);
    setCanvasReady(true);

    const noop = () => {};
    const cleanUp = globalInit({
      labeler: "developer",
      cvs: canvasElement,
      width: imageWidth,
      height: imageHeight,
      readOnly,
      setSelectedObject: setSelectedLabelObjects,
      addLabelObject: noop,
      addLabelObjects: noop,
      updateLabelObject: noop,
      deleteLabelObject: noop,
      compareByObjects: setCanvasObjects,
      setObjects: setCanvasObjects,
      resetSegmentations: noop,
      selectedLayoutStyle: IMAGE_SECTION_CANVAS_OBJECT_SELECTED_LAYOUT_STYLE,
      onDone: () => {
        setTool(selectionTool());
      },
    });

    // Expose canvas instance to the extension render context
    const canvasStoreRef = useWorkspaceCanvasStore.getState().canvasRef;
    (canvasStoreRef as { current: unknown }).current = getCanvasInstance();

    return () => {
      (canvasStoreRef as { current: unknown }).current = null;
      if (cleanUp) {
        cleanUp();
      }
      if (canvasElement.parentElement) {
        canvasElement.remove();
      }
      if (canvasRef.current === canvasElement) {
        canvasRef.current = null;
      }
      setCanvasReady(false);
      skipCanvasSyncRef.current = true;
      setCanvasObjects([]);
      setSelectedLabelObjects([]);
    };
  }, [
    canvasKey,
    imageWidth,
    imageHeight,
    readOnly,
    setCanvasObjects,
    setSelectedLabelObjects,
    setTool,
  ]);

  // Sync image info to the canvas store for extensions
  useEffect(() => {
    const store = useWorkspaceCanvasStore.getState();
    if (imageWidth > 0 && imageHeight > 0) {
      store.setImageInfo({ url: endpointUrl, width: imageWidth, height: imageHeight });
    } else {
      store.setImageInfo(null);
    }
    return () => {
      store.setImageInfo(null);
    };
  }, [endpointUrl, imageWidth, imageHeight]);

  useEffect(() => {
    if (!tool) {
      return;
    }

    if (!toolHistory.length) {
      return;
    }

    if (imageWidth === 0 || imageHeight === 0) {
      return;
    }

    const cleanUp =
      tool.init &&
      tool.init({
        src: endpointUrl,
        colorCode,
        brush,
        magicbrushConfig,
        superpixelConfig,
        previousTool: toolHistory[0],
        callback() {},
      });

    return () => {
      if (cleanUp) {
        if (cleanUp instanceof Promise) {
          cleanUp.then((f) => {
            if (f) {
              f();
            }
          });
        } else {
          cleanUp();
        }
      }
    };
  }, [
    toolHistory,
    endpointUrl,
    tool,
    colorCode,
    brush,
    magicbrushConfig,
    superpixelConfig,
    imageWidth,
    imageHeight,
  ]);

  useEffect(() => {
    const shouldIgnore = (element: EventTarget | null) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const tagName = element.tagName.toLowerCase();
      return (
        element.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!active) {
        return;
      }
      if (event.repeat) {
        return;
      }
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      if (shouldIgnore(event.target)) {
        return;
      }
      if (isSpacePressedRef.current) {
        return;
      }
      isSpacePressedRef.current = true;
      prevToolRef.current = toolRef.current;
      setTool(null);
      event.preventDefault();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!active) {
        return;
      }
      if (!isSpacePressedRef.current) {
        return;
      }
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      isSpacePressedRef.current = false;
      if (prevToolRef.current) {
        setTool(prevToolRef.current);
      }
      stopPanning();
      prevToolRef.current = null;
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mouseup", stopPanning);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mouseup", stopPanning);
    };
  }, [active, setTool, stopPanning]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setIsCanvasFocused(false);
      setSelectedClassificationId(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [active, setSelectedClassificationId, setIsCanvasFocused]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const handleToolShortcut = (event: KeyboardEvent) => {
      if (shouldIgnoreLabelingShortcutEvent(event.target)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const key = getLabelingShortcutKey(event);
      switch (key) {
        case LABELING_SHORTCUTS.common.selection.key:
          setTool(selectionTool());
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.image.boundingBox.key:
          setTool(blankRectTool());
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.image.pen.key:
          setTool(polygonTool());
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.image.brush.key:
          setTool(brushTool());
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.image.magicBrush.key:
          setTool(magicbrushTool());
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.image.superpixel.key:
          setTool(superpixelTool());
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.image.eraser.key:
          setTool(eraserTool());
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.common.layerToggle.key:
          cycleLayerMode();
          event.preventDefault();
          break;
        case LABELING_SHORTCUTS.common.navigationToggle.key:
          setNavigationActive(!navigationActive);
          event.preventDefault();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleToolShortcut);
    return () => {
      window.removeEventListener("keydown", handleToolShortcut);
    };
  }, [active, cycleLayerMode, navigationActive, setNavigationActive, setTool]);

  useEffect(() => {
    const panelElement = panelRef.current;
    if (!panelElement) {
      return;
    }
    const contentWrapper = panelElement.closest(".content-wrapper");
    if (!(contentWrapper instanceof HTMLElement)) {
      return;
    }
    const handleContainerClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const canvasContainerElement = canvasContainerRef.current;
      if (
        canvasContainerElement &&
        target &&
        canvasContainerElement.contains(target)
      ) {
        return;
      }
      if (
        target instanceof Element &&
        target.closest(".floating-toolbar-wrapper")
      ) {
        return;
      }
      const activeCanvas = getCanvasInstance();
      if (!activeCanvas) {
        return;
      }
      activeCanvas.discardActiveObject().renderAll();
      setIsCanvasFocused(false);
      setSelectedClassificationId(null);
    };
    contentWrapper.addEventListener("mousedown", handleContainerClick);
    return () => {
      contentWrapper.removeEventListener("mousedown", handleContainerClick);
    };
  }, [setIsCanvasFocused, setSelectedClassificationId]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    canvasRef.current.style.display = layerMode.includes(OVERLAY_LAYER_INDEX)
      ? "block"
      : "none";
  }, [layerMode]);

  useEffect(() => {
    if (skipCanvasSyncRef.current) {
      skipCanvasSyncRef.current = false;
      return;
    }
    if (!active || !canvasReady) {
      return;
    }
    syncFabricObjects(canvasObjects);
  }, [active, canvasReady, canvasObjects, syncFabricObjects]);

  useEffect(() => {
    if (imageWidth === 0 || imageHeight === 0) {
      return;
    }
    if (!labelSearchRequest) {
      return;
    }
    if (!labelSearchQuery.isFetched) {
      return;
    }
    skipCanvasSyncRef.current = true;
    const objects = mapLabelResponsesToFabricObjects(serverLabels);
    replaceFabricEntriesFromServer(objects);
    emitLabelEvent("reset");
    if (objects.length === 0) {
      return;
    }
    const canvasJSON = createCanvasJSON(objects);
    emitLabelEvent("load", {
      imageWidth,
      imageHeight,
      canvasJSON,
    });
  }, [
    imageHeight,
    imageWidth,
    labelSearchQuery.isFetched,
    labelSearchRequest,
    replaceFabricEntriesFromServer,
    serverLabels,
  ]);

  const canvasOverlayLabels = useMemo(() => {
    if (!layerMode.includes(OVERLAY_LAYER_INDEX)) {
      return [];
    }
    if (tool?.id === "superpixel" || tool?.id === "seg-anything") {
      return [];
    }
    const zoomFactor =
      Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1;
    const getBadgePosition = (object: LabeledFabricObject) => {
      const { trueLeft, trueTop } = object;
      const hasTrueCoords =
        object.selected &&
        typeof trueLeft === "number" &&
        typeof trueTop === "number";
      if (hasTrueCoords) {
        return {
          left: trueLeft * zoomFactor,
          top: trueTop * zoomFactor,
        };
      }
      if (typeof object.getBoundingRect === "function") {
        const rect = object.getBoundingRect(false, true);
        if (rect) {
          return {
            left: rect.left ?? 0,
            top: rect.top ?? 0,
          };
        }
      }
      return {
        left: (object.left ?? 0) * zoomFactor,
        top: (object.top ?? 0) * zoomFactor,
      };
    };
    return canvasObjects
      .filter(
        (object) =>
          object.visible !== false &&
          object.opacity !== 0 &&
          ![TOOL_INFO_SUPERPIXEL_BOUNDARY, TOOL_INFO_BRUSHCURSOR].includes(
            object.info ?? ""
          )
      )
      .map((object, index) => {
        const position = getBadgePosition(object);
        const label = getObjectClassLabel(object);
        const color =
          (typeof object.stroke === "string" && object.stroke) ||
          (typeof object.fill === "string" && object.fill) ||
          "rgba(255,255,255,0.9)";
        const key =
          object.unique ??
          (object as unknown as { id?: string }).id ??
          `${object.type}-${index}`;
        const isBoundedBox =
          object.info === TOOL_INFO_BOUNDED_BOX ||
          object.info === TOOL_INFO_FILLED_BOX;
        const type = typeof object.type === "string" ? object.type : "";
        const isEditingPolygon =
          tool?.id === "selection" &&
          ["polygon", "path"].includes(type) &&
          (object as { edit?: boolean }).edit;
        return {
          key,
          left: position.left,
          top: position.top,
          label: label || "no class",
          color,
          selected: Boolean(
            object.selected && (isBoundedBox || isEditingPolygon)
          ),
        };
      });
  }, [canvasObjects, layerMode, tool?.id, zoomLevel]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const matchedClassification = selectedClassificationId
      ? visibleClassificationLabels.find(
          (entry) =>
            (entry.label.id ?? entry.tempId) === selectedClassificationId
        )
      : undefined;
    const isBorderEnabled = !readOnly && !isContentSetClassification;
    const isFocused =
      isBorderEnabled &&
      tool?.id === "selection" &&
      Boolean(selectedClassificationId || isCanvasFocused);
    const { border, borderRadius } = resolveWorkspaceBorderStyle({
      isFocused,
      color: matchedClassification?.color,
      inactiveBorderRadius: 0,
    });
    canvas.style.border = border;
    canvas.style.borderRadius = `${borderRadius}px`;
    if (isFocused) {
      emitLabelEvent("deselectAll");
    }
  }, [
    isCanvasFocused,
    selectedClassificationId,
    canvasRef,
    visibleClassificationLabels,
    tool,
    readOnly,
    isContentSetClassification,
  ]);

  return (
    <div
      style={{
        ...(active ? {} : { display: "none" }),
      }}
      className="workspace-section workspace-section--image"
    >
      <div
        ref={panelRef}
        className="workspace-section__image-panel"
        style={{
          ...(imageWidth > 0 && imageHeight > 0
            ? {
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
              }
            : {}),
          transform: `translate(-50%, -50%) translate(${panelOffset.x}px, ${panelOffset.y}px)`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopPanning}
        onMouseLeave={stopPanning}
      >
        <Image
          alt="workspace-preview"
          src={endpointUrl}
          forceRefresh={true}
          style={{
            transform: `scale(${zoomLevel})`,
            ...(layerMode.includes(ORIGIN_LAYER_INDEX)
              ? {}
              : { display: "none" }),
          }}
          onLoad={(event) => {
            const image = event.target as HTMLImageElement;
            setImageWidth(image.width);
            setImageHeight(image.height);
          }}
          onError={() => {
            setImageWidth(0);
            setImageHeight(0);
          }}
          fallback={
            <Image
              className="skeleton"
              style={{
                opacity: 0.3,
              }}
              src="/gray_x500.png"
              alt="fallback"
            />
          }
        />
        <div ref={canvasContainerRef} />
        {visibleClassificationLabels.length > 0 && imageWidth > 0 && (
          <div
            className="workspace-class-overlay"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width:
                imageWidth > 0
                  ? `${imageWidth * (Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1)}px`
                  : undefined,
              transform: `translate(-50%, ${imageHeight > 0 ? -(imageHeight * (Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1)) / 2 - 23 : -23}px)`,
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 4,
              alignItems: "center",
              pointerEvents: "none",
              zIndex: 3,
            }}
          >
            {layerMode.includes(OVERLAY_LAYER_INDEX) &&
              visibleClassificationLabels.map((item) => {
                const className =
                  item.label.labelValue &&
                  typeof item.label.labelValue === "object" &&
                  "className" in item.label.labelValue
                    ? ((item.label.labelValue as { className?: string })
                        .className ?? "no class")
                    : "no class";
                const issueLabelId = item.label.id ?? item.tempId ?? null;
                const hasIssue =
                  issueLabelId ? issueLabelIdSet.has(issueLabelId) : false;
                const selectClassification = () => {
                  const classificationValue =
                    (item.label.labelValue as ClassificationValue | undefined) ??
                    undefined;
                  setSelectedClassificationId(item.label.id ?? item.tempId, {
                    policyId: item.label.policyId,
                    classIndex: classificationValue?.classIndex ?? null,
                    className: classificationValue?.className ?? null,
                    labelId: item.label.id ?? null,
                    tempId: item.tempId,
                  });
                };
                return (
                  <div
                    key={item.tempId}
                    className="workspace-class-badge-group"
                  >
                    <button
                      type="button"
                      className="workspace-class-name"
                      style={{
                        position: "relative",
                        backgroundColor: item.color ?? "rgba(0,0,0,0.75)",
                        color: getTextColorForBackground(
                          item.color ?? "rgba(0,0,0,0.75)"
                        ),
                        pointerEvents: readOnly ? "none" : undefined,
                      }}
                      disabled={readOnly}
                      onClick={(event) => {
                        if (readOnly) {
                          return;
                        }
                        event.stopPropagation();
                        selectClassification();
                      }}
                    >
                      {className}
                    </button>
                    {hasIssue && (
                      <button
                        type="button"
                        className="workspace-issue-badge"
                        onClick={(event) => {
                          if (readOnly) {
                            return;
                          }
                          event.stopPropagation();
                          selectClassification();
                          openIssuePanel();
                        }}
                      >
                        <Icon iconType="icon-issue" size="xs" />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
        {layerMode.includes(OVERLAY_LAYER_INDEX) &&
          canvasOverlayLabels.length > 0 && (
            <div
              className="workspace-class-overlay"
              style={{
                pointerEvents: "none",
                zIndex: 2,
                position: "absolute",
                top: "50%",
                left: "50%",
                width:
                  imageWidth > 0
                    ? `${imageWidth * (Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1)}px`
                    : undefined,
                height:
                  imageHeight > 0
                    ? `${imageHeight * (Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1)}px`
                    : undefined,
                transform: "translate(-50%, -50%)",
              }}
            >
              {canvasOverlayLabels.map((item) => {
                const hasIssue = issueLabelIdSet.has(item.key);
                const selectObject = () => {
                  setSelectedClassificationId(null);
                  emitLabelEvent("selected", { uniques: [item.key] });
                };
                return (
                  <div
                    key={item.key}
                    className="workspace-class-badge-group"
                    style={{
                      position: "absolute",
                      top: item.top,
                      left: item.left,
                      transform: `translate(-1px,-${6 * 2 + 1 + 10 * (!item.selected ? 1 : 1.7)}px)`,
                      pointerEvents: readOnly ? "none" : undefined,
                    }}
                  >
                    <button
                      type="button"
                      className="workspace-class-name"
                      style={{
                        position: "relative",
                        backgroundColor: item.color,
                        color: getTextColorForBackground(item.color),
                      }}
                      disabled={readOnly}
                      onClick={(event) => {
                        if (readOnly) {
                          return;
                        }
                        event.stopPropagation();
                        selectObject();
                      }}
                    >
                      {item.label}
                    </button>
                    {hasIssue && (
                      <button
                        type="button"
                        className="workspace-issue-badge"
                        onClick={(event) => {
                          if (readOnly) {
                            return;
                          }
                          event.stopPropagation();
                          selectObject();
                          openIssuePanel();
                        }}
                      >
                        <Icon iconType="icon-issue" size="xs" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

export default WorkspaceImageSection;
