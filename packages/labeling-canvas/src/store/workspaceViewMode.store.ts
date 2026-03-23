import { create } from "zustand";

export const WORKSPACE_VIEW_MODES = [
  "Record",
  "Image",
  "Text",
  "Number",
  "File",
] as const;

export type WorkspaceViewMode = (typeof WORKSPACE_VIEW_MODES)[number];

const WORKSPACE_VIEW_MODE_SET = new Set<WorkspaceViewMode>(
  WORKSPACE_VIEW_MODES
);

interface WorkspaceViewModeState {
  mode: WorkspaceViewMode;
  setMode: (mode: WorkspaceViewMode) => void;
}

const INITIAL_MODE: WorkspaceViewMode = WORKSPACE_VIEW_MODES[0];

export function isWorkspaceViewMode(
  value: string | undefined
): value is WorkspaceViewMode {
  if (!value) {
    return false;
  }
  return WORKSPACE_VIEW_MODE_SET.has(value as WorkspaceViewMode);
}

export const useWorkspaceViewModeStore = create<WorkspaceViewModeState>(
  (set) => ({
    mode: INITIAL_MODE,
    setMode: (mode) =>
      set((state) => {
        if (state.mode === mode) {
          return state;
        }
        return { ...state, mode };
      }),
  })
);
