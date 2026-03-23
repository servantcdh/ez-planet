import { useCallback, useEffect, useRef } from "react";

import { useLabelBatchStore } from "../store/labelBatch.store";
import type { TemporalHistoryState } from "../store/labelingHistory.store";

type LabelBatchState = ReturnType<typeof useLabelBatchStore.getState>;

type TemporalStoreApi<T> = {
  getState: () => TemporalHistoryState<T>;
  temporal: {
    getState: () => {
      undo: () => void;
      redo: () => void;
      clear?: () => void;
      pause?: () => void;
      resume?: () => void;
    };
  };
};

type HistoryOptions<T> = {
  active: boolean;
  contextKey: string | null;
  historyStore: TemporalStoreApi<T>;
  getSnapshot: (state: LabelBatchState) => T;
  applySnapshot: (snapshot: T | null) => void;
  areSnapshotsEqual: (a: T | null, b: T | null) => boolean;
};

export function useViewLabelHistory<T>({
  active,
  contextKey,
  historyStore,
  getSnapshot,
  applySnapshot,
  areSnapshotsEqual,
}: HistoryOptions<T>) {
  const contextRef = useRef<string | null>(null);
  const isApplyingRef = useRef(false);
  const pendingSnapshotRef = useRef<T | null>(null);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }
    const hasSnapshot = Boolean(historyStore.getState().snapshot);
    if (contextRef.current !== contextKey || !hasSnapshot) {
      contextRef.current = contextKey;
      const temporalState = historyStore.temporal.getState();
      if (typeof temporalState.pause === "function") {
        temporalState.pause();
      }
      if (typeof temporalState.clear === "function") {
        temporalState.clear();
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      pendingSnapshotRef.current = null;
      historyStore
        .getState()
        .setSnapshot(getSnapshot(useLabelBatchStore.getState()));
      if (typeof temporalState.resume === "function") {
        temporalState.resume();
      }
    }
  }, [active, contextKey, getSnapshot, historyStore]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const scheduleSnapshot = (snapshot: T) => {
      pendingSnapshotRef.current = snapshot;
      if (flushTimeoutRef.current !== null) {
        return;
      }
      flushTimeoutRef.current = setTimeout(() => {
        flushTimeoutRef.current = null;
        const historyState = historyStore.getState();
        if (isApplyingRef.current) {
          return;
        }
        const pending = pendingSnapshotRef.current;
        pendingSnapshotRef.current = null;
        if (!pending) {
          return;
        }
        if (areSnapshotsEqual(historyState.snapshot, pending)) {
          return;
        }
        historyState.setSnapshot(pending);
      }, 0);
    };
    const unsubscribe = useLabelBatchStore.subscribe((state) => {
      if (isApplyingRef.current) {
        return;
      }
      const nextSnapshot = getSnapshot(state);
      const currentSnapshot = historyStore.getState().snapshot;
      if (areSnapshotsEqual(currentSnapshot, nextSnapshot)) {
        return;
      }
      scheduleSnapshot(nextSnapshot);
    });
    return () => {
      const pending = pendingSnapshotRef.current;
      if (pending) {
        if (
          !isApplyingRef.current &&
          !areSnapshotsEqual(historyStore.getState().snapshot, pending)
        ) {
          historyStore.getState().setSnapshot(pending);
        }
        pendingSnapshotRef.current = null;
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [active, areSnapshotsEqual, getSnapshot, historyStore]);

  const undo = useCallback(() => {
    if (isApplyingRef.current) {
      return;
    }
    isApplyingRef.current = true;
    try {
      historyStore.temporal.getState().undo();
      applySnapshot(historyStore.getState().snapshot);
    } finally {
      isApplyingRef.current = false;
    }
  }, [applySnapshot, historyStore]);

  const redo = useCallback(() => {
    if (isApplyingRef.current) {
      return;
    }
    isApplyingRef.current = true;
    try {
      historyStore.temporal.getState().redo();
      applySnapshot(historyStore.getState().snapshot);
    } finally {
      isApplyingRef.current = false;
    }
  }, [applySnapshot, historyStore]);

  return { undo, redo };
}
