import type { ToolbarMeta } from "@/types/toolbar";

export interface LabelingUIMetaContext {
  goToLabelingRoot: () => void;
  labelingId: string | null;
  title?: string;
  isDirty: boolean;
}

export type LabelingUIMetaHook = (
  context: LabelingUIMetaContext
) => ToolbarMeta;
