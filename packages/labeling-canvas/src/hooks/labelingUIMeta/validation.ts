import { createElement } from 'react'
import type { LabelingUIMetaResult, ToolbarItemMeta } from './types'
import { LabelingIcon } from '../../components/icons'
import { useImageToolStore } from '../../store/image-tool.store'
import { useLayerModeStore, LAYER_MODE } from '../../store/layer.store'
import { useIssuePanelStore } from '../../store/issue-panel.store'
import { selectionTool } from '../../canvas/tools'
import { LABELING_SHORTCUTS, formatShortcutTitle } from '../../utils/labelingShortcuts'
import type { LabelingIconName } from '../../types/public'

function icon(name: LabelingIconName) {
  return createElement(LabelingIcon, { iconType: name, size: 'sm' as const })
}

export function useValidationLabelingUIMeta(): LabelingUIMetaResult {
  const tool = useImageToolStore((s) => s.tool)
  const setTool = useImageToolStore((s) => s.setTool)
  const layerMode = useLayerModeStore((s) => s.mode)
  const cycleLayerMode = useLayerModeStore((s) => s.cycleMode)
  const toggleIssuePanel = useIssuePanelStore((s) => s.toggle)

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
      onClick: () => setTool(selectionTool()),
    },
    { variant: 'divider' },
    {
      variant: 'button',
      id: 'issue',
      icon: icon('icon-issue'),
      title: formatShortcutTitle('Issue', LABELING_SHORTCUTS.validation.issue),
      onClick: toggleIssuePanel,
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
