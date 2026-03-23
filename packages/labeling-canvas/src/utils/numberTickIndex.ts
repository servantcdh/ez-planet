export type TickRoundingMode = "round" | "floor";

export type NumericTickIndex = {
  value: number;
  index: number;
};

export type TickIndexLookup = {
  indexByKey: Map<string, number>;
  numericTicks: NumericTickIndex[];
};

export function toTickLookupKey(value: unknown): string | null {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return `${typeof value}:${String(value)}`;
  }
  return null;
}

export function lowerBoundNumericTick(
  entries: NumericTickIndex[],
  target: number
): number {
  let left = 0;
  let right = entries.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (entries[mid].value < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  return left;
}

export function findClosestNumericTickIndex(
  entries: NumericTickIndex[],
  target: number
): number | null {
  if (!entries.length) {
    return null;
  }
  const insertIndex = lowerBoundNumericTick(entries, target);
  if (insertIndex <= 0) {
    return entries[0].index;
  }
  if (insertIndex >= entries.length) {
    return entries[entries.length - 1].index;
  }
  const lower = entries[insertIndex - 1];
  const upper = entries[insertIndex];
  return Math.abs(target - lower.value) <= Math.abs(upper.value - target)
    ? lower.index
    : upper.index;
}

export function buildTickIndexLookup(
  ticks: Array<{ key?: unknown; label?: unknown }>
): TickIndexLookup {
  const indexByKey = new Map<string, number>();
  const numericTicks: NumericTickIndex[] = [];

  ticks.forEach((tick, index) => {
    const keyLookup = toTickLookupKey(tick.key);
    if (keyLookup && !indexByKey.has(keyLookup)) {
      indexByKey.set(keyLookup, index);
    }
    const labelLookup = toTickLookupKey(tick.label);
    if (labelLookup && !indexByKey.has(labelLookup)) {
      indexByKey.set(labelLookup, index);
    }
    const numericLabel = Number(tick.label);
    if (Number.isFinite(numericLabel)) {
      numericTicks.push({ value: numericLabel, index });
    }
  });

  numericTicks.sort((a, b) =>
    a.value === b.value ? a.index - b.index : a.value - b.value
  );
  return { indexByKey, numericTicks };
}

export function resolveTickIndexFromRawValue(
  raw: unknown,
  lookup: TickIndexLookup,
  maxIndex: number,
  rounding: TickRoundingMode
): number | null {
  if (maxIndex < 0 || raw == null) {
    return null;
  }

  const lookupKey = toTickLookupKey(raw);
  if (lookupKey) {
    const mappedIndex = lookup.indexByKey.get(lookupKey);
    if (typeof mappedIndex === "number") {
      return mappedIndex;
    }
  }

  const numericValue =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : null;
  if (typeof numericValue === "number" && Number.isFinite(numericValue)) {
    const nearest = findClosestNumericTickIndex(lookup.numericTicks, numericValue);
    if (typeof nearest === "number") {
      return nearest;
    }
    const fallback =
      rounding === "round" ? Math.round(numericValue) : Math.floor(numericValue);
    return Math.max(0, Math.min(fallback, maxIndex));
  }

  return null;
}
