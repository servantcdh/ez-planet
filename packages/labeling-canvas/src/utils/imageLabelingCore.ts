import { fabric } from "fabric";

import { divide } from "@/utils/calculator";

import { EXPORT_PROPS } from "./imageLabelingConstants";
import type {
  CanvasExportJSON,
  CanvasJSON,
  ExternalEventData,
  FabricCanvas,
  FabricObservableListener,
  FabricObservablePayload,
  FabricPointerEvent,
  LabeledFabricImage,
  LabeledFabricObject,
  LabeledPolygon,
} from "./imageLabelingTypes";

export const {
  Canvas,
  Control,
  Point,
  Path,
  Line,
  Rect,
  Polygon,
  PencilBrush,
  Circle,
  ActiveSelection,
  Object: FabricObject,
  Image: FabricImage,
} = fabric;

const LABEL_EVENTS: FabricObservablePayload[] = [
  "load",
  "selected",
  "deleted",
  "zoom",
  "copy",
  "paste",
  "deleteSelected",
  "selectAll",
  "reset",
  "combine",
  "seq",
  "addClass",
  "deleteObjectsOfTool",
  "addObjects",
  "deselectAll",
  "undo",
  "redo",
  "changed",
  "blur",
  "focus",
  "init",
];

type FabricEventHandler<E extends Event = Event> = (
  event: fabric.IEvent<E>
) => void;

let canvas: FabricCanvas = null as unknown as FabricCanvas;
let objects: LabeledFabricObject[] = [];
let isDoing = false;
let timeoutRef: ReturnType<typeof setTimeout> | null = null;
const lastMousePosition: fabric.Point = new Point(0, 0);
const movedMousePosition: fabric.Point = new Point(0, 0);

export const getCanvasInstance = () => canvas;
export const setCanvasInstance = (instance: FabricCanvas | null) => {
  canvas = instance as FabricCanvas;
};

export const getObjects = () => objects;
export const setObjects = (values: LabeledFabricObject[]) => {
  objects = values;
};

export const getIsDoing = () => isDoing;
export const setIsDoing = (flag: boolean) => {
  isDoing = flag;
};

export const getTimeoutRef = () => timeoutRef;
export const setTimeoutRef = (ref: ReturnType<typeof setTimeout> | null) => {
  timeoutRef = ref;
};

export const getLastMousePosition = () => lastMousePosition;
export const getMovedMousePosition = () => movedMousePosition;

export const ensureCanvas = (): FabricCanvas => {
  if (!canvas) {
    throw new Error("Canvas has not been initialized.");
  }
  return canvas;
};

export const subscribeLabelEvents = (listener: FabricObservableListener) => {
  const target = getCanvasInstance();
  if (!target) {
    // Canvas is not ready; return a no-op unsubscribe to avoid runtime errors.
    return () => undefined;
  }
  const handlers = LABEL_EVENTS.map((action) => {
    const eventName = `label:${action}`;
    const handler: FabricEventHandler<Event & { data?: ExternalEventData }> = (
      event
    ) =>
      listener(action, (event as unknown as { data?: ExternalEventData }).data);
    target.on(eventName, handler);
    return { eventName, handler };
  });

  return () => {
    handlers.forEach(({ eventName, handler }) => {
      target.off(eventName, handler);
    });
  };
};

export const emitLabelEvent = (
  action: FabricObservablePayload,
  data?: ExternalEventData
) => {
  const target = getCanvasInstance();
  if (!target) {
    return;
  }
  target.fire(`label:${action}`, { data });
};

export const createCanvasJSON = (
  targetObjects: LabeledFabricObject[] = [],
  version = "5.2.1"
): CanvasJSON => ({
  version,
  objects: targetObjects,
});

export const toLabeledObject = (object: fabric.Object): LabeledFabricObject =>
  object as LabeledFabricObject;

export const toLabeledImage = (image: fabric.Image): LabeledFabricImage =>
  image as LabeledFabricImage;

export const toLabeledPolygon = (polygon: fabric.Polygon): LabeledPolygon =>
  polygon as LabeledPolygon;

export const toLabeledObjects = (
  items: fabric.Object[] | LabeledFabricObject[]
): LabeledFabricObject[] => items as LabeledFabricObject[];

export const getLabeledObjects = (
  targetCanvas: FabricCanvas = ensureCanvas()
) => toLabeledObjects(targetCanvas.getObjects());

export const getActiveLabeledObjects = (
  targetCanvas: FabricCanvas = ensureCanvas()
) => targetCanvas.getActiveObjects() as LabeledFabricObject[];

export const toLabeledCanvasJSON = (json: CanvasExportJSON): CanvasJSON => ({
  ...json,
  objects: toLabeledObjects(json.objects),
});

export const getCanvasJSON = (
  targetCanvas: FabricCanvas = ensureCanvas()
): CanvasJSON =>
  toLabeledCanvasJSON(targetCanvas.toJSON(EXPORT_PROPS) as CanvasExportJSON);

export const wrapPointerHandler =
  <E extends Event = MouseEvent>(
    handler: (event: FabricPointerEvent) => void
  ) =>
  (event: fabric.IEvent<E>) =>
    handler(event as unknown as FabricPointerEvent);

export type AnyEventHandler = (...args: any[]) => void;

export const toEventHandler = (handler: any): AnyEventHandler =>
  handler as unknown as AnyEventHandler;

export const getPointerWithZoom = ({ x, y }: { x: number; y: number }) => {
  const activeCanvas = ensureCanvas();
  const level = activeCanvas.getZoom();
  return { x: divide(x, level), y: divide(y, level) };
};

export const getOffset = (el: HTMLElement) => {
  if (el.localName !== "canvas") {
    return { top: 0, left: 0 };
  }
  const activeCanvas = ensureCanvas();
  const level = activeCanvas.getZoom();
  const { top, left } = el.getBoundingClientRect();
  const scrollLeft = document.documentElement.scrollLeft;
  const scrollTop = document.documentElement.scrollTop;
  return {
    top: divide(top, level) + scrollTop,
    left: divide(left, level) + scrollLeft,
  };
};

export const getMousePosition = (e: MouseEvent) => {
  // const { x: pageX, y: pageY } = getPointerWithZoom({
  //   x: e.offsetX,
  //   y: e.offsetY,
  // });
  // const p = getOffset(e.target as HTMLElement);
  // const x = p.left ? Math.round(pageX - p.left) : 0;
  // const y = p.top ? Math.round(pageY - p.top) : 0;
  // return { x, y };
  return getPointerWithZoom({
    x: e.offsetX,
    y: e.offsetY,
  });
};
