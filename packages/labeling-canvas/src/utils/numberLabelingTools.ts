export type NumberLabelingToolId = "selection" | "drag-segment";

export interface NumberLabelingTool {
  id: NumberLabelingToolId;
  name: string;
}

export function selectionTool(): NumberLabelingTool {
  return { id: "selection", name: "Selection" };
}

export function dragSegmentTool(): NumberLabelingTool {
  return { id: "drag-segment", name: "Highlighting" };
}
