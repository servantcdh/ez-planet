import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

import { type DirtyGuard,useDirtyGuard } from "@/hooks/useDirtyGuard";

import { useLabelBatchStore } from "../store/labelBatch.store";

const WORKSPACE_DIRTY_CONFIRM_MESSAGE =
  "You have unsaved labeling changes. Navigating away may discard your edits. Do you want to continue?";

interface LabelWorkspaceDirtyValue {
  dirty: DirtyGuard;
  confirmIfDirty: (message?: string) => boolean;
}

const LabelWorkspaceDirtyContext =
  createContext<LabelWorkspaceDirtyValue | null>(null);

export function LabelWorkspaceDirtyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const hasPendingChanges = useLabelBatchStore((state) => {
    return (
      state.inserts.length > 0 ||
      state.updates.length > 0 ||
      state.deletes.length > 0
    );
  });

  const dirty = useDirtyGuard({ externalDirty: hasPendingChanges });
  const blockerStatus = dirty.blocker.status;
  const proceedBlocker = dirty.blocker.proceed;
  const resetBlocker = dirty.blocker.reset;

  useEffect(() => {
    if (blockerStatus !== "blocked") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (window.confirm(WORKSPACE_DIRTY_CONFIRM_MESSAGE)) {
      proceedBlocker();
    } else {
      resetBlocker();
    }
  }, [blockerStatus, proceedBlocker, resetBlocker]);

  const confirmIfDirty = useCallback(
    (message?: string) => {
      if (!dirty.isDirty) {
        return true;
      }
      if (typeof window === "undefined") {
        return false;
      }
      return window.confirm(message ?? WORKSPACE_DIRTY_CONFIRM_MESSAGE);
    },
    [dirty.isDirty]
  );

  const value = useMemo<LabelWorkspaceDirtyValue>(
    () => ({
      dirty,
      confirmIfDirty,
    }),
    [confirmIfDirty, dirty]
  );

  return (
    <LabelWorkspaceDirtyContext.Provider value={value}>
      {children}
    </LabelWorkspaceDirtyContext.Provider>
  );
}

export function useLabelWorkspaceDirty() {
  const ctx = useContext(LabelWorkspaceDirtyContext);
  if (!ctx) {
    throw new Error(
      "useLabelWorkspaceDirty must be used within LabelWorkspaceDirtyProvider"
    );
  }
  return ctx;
}

export { WORKSPACE_DIRTY_CONFIRM_MESSAGE };
