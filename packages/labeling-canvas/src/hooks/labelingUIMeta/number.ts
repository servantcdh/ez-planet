import { createElement } from 'react'
import type { LabelingUIMetaResult, ToolbarItemMeta } from './types'
import { LabelingIcon } from '../../components/icons'
import { useNumberToolStore } from '../../store/number-tool.store'
import { useLayerModeStore, LAYER_MODE } from '../../store/layer.store'
import {
  LABELING_SHORTCUTS,
  formatShortcutTitle,
} from '../../utils/labelingShortcuts'
import type { LabelingIconName } from '../../types/public'

function icon(name: LabelingIconName) {
  return createElement(LabelingIcon, { iconType: name, size: 'sm' as const })
}

export function useNumberLabelingUIMeta(): LabelingUIMetaResult {
  const tool = useNumberToolStore((s) => s.tool)
  const setTool = useNumberToolStore((s) => s.setTool)
  const layerMode = useLayerModeStore((s) => s.mode)
  const cycleLayerMode = useLayerModeStore((s) => s.cycleMode)

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
      title: formatShortcutTitle('Highlighting', LABELING_SHORTCUTS.number.highlighting),
      checked: toolId === 'drag-segment',
      onClick: () => setTool({ id: 'drag-segment', label: 'Highlighting' }),
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
