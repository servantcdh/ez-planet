import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceDirection = "vertical" | "horizontal";

interface WorkspaceLayoutState {
  direction: WorkspaceDirection;
  setDirection: (direction: WorkspaceDirection) => void;
}

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>()(
  persist(
    (set) => ({
      direction: "vertical",
      setDirection: (direction) => set({ direction }),
    }),
    {
      name: "workspace-layout",
    }
  )
);
interface WorkspaceNavigationActiveState {
  active: boolean;
  setActive: (active: boolean) => void;
}

export const useWorkspaceNavigationActiveStore =
  create<WorkspaceNavigationActiveState>()((set) => ({
    active: true,
    setActive: (active) => set({ active }),
  }));
