/**
 * Keyboard shortcut definitions matching portal-iris-web.
 */

export const LABELING_SHORTCUTS = {
  common: {
    selection: 'v',
    layerToggle: '\\',
    navigationToggle: 'g',
  },
  image: {
    boundingBox: 'u',
    pen: 'p',
    brush: 'b',
    magicBrush: 'w',
    superpixel: 'x',
    eraser: 'e',
  },
  text: {
    highlighting: 'h',
    autoHighlight: 'a',
  },
  number: {
    highlighting: 'h',
  },
  validation: {
    rangeSelection: 's',
    issue: 'i',
  },
} as const

export type ShortcutCategory = keyof typeof LABELING_SHORTCUTS

/**
 * Format a tool name with its shortcut key for display.
 * e.g. formatShortcutTitle("Selection", "v") → "Selection (V)"
 */
export function formatShortcutTitle(title: string, shortcutKey: string): string {
  if (!shortcutKey) return title
  const display = shortcutKey === '\\' ? '\\' : shortcutKey.toUpperCase()
  return `${title} (${display})`
}

/**
 * Normalize keyboard event to a shortcut key string.
 * Handles special cases like backslash.
 */
export function getLabelingShortcutKey(event: KeyboardEvent): string {
  if (event.key === '\\' || event.code === 'Backslash') {
    return '\\'
  }
  return event.key.toLowerCase()
}

/**
 * Whether to ignore a labeling shortcut event.
 * Returns true if focus is on input/textarea/contentEditable.
 */
export function shouldIgnoreLabelingShortcutEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false

  const tagName = target.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }

  if (target.isContentEditable) {
    return true
  }

  return false
}
