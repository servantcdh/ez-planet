import {
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_BRUSHCURSOR,
} from "../imageLabelingConstants";
import {
  ensureCanvas,
  getLabeledObjects,
  getMovedMousePosition,
  toEventHandler,
  wrapPointerHandler,
} from "../imageLabelingCore";
import { getImageToolSelectionStore } from "../imageLabelingStore";
import type {
  FabricPointerEvent,
  LabeledPolygon,
  LabelingTool,
} from "../imageLabelingTypes";
import { enablePolygonEditing, resetPolygonEditing } from "./polygonEditor";

export const selectionTool = (): LabelingTool => {
  const init = () => {
    let isMouseDown = false;
    let isShiftDown = false;
    const movedMousePosition = getMovedMousePosition();

    const activeCanvas = ensureCanvas();
    activeCanvas.defaultCursor = "default";
    activeCanvas.hoverCursor = "default";
    activeCanvas.moveCursor = "default";
    activeCanvas.selection = true;

    const { setOveredUniques } = getImageToolSelectionStore();

    const objects = getLabeledObjects();
    objects.forEach((object) => {
      object.selectable = true;
      object.evented = true;
    });

    const renderAllSafe = () => {
      if (
        activeCanvas &&
        (activeCanvas as unknown as { contextContainer?: CanvasRenderingContext2D | null })
          .contextContainer
      ) {
        activeCanvas.renderAll();
      }
    };

    let editingPolygon: (LabeledPolygon & { edit?: boolean }) | null = null;

    const stopPolygonEditing = (discardSelection = false) => {
      if (!editingPolygon) {
        return;
      }
      resetPolygonEditing(activeCanvas);
      editingPolygon = null;
      if (discardSelection) {
        activeCanvas.discardActiveObject();
      }
      renderAllSafe();
    };

    const handleOnMouseDown = function (event: FabricPointerEvent) {
      const { absolutePointer, target } = event;
      if (editingPolygon && target !== editingPolygon) {
        stopPolygonEditing(!target);
      }
      if (!absolutePointer) {
        return;
      }
      isMouseDown = true;
      movedMousePosition.x = absolutePointer.x;
      movedMousePosition.y = absolutePointer.y;
    };
    const handleOnMouseMove = function (_event: FabricPointerEvent) {
      if (!isMouseDown) {
        return;
      }

      objects.forEach((object) => {
        if (object.info === TOOL_INFO_BOUNDED_BOX) {
          object.selectable = false;
        }
      });
    };
    const handleOnMouseUp = function (event: FabricPointerEvent) {
      const { absolutePointer } = event;
      if (absolutePointer) {
        movedMousePosition.x = absolutePointer.x - movedMousePosition.x;
        movedMousePosition.y = absolutePointer.y - movedMousePosition.y;
      }
      isMouseDown = false;
      objects.forEach((object) => {
        if (object.info === TOOL_INFO_BOUNDED_BOX) {
          object.selectable = !isShiftDown;
        }
      });
    };
    const handleOnMouseOver = function ({ target }: FabricPointerEvent) {
      if (target && target._objects) {
        const uniques = target._objects
          .map(({ unique }) => unique)
          .filter((value): value is string => Boolean(value));
        setOveredUniques(uniques);
      }
      if (target && target.unique) {
        setOveredUniques([target.unique]);
      }
    };
    const handleOnMouseOut = function () {
      setOveredUniques([]);
    };
    const handleOnKeyDown = function (event: KeyboardEvent) {
      if (event.key === "Escape" || event.code === "Escape") {
        stopPolygonEditing(true);
        return;
      }
      isShiftDown = event.shiftKey;
    };
    const handleOnKeyUp = function () {
      isShiftDown = false;
    };

    const handleOnDoubleClick = function (event: FabricPointerEvent) {
      const polygon = enablePolygonEditing(
        activeCanvas,
        event.target ?? null,
        event.absolutePointer
      );
      if (polygon) {
        editingPolygon = polygon;
        activeCanvas.setActiveObject(polygon);
      }
    };

    const onMouseDown = wrapPointerHandler(handleOnMouseDown);
    const onMouseMove = wrapPointerHandler(handleOnMouseMove);
    const onMouseUp = wrapPointerHandler(handleOnMouseUp);
    const onMouseOver = wrapPointerHandler(handleOnMouseOver);
    const onMouseOut = wrapPointerHandler(handleOnMouseOut);
    const onDoubleClick = wrapPointerHandler(handleOnDoubleClick);
    const onSelectionCleared = () => {
      stopPolygonEditing();
    };

    activeCanvas.on("mouse:down", toEventHandler(onMouseDown));
    activeCanvas.on("mouse:move", toEventHandler(onMouseMove));
    activeCanvas.on("mouse:up", toEventHandler(onMouseUp));
    activeCanvas.on("mouse:over", toEventHandler(onMouseOver));
    activeCanvas.on("mouse:out", toEventHandler(onMouseOut));
    activeCanvas.on("mouse:dblclick", toEventHandler(onDoubleClick));
    activeCanvas.on("selection:cleared", onSelectionCleared);
    document.addEventListener("keydown", handleOnKeyDown);
    document.addEventListener("keyup", handleOnKeyUp);

    const brushCursor = getLabeledObjects(activeCanvas).find(
      ({ info }) => info === TOOL_INFO_BRUSHCURSOR
    );

    if (brushCursor) {
      activeCanvas.remove(brushCursor);
      renderAllSafe();
    }

    return () => {
      stopPolygonEditing();
      activeCanvas.defaultCursor = "default";
      activeCanvas.hoverCursor = "default";
      activeCanvas.moveCursor = "default";
      activeCanvas.selection = false;
      activeCanvas.discardActiveObject();
      renderAllSafe();

      activeCanvas.off("mouse:down", toEventHandler(onMouseDown));
      activeCanvas.off("mouse:move", toEventHandler(onMouseMove));
      activeCanvas.off("mouse:up", toEventHandler(onMouseUp));
      activeCanvas.off("mouse:over", toEventHandler(onMouseOver));
      activeCanvas.off("mouse:out", toEventHandler(onMouseOut));
      activeCanvas.off("mouse:dblclick", toEventHandler(onDoubleClick));
      activeCanvas.off("selection:cleared", onSelectionCleared);
      document.removeEventListener("keydown", handleOnKeyDown);
      document.removeEventListener("keyup", handleOnKeyUp);

      objects.forEach((object) => {
        object.selectable = false;
        object.evented = false;
      });
    };
  };

  return {
    id: "selection",
    init,
  };
};
