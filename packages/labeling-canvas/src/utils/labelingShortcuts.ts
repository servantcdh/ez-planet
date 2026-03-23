export type LabelingShortcutSpec = {
  key: string;
  label: string;
};

const createShortcut = (key: string): LabelingShortcutSpec => ({
  key,
  label: key === "\\" ? "\\" : key.toUpperCase(),
});

export const LABELING_SHORTCUTS = {
  common: {
    selection: createShortcut("v"),
    layerToggle: createShortcut("\\"),
    navigationToggle: createShortcut("g"),
  },
  image: {
    boundingBox: createShortcut("u"),
    pen: createShortcut("p"),
    brush: createShortcut("b"),
    magicBrush: createShortcut("w"),
    superpixel: createShortcut("x"),
    eraser: createShortcut("e"),
  },
  text: {
    highlighting: createShortcut("h"),
    autoHighlight: createShortcut("a"),
  },
  number: {
    highlighting: createShortcut("h"),
  },
  validation: {
    rangeSelection: createShortcut("s"),
    issue: createShortcut("i"),
  },
} as const;

export const formatShortcutTitle = (
  title: string,
  shortcut?: LabelingShortcutSpec
): string => (shortcut ? `${title} (${shortcut.label})` : title);

export const getLabelingShortcutKey = (event: KeyboardEvent): string => {
  const rawKey = event.key;
  if (!rawKey) {
    return "";
  }
  const normalized = rawKey.toLowerCase();
  if (normalized === "backslash") {
    return "\\";
  }
  return normalized;
};

export const shouldIgnoreLabelingShortcutEvent = (
  target: EventTarget | null
): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
};
