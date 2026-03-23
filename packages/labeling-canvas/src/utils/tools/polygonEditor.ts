import { fabric } from "fabric";

import {
  TOOL_INFO_MAGIC_BRUSH,
  TOOL_INFO_SUPERPIXEL,
} from "../imageLabelingConstants";
import {
  Control,
  getLabeledObjects,
  Point,
  Polygon,
} from "../imageLabelingCore";
import type { FabricCanvas, LabeledPolygon } from "../imageLabelingTypes";

export const isEditablePolygon = (
  object: fabric.Object | null | undefined
): object is LabeledPolygon & {
  pathContours?: Array<{ inner?: boolean; points: fabric.Point[] }>;
  pathBaseOffset?: { x: number; y: number };
  pathEditableContourIndex?: number;
} => {
  if (!object) {
    return false;
  }
  if (object instanceof Polygon) {
    return true;
  }
  if (
    object instanceof fabric.Path &&
    [TOOL_INFO_SUPERPIXEL, TOOL_INFO_MAGIC_BRUSH].includes(
      (object as any).info ?? ""
    ) &&
    Array.isArray((object as any).points) &&
    Array.isArray((object as any).pathContours)
  ) {
    return true;
  }
  return false;
};

const updatePathFromPoints = (target: fabric.Object) => {
  if (
    !(target instanceof fabric.Path) ||
    !Array.isArray((target as any).pathContours) ||
    !Array.isArray((target as any).points)
  ) {
    return;
  }
  const contours = (target as any).pathContours as Array<{
    inner?: boolean;
    points: fabric.Point[];
  }>;
  const editableIndex = (target as any).pathEditableContourIndex ?? 0;
  if (!contours[editableIndex]) {
    return;
  }
  contours[editableIndex].points = (
    (target as any).points as fabric.Point[]
  ).map(({ x, y }) => new fabric.Point(x, y));

  const pathParts: string[] = [];
  contours.forEach(({ points }) => {
    if (!points.length) {
      return;
    }
    const [first, ...rest] = points;
    pathParts.push(`M ${first.x} ${first.y}`);
    rest.forEach(({ x, y }) => {
      pathParts.push(`L ${x} ${y}`);
    });
    pathParts.push("Z");
  });

  const tmp = new fabric.Path(pathParts.join(" "));
  target.set({ path: tmp.path });
  (target as any).pathContours = contours;
  target.dirty = true;
  target.setCoords();
};

const polygonPositionHandler = function (
  this: { pointIndex?: number },
  _dim: fabric.Point,
  _finalMatrix: number[],
  fabricObject: LabeledPolygon & { points: fabric.Point[] }
) {
  const point = fabricObject.points[this.pointIndex ?? 0];
  const x = point.x - fabricObject.pathOffset.x;
  const y = point.y - fabricObject.pathOffset.y;
  return fabric.util.transformPoint(
    new Point(x, y),
    fabric.util.multiplyTransformMatrices(
      fabricObject.canvas?.viewportTransform ?? [],
      fabricObject.calcTransformMatrix()
    )
  );
};

const getObjectSizeWithStroke = function (object: LabeledPolygon) {
  const stroke = new Point(
    object.strokeUniform ? 1 / (object.scaleX ?? 1) : 1,
    object.strokeUniform ? 1 / (object.scaleY ?? 1) : 1
  ).multiply(object.strokeWidth ?? 0);
  return new Point(
    Math.max((object.width ?? 0) + stroke.x, 1),
    Math.max((object.height ?? 0) + stroke.y, 1)
  );
};

const setPositionDimensions = (object: fabric.Object) => {
  const fn = (object as any)._setPositionDimensions;
  if (typeof fn === "function") {
    fn.call(object, {});
  } else {
    object.setCoords();
  }
};

const pointInPolygon = (point: fabric.Point, vertices: fabric.Point[]) => {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x <
        ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
};

const getPolygonArea = (vertices: fabric.Point[]) => {
  if (vertices.length < 3) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const { x: x1, y: y1 } = vertices[i];
    const { x: x2, y: y2 } = vertices[(i + 1) % vertices.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
};

const actionHandler = function (
  _eventData: fabric.IEvent<MouseEvent>,
  transform: fabric.Transform,
  x: number,
  y: number
) {
  const polygon = transform.target as LabeledPolygon & {
    __corner?: string;
  };
  if (!polygon || !polygon.points || !polygon.pathOffset) {
    return false;
  }
  const currentControl = polygon.controls?.[
    polygon.__corner ?? ""
  ] as unknown as { pointIndex?: number } | undefined;
  if (!currentControl) {
    return false;
  }
  const pointIndex = currentControl.pointIndex ?? 0;
  const mouseLocalPosition = polygon.toLocalPoint(
    new Point(x, y),
    "center",
    "center"
  );
  const polygonBaseSize = getObjectSizeWithStroke(polygon);
  const size = polygon._getTransformedDimensions(0, 0);
  const finalPointPosition = {
    x:
      (mouseLocalPosition.x * polygonBaseSize.x) / size.x +
      polygon.pathOffset.x,
    y:
      (mouseLocalPosition.y * polygonBaseSize.y) / size.y +
      polygon.pathOffset.y,
  };
  polygon.points[pointIndex] = finalPointPosition as fabric.Point;
  if (polygon instanceof fabric.Path) {
    updatePathFromPoints(polygon);
  }
  return true;
};

const anchorWrapper = function (
  anchorIndex: number,
  fn: typeof actionHandler
) {
  return function (
    _eventData: fabric.IEvent<MouseEvent>,
    transform: fabric.Transform,
    x: number,
    y: number
  ) {
    const fabricObject = transform.target as EditablePolygon;
    if (!fabricObject.points || !fabricObject.pathOffset) {
      return false;
    }
    const controls = fabricObject.controls as
      | Record<string, fabric.Control>
      | undefined;
    const cornerKey =
      typeof fabricObject.__corner === "string" ? fabricObject.__corner : "";
    const currentControl = controls?.[cornerKey] as
      | { pointIndex?: number }
      | undefined;
    const movedIndex = currentControl?.pointIndex ?? anchorIndex;
    const absolutePoint = fabric.util.transformPoint(
      new Point(
        fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x,
        fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y
      ),
      fabricObject.calcTransformMatrix()
    );
    const actionPerformed = fn(_eventData, transform, x, y);
    const polygonBaseSize = getObjectSizeWithStroke(fabricObject);
    const newX =
      (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x) /
      polygonBaseSize.x;
    const newY =
      (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y) /
      polygonBaseSize.y;
    setPositionDimensions(fabricObject);
    (fabricObject as any).setPositionByOrigin(
      absolutePoint,
      newX + 0.5,
      newY + 0.5
    );
    const editSnapshot = fabricObject.editSnapshot;
    if (editSnapshot?.absolutePoints?.length) {
      const currentPoints = getAbsolutePolygonPoints(fabricObject);
      const deltas = currentPoints
        .map((point, index) => {
          if (index === movedIndex) {
            return null;
          }
          const original = editSnapshot.absolutePoints[index];
          if (!original) {
            return null;
          }
          return {
            dx: original.x - point.x,
            dy: original.y - point.y,
          };
        })
        .filter(
          (value): value is { dx: number; dy: number } => value !== null
        );
      if (deltas.length) {
        const deltaX =
          deltas.reduce((sum, { dx }) => sum + dx, 0) / deltas.length;
        const deltaY =
          deltas.reduce((sum, { dy }) => sum + dy, 0) / deltas.length;
        if (deltaX !== 0 || deltaY !== 0) {
          fabricObject.set({
            left: (fabricObject.left ?? 0) + deltaX,
            top: (fabricObject.top ?? 0) + deltaY,
          });
          fabricObject.setCoords();
        }
      }
    }
    return actionPerformed;
  };
};

type EditablePolygon = LabeledPolygon & {
  edit?: boolean;
  pathContours?: Array<{ inner?: boolean; points: fabric.Point[] }>;
  pathEditableContourIndex?: number;
  editSnapshot?: {
    dragIndex?: number;
    absolutePoints: fabric.Point[];
  };
};

const getAbsolutePolygonPoints = (poly: EditablePolygon) => {
  if (!poly.points || !poly.pathOffset) {
    return [] as fabric.Point[];
  }
  const baseMatrix = poly.calcTransformMatrix();
  const matrix = poly.canvas?.viewportTransform
    ? fabric.util.multiplyTransformMatrices(
        poly.canvas.viewportTransform,
        baseMatrix
      )
    : baseMatrix;
  return poly.points.map((point) =>
    fabric.util.transformPoint(
      new Point(point.x - poly.pathOffset.x, point.y - poly.pathOffset.y),
      matrix
    )
  );
};

const preparePathContourPoints = (
  poly: EditablePolygon,
  absolutePointer?: fabric.Point
) => {
  if (
    !(poly instanceof fabric.Path) ||
    !Array.isArray(poly.pathContours) ||
    !absolutePointer
  ) {
    return;
  }
  const localPoint = poly.toLocalPoint(
    new Point(absolutePointer.x, absolutePointer.y),
    "left",
    "top"
  );
  const candidates = poly.pathContours.map(({ points }, index) => ({
    index,
    inside: pointInPolygon(localPoint, points),
    distance: Math.min(
      ...points.map((p) => Math.hypot(p.x - localPoint.x, p.y - localPoint.y))
    ),
    area: getPolygonArea(points),
  }));
  const insideCandidates = candidates
    .filter(({ inside }) => inside)
    .sort((a, b) => a.area - b.area);
  const pickedIndex =
    insideCandidates[0]?.index ??
    candidates.sort((a, b) => a.distance - b.distance)[0]?.index ??
    0;
  poly.pathEditableContourIndex = pickedIndex;
  const picked = poly.pathContours[pickedIndex];
  if (picked) {
    poly.points = picked.points.map(({ x, y }) => new fabric.Point(x, y));
  }
};

const buildControls = (poly: EditablePolygon) => {
  const lastControl = (poly.points?.length ?? 1) - 1;
  poly.controls = (poly.points ?? []).reduce(function (
    acc: Record<string, fabric.Control>,
    _point,
    index
  ) {
    const captureSnapshot = () => {
      poly.editSnapshot = {
        dragIndex: index,
        absolutePoints: getAbsolutePolygonPoints(poly),
      };
      return false;
    };
    const clearSnapshot = () => {
      delete poly.editSnapshot;
      return false;
    };
    acc["p" + index] = new Control({
      positionHandler: polygonPositionHandler,
      actionHandler: anchorWrapper(
        index > 0 ? index - 1 : lastControl,
        actionHandler
      ),
      actionName: "editPolygon",
      pointIndex: index,
      mouseDownHandler: captureSnapshot,
      mouseUpHandler: clearSnapshot,
    } as unknown as fabric.Control);
    return acc;
  }, {});
};

const notifyPolygonEditingChange = (canvas: FabricCanvas, poly: EditablePolygon) => {
  const prevPassStack = poly.passStack;
  poly.passStack = true;
  canvas.fire("object:modified", { target: poly });
  poly.passStack = prevPassStack;
};

export const enablePolygonEditing = (
  canvas: FabricCanvas,
  target: fabric.Object | null | undefined,
  absolutePointer?: fabric.Point
) => {
  if (!target || !isEditablePolygon(target)) {
    resetPolygonEditing(canvas);
    return null;
  }
  const poly = target as EditablePolygon;
  if (!poly.edit) {
    preparePathContourPoints(poly, absolutePointer);
    poly.edit = true;
    poly.cornerStyle = "circle";
    buildControls(poly);
    poly.transparentCorners = false;
    poly.hasBorders = false;
  }
  resetPolygonEditing(canvas, poly);
  canvas.requestRenderAll();
  notifyPolygonEditingChange(canvas, poly);
  return poly;
};

export const resetPolygonEditing = (
  canvas: FabricCanvas,
  target?: fabric.Polygon & { edit?: boolean }
) => {
  getLabeledObjects(canvas).forEach((object) => {
    if (!target || ((object as any) !== target && target.edit)) {
      const poly = object as LabeledPolygon & { edit?: boolean };
      const wasEditing = poly.edit;
      poly.edit = false;
      poly.cornerStyle = "rect";
      poly.controls = fabric.Object.prototype.controls;
      poly.hasBorders = true;
      poly.transparentCorners = true;
      delete (poly as EditablePolygon).editSnapshot;
      if (wasEditing) {
        notifyPolygonEditingChange(canvas, poly);
      }
    }
  });
  canvas.requestRenderAll();
};
