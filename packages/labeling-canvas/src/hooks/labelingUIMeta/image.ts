import { createElement } from 'react'
import type { LabelingUIMetaResult, ToolbarItemMeta } from './types'
import { LabelingIcon } from '../../components/icons'
import { useImageToolStore } from '../../store/image-tool.store'
import { useLayerModeStore, LAYER_MODE } from '../../store/layer.store'
import {
  selectionTool,
  blankRectTool,
  polygonTool,
  brushTool,
  eraserTool,
  magicbrushTool,
  superpixelTool,
} from '../../canvas/tools'
import {
  LABELING_SHORTCUTS,
  formatShortcutTitle,
} from '../../utils/labelingShortcuts'
import type { LabelingIconName } from '../../types/public'

const SUB_TOOL_PANEL_BUTTON_ID = 'sub-tool-panel'

function icon(name: LabelingIconName, size: 'sm' | 'xxs' = 'sm') {
  return createElement(LabelingIcon, { iconType: name, size })
}

export function useImageLabelingUIMeta(): LabelingUIMetaResult {
  const tool = useImageToolStore((s) => s.tool)
  const setTool = useImageToolStore((s) => s.setTool)
  const layerMode = useLayerModeStore((s) => s.mode)
  const cycleLayerMode = useLayerModeStore((s) => s.cycleMode)

  const toolId = tool?.id ?? 'selection'

  // Determine icon for intelligent tools button
  const intelligentToolIds = ['magic-brush', 'superpixel', 'seg-anything']
  const isIntelligentActive = intelligentToolIds.includes(toolId)
  const intelligentIcon: LabelingIconName =
    toolId === 'superpixel'
      ? 'icon-superpixel'
      : toolId === 'seg-anything'
        ? 'icon-seg-anything'
        : 'icon-magic-wand'

  // Layer mode icon
  const layerIcon: LabelingIconName =
    layerMode === LAYER_MODE.ONLY_ORIGIN
      ? 'icon-bottom-layer'
      : layerMode === LAYER_MODE.ONLY_OVERLAY
        ? 'icon-top-layer'
        : 'icon-all-layer'

  const toolbar: ToolbarItemMeta[] = [
    // Selection
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
    // Bounding Box
    {
      variant: 'radio',
      id: 'bounded-box',
      name: 'tool',
      icon: icon('icon-borderd-rect'),
      title: formatShortcutTitle('Bounding Box', LABELING_SHORTCUTS.image.boundingBox),
      checked: toolId === 'bounded-box',
      onClick: () => setTool(blankRectTool()),
    },
    // Pen
    {
      variant: 'radio',
      id: 'polygon',
      name: 'tool',
      icon: icon('icon-pen'),
      title: formatShortcutTitle('Pen', LABELING_SHORTCUTS.image.pen),
      checked: toolId === 'polygon',
      onClick: () => setTool(polygonTool()),
    },
    // Brush
    {
      variant: 'radio',
      id: 'brush',
      name: 'tool',
      icon: icon('icon-brush'),
      title: formatShortcutTitle('Brush', LABELING_SHORTCUTS.image.brush),
      checked: toolId === 'brush',
      onClick: () => setTool(brushTool()),
    },
    // Intelligent Tools (sub-panel)
    {
      variant: 'radio',
      id: SUB_TOOL_PANEL_BUTTON_ID,
      name: 'tool',
      icon: icon(intelligentIcon),
      title: 'Intelligent Tools',
      checked: isIntelligentActive,
      subButtonItems: [
        {
          variant: 'radio',
          id: 'magic-brush',
          name: 'sub-tool',
          icon: icon('icon-magic-wand'),
          title: formatShortcutTitle('Magic Brush', LABELING_SHORTCUTS.image.magicBrush),
          checked: toolId === 'magic-brush',
          onClick: () => setTool(magicbrushTool()),
        },
        {
          variant: 'radio',
          id: 'superpixel',
          name: 'sub-tool',
          icon: icon('icon-superpixel'),
          title: formatShortcutTitle('Superpixel', LABELING_SHORTCUTS.image.superpixel),
          checked: toolId === 'superpixel',
          onClick: () => setTool(superpixelTool()),
        },
        {
          variant: 'radio',
          id: 'seg-anything',
          name: 'sub-tool',
          icon: icon('icon-seg-anything'),
          title: 'Segment Anything',
          checked: toolId === 'seg-anything',
          disabled: true,
          onClick: () => {},
        },
      ],
      onClick: () => {
        // Click the main button selects the last used intelligent tool
        if (!isIntelligentActive) {
          setTool(magicbrushTool())
        }
      },
    },
    // Dropdown toggle (slim)
    {
      variant: 'button',
      id: 'sub-tool-toggle',
      icon: icon('icon-down', 'xxs'),
      title: '',
      slim: true,
      onClick: () => {},
    },
    // Eraser
    {
      variant: 'radio',
      id: 'eraser',
      name: 'tool',
      icon: icon('icon-eraser'),
      title: formatShortcutTitle('Eraser', LABELING_SHORTCUTS.image.eraser),
      checked: toolId === 'eraser',
      onClick: () => setTool(eraserTool()),
    },
    { variant: 'divider' },
    // Layer Mode
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
