import { create } from "zustand";

import type { ValidResultCreateRequest } from "../types/domain";

export interface IssueDraftLabel {
  labelId: string;
  contentSetId?: string | null;
  elementId?: string | null;
  policyId?: string | null;
}

export interface IssueDraft {
  id: string;
  labels: IssueDraftLabel[];
  body: ValidResultCreateRequest;
}

interface WorkspaceIssuePanelState {
  isOpen: boolean;
  drafts: IssueDraft[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  setDrafts: (drafts: IssueDraft[]) => void;
  updateDraftReason: (id: string, reason: string) => void;
  updateDraftResult: (id: string, result: boolean) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
}

export const useWorkspaceIssuePanelStore =
  create<WorkspaceIssuePanelState>((set) => ({
    isOpen: false,
    drafts: [],
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    setDrafts: (drafts) => set({ drafts }),
    updateDraftReason: (id, reason) =>
      set((state) => ({
        drafts: state.drafts.map((draft) =>
          draft.id === id
            ? { ...draft, body: { ...draft.body, reason } }
            : draft
        ),
      })),
    updateDraftResult: (id, result) =>
      set((state) => ({
        drafts: state.drafts.map((draft) =>
          draft.id === id
            ? { ...draft, body: { ...draft.body, result } }
            : draft
        ),
      })),
    removeDraft: (id) =>
      set((state) => ({
        drafts: state.drafts.filter((draft) => draft.id !== id),
      })),
    clearDrafts: () => set({ drafts: [] }),
  }));
