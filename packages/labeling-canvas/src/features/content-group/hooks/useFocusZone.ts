import { useCallback, useEffect, useRef } from "react";

import { create } from "zustand";

interface FocusZoneState {
  focusedIdByZone: Record<string, string | null>;
  setFocused: (zone: string, id: string | null) => void;
  getFocused: (zone: string) => string | null;
}

export const useFocusZoneStore = create<FocusZoneState>((set, get) => ({
  focusedIdByZone: {},
  setFocused: (zone, id) =>
    set((s) => ({ focusedIdByZone: { ...s.focusedIdByZone, [zone]: id } })),
  getFocused: (zone) => get().focusedIdByZone[zone] ?? null,
}));

export interface UseFocusZoneOptions {
  zone: string;
  id: string;
  autoFocusOnMount?: boolean;
  takeOverOnMount?: boolean;
}

export function useFocusZone({
  zone,
  id,
  autoFocusOnMount = true,
  takeOverOnMount = false,
}: UseFocusZoneOptions) {
  const setFocused = useFocusZoneStore((s) => s.setFocused);
  const getFocused = useFocusZoneStore((s) => s.getFocused);
  const focusedId = useFocusZoneStore(
    useCallback((s) => s.focusedIdByZone[zone] ?? null, [zone])
  );

  const zoneRef = useRef(zone);
  const idRef = useRef(id);
  useEffect(() => {
    zoneRef.current = zone;
    idRef.current = id;
  }, [zone, id]);

  const isFocused = focusedId === id;

  const onClickFocus = useCallback(
    (_e?: React.MouseEvent | React.KeyboardEvent) => {
      setFocused(zone, id);
    },
    [zone, id, setFocused]
  );

  const getContainerClassName = useCallback(
    (base?: string) => {
      const disabledClass =
        focusedId && focusedId !== id ? "focus-disabled" : "";
      return [base ?? "", disabledClass].filter(Boolean).join(" ");
    },
    [focusedId, id]
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setFocused(zone, null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zone, setFocused]);

  useEffect(() => {
    return () => {
      const currentZone = zoneRef.current;
      const currentId = idRef.current;
      const currentFocused = useFocusZoneStore
        .getState()
        .getFocused(currentZone);
      if (currentFocused === currentId) {
        useFocusZoneStore.getState().setFocused(currentZone, null);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoFocusOnMount) return;
    const current = getFocused(zone);
    if (takeOverOnMount || current == null) {
      setFocused(zone, id);
    }
  }, [zone, id, autoFocusOnMount, takeOverOnMount, getFocused, setFocused]);

  return {
    isFocused,
    focusedId,
    focus: () => setFocused(zone, id),
    blur: () => setFocused(zone, null),
    onClickFocus,
    getContainerClassName,
  };
}
