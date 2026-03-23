import { create } from "zustand";

interface WorkspaceZoomState {
  level: number;
  setLevel: (level: number) => void;
}

export const useWorkspaceZoomStore = create<WorkspaceZoomState>((set) => ({
  level: 1,
  setLevel: (level) => set({ level }),
}));
