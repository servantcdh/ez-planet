import { createElement } from 'react'
import type { LabelingUIMetaResult, ToolbarItemMeta } from './types'
import { LabelingIcon } from '../../components/icons'
import { useTextToolStore } from '../../store/text-tool.store'
import { useTextAutoHighlightStore } from '../../store/text-auto-highlight.store'
import { useLayerModeStore, LAYER_MODE } from '../../store/layer.store'
import {
  LABELING_SHORTCUTS,
  formatShortcutTitle,
} from '../../utils/labelingShortcuts'
import type { LabelingIconName } from '../../types/public'

function icon(name: LabelingIconName) {
  return createElement(LabelingIcon, { iconType: name, size: 'sm' as const })
}

export function useTextLabelingUIMeta(): LabelingUIMetaResult {
  const tool = useTextToolStore((s) => s.tool)
  const setTool = useTextToolStore((s) => s.setTool)
  const layerMode = useLayerModeStore((s) => s.mode)
  const cycleLayerMode = useLayerModeStore((s) => s.cycleMode)
  const autoHighlight = useTextAutoHighlightStore()

  const toolId = tool?.id ?? 'selection'

  const layerIcon: LabelingIconName =
    layerMode === LAYER_MODE.ONLY_ORIGIN
      ? 'icon-bottom-layer'
      : layerMode === LAYER_MODE.ONLY_OVERLAY
        ? 'icon-top-layer'
        : 'icon-all-layer'

  const toolbar: ToolbarItemMeta[] = [
    {
      variant: 'radio',
      id: 'selection',
      name: 'tool',
      icon: icon('icon-selection'),
      title: formatShortcutTitle('Selection', LABELING_SHORTCUTS.common.selection),
      checked: toolId === 'selection',
      onClick: () => setTool({ id: 'selection', label: 'Selection' }),
    },
    { variant: 'divider' },
    {
      variant: 'radio',
      id: 'drag-segment',
      name: 'tool',
      icon: icon('icon-highlight'),
      title: formatShortcutTitle('Highlighting', LABELING_SHORTCUTS.text.highlighting),
      checked: toolId === 'drag-segment',
      onClick: () => setTool({ id: 'drag-segment', label: 'Highlighting' }),
    },
    { variant: 'divider' },
    // Auto-highlight sub-panel
    {
      variant: 'button',
      id: 'auto-highlight',
      icon: icon('icon-highlight'),
      title: formatShortcutTitle('Auto Highlight', LABELING_SHORTCUTS.text.autoHighlight),
      subItems: [
        {
          variant: 'checkbox',
          id: 'auto-highlight-english',
          title: 'English',
          checked: autoHighlight.english,
          onClick: () => autoHighlight.setEnglish(!autoHighlight.english),
        },
        {
          variant: 'checkbox',
          id: 'auto-highlight-number',
          title: 'Number',
          checked: autoHighlight.number,
          onClick: () => autoHighlight.setNumber(!autoHighlight.number),
        },
        {
          variant: 'checkbox',
          id: 'auto-highlight-special',
          title: 'Special',
          checked: autoHighlight.special,
          onClick: () => autoHighlight.setSpecial(!autoHighlight.special),
        },
      ],
      onClick: () => {},
    },
    { variant: 'divider' },
    {
      variant: 'button',
      id: 'layer-mode',
      icon: icon(layerIcon),
      title: formatShortcutTitle('Layer', LABELING_SHORTCUTS.common.layerToggle),
      onClick: cycleLayerMode,
    },
  ]

  return { toolbar }
}
