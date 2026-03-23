import type { UIType } from "@/types/ui-type.interface";

export type UISize = NonNullable<UIType["size"]>;
export type BaseChildSize = "sm" | "md" | "lg";

export const SIZE_SCALE: readonly UISize[] = ["sm", "md", "lg"] as const;

function findFirstAllowed(allowed: readonly UISize[]): UISize {
  for (const size of SIZE_SCALE) {
    if (allowed.includes(size)) return size;
  }
  return SIZE_SCALE[0];
}

export function resolveChildSize<TAllowed extends readonly UISize[]>(options: {
  parentSize?: UISize;
  delta?: number;
  allowed: TAllowed;
  defaultSize?: UISize;
}): TAllowed[number];
export function resolveChildSize(options: {
  parentSize?: UISize;
  delta?: number;
  defaultSize?: UISize;
}): BaseChildSize;
export function resolveChildSize(options: {
  parentSize?: UISize;
  delta?: number;
  allowed?: readonly UISize[];
  defaultSize?: UISize;
}): UISize {
  const { parentSize, delta = -1, allowed, defaultSize = "md" } = options;

  const baseIndex = SIZE_SCALE.indexOf(parentSize ?? defaultSize);
  const safeBaseIndex =
    baseIndex >= 0 ? baseIndex : SIZE_SCALE.indexOf(defaultSize);

  let targetIndex = safeBaseIndex + delta;
  if (targetIndex < 0) targetIndex = 0;
  if (targetIndex >= SIZE_SCALE.length) targetIndex = SIZE_SCALE.length - 1;

  let candidate = SIZE_SCALE[targetIndex];

  if (allowed && allowed.length > 0) {
    const candidateIndex = SIZE_SCALE.indexOf(candidate);
    for (let i = candidateIndex; i >= 0; i--) {
      const size = SIZE_SCALE[i];
      if (allowed.includes(size)) {
        candidate = size;
        return candidate;
      }
    }
    candidate = findFirstAllowed(allowed);
  }

  if (!allowed || allowed.length === 0) {
    const maxChildIndex = SIZE_SCALE.indexOf("lg");
    const candidateIndex = SIZE_SCALE.indexOf(candidate);
    candidate = SIZE_SCALE[Math.min(candidateIndex, maxChildIndex)];
  }

  return candidate;
}
