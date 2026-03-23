import { useCallback, useState } from "react";

export interface DirtyGuard {
  isDirty: boolean;
  markDirty: () => void;
  clearDirty: () => void;
  blocker: {
    status: "blocked" | "proceed" | "reset" | "idle";
    proceed: () => void;
    reset: () => void;
  };
}

export interface UseDirtyGuardOptions {
  externalDirty?: boolean;
  setExternalDirty?: (dirty: boolean) => void;
  initialDirty?: boolean;
}

/**
 * Stub useDirtyGuard hook.
 * Tracks dirty state locally without route blocking.
 */
export function useDirtyGuard(options?: UseDirtyGuardOptions): DirtyGuard {
  const initialDirty = options?.initialDirty ?? false;
  const [isDirty, setIsDirty] = useState<boolean>(
    typeof options?.externalDirty === "boolean"
      ? options.externalDirty
      : initialDirty
  );

  const markDirty = useCallback(() => {
    setIsDirty(true);
    options?.setExternalDirty?.(true);
  }, [options?.setExternalDirty]);

  const clearDirty = useCallback(() => {
    setIsDirty(false);
    options?.setExternalDirty?.(false);
  }, [options?.setExternalDirty]);

  return {
    isDirty,
    markDirty,
    clearDirty,
    blocker: {
      status: "idle",
      proceed: () => {},
      reset: () => {},
    },
  };
}
