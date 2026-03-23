import { create } from "zustand";

import type { LabelInsertData } from "../types/domain";

export interface AttributeEditTarget {
  id: string;
  label: LabelInsertData & { id?: string };
  tempId?: string | null;
  fabricKey?: string | null;
}

interface WorkspaceAttributeEditorState {
  targets: AttributeEditTarget[];
  open: (targets: AttributeEditTarget[]) => void;
  close: () => void;
}

export const useWorkspaceAttributeEditorStore =
  create<WorkspaceAttributeEditorState>((set) => ({
    targets: [],
    open: (targets) => set({ targets }),
    close: () => set({ targets: [] }),
  }));
