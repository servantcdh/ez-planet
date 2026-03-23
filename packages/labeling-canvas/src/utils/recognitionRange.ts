type RecognitionRangeLike = {
  start?: unknown;
  end?: unknown;
};

const normalizeRangeSource = (value: unknown): RecognitionRangeLike | null => {
  if (!value) {
    return null;
  }
  if (typeof value === "object") {
    return value as RecognitionRangeLike;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as RecognitionRangeLike;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const coerceFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const normalizeRecognitionRange = (
  value: unknown
): { start: number; end: number } | null => {
  const source = normalizeRangeSource(value);
  if (!source) {
    return null;
  }
  const startValue = coerceFiniteNumber(source.start);
  const endValue = coerceFiniteNumber(source.end);
  if (startValue === null || endValue === null) {
    return null;
  }
  const minValue = Math.min(startValue, endValue);
  const maxValue = Math.max(startValue, endValue);
  const start = Math.max(0, Math.floor(minValue));
  let end = Math.max(0, Math.floor(maxValue));
  if (end <= start) {
    end = start + 1;
  }
  return { start, end };
};
