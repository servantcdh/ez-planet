export type TextLabelingToolId = "selection" | "drag-segment";

export interface TextLabelingTool {
  id: TextLabelingToolId;
  name: string;
}

export function selectionTool(): TextLabelingTool {
  return { id: "selection", name: "Selection" };
}

export function dragSegmentTool(): TextLabelingTool {
  return { id: "drag-segment", name: "Highlighting" };
}
