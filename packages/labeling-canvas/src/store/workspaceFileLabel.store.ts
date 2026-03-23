import { create } from "zustand";

import type { LabelInsertData } from "../types/domain";

interface WorkspaceFileLabelDraft {
  id: string;
  file: File;
  label: LabelInsertData;
  classMeta?: { color?: string; opacity?: number } | null;
  locked?: boolean;
}

interface WorkspaceFileLabelState {
  drafts: WorkspaceFileLabelDraft[];
  isUploading: boolean;
  setDraft: (
    file: File | null,
    label?: LabelInsertData | null,
    classMeta?: { color?: string; opacity?: number } | null
  ) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  updateDraftLabel: (
    id: string,
    label: LabelInsertData,
    classMeta?: { color?: string; opacity?: number } | null
  ) => void;
  toggleDraftLock: (id: string) => void;
  setUploading: (isUploading: boolean) => void;
}

const createDraftId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now().toString(36)}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

export const useWorkspaceFileLabelStore = create<WorkspaceFileLabelState>(
  (set) => ({
    drafts: [],
    isUploading: false,
    setDraft: (file, label, classMeta) =>
      set(() => ({
        drafts:
          file && label
            ? [
                {
                  id: createDraftId(),
                  file,
                  label,
                  classMeta: classMeta ?? null,
                },
              ]
            : [],
      })),
    removeDraft: (id) =>
      set((state) => ({
        drafts: state.drafts.filter((draft) => draft.id !== id),
      })),
    clearDrafts: () => set(() => ({ drafts: [] })),
    updateDraftLabel: (id, label, classMeta) =>
      set((state) => ({
        drafts: state.drafts.map((draft) =>
          draft.id === id
            ? {
                ...draft,
                label,
                classMeta: classMeta ?? draft.classMeta ?? null,
              }
            : draft
        ),
      })),
    toggleDraftLock: (id) =>
      set((state) => ({
        drafts: state.drafts.map((draft) =>
          draft.id === id
            ? { ...draft, locked: !draft.locked }
            : draft
        ),
      })),
    setUploading: (isUploading) => set(() => ({ isUploading })),
  })
);
