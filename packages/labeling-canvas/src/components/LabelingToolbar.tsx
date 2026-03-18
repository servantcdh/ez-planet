import { type ReactNode, useCallback } from 'react'
import type { LabelingToolbarProps, ToolType } from '../types/public'
import { useToolSelectionStore } from '../store/tool.store'
import {
  brushTool,
  eraserTool,
  magicbrushTool,
  polygonTool,
  blankRectTool,
  selectionTool,
  superpixelTool,
} from '../canvas/tools'
import {
  LabelingFloatingToolbar,
  type ToolbarItem,
} from './LabelingFloatingToolbar'

interface LabelingToolbarInternalProps extends LabelingToolbarProps {
  tools?: ToolType[]
  children?: ReactNode
}

const TOOL_MAP: Record<ToolType, () => { id: string; init: (...args: any[]) => any }> = {
  selection: selectionTool,
  brush: brushTool,
  blankRect: blankRectTool,
  filledRect: blankRectTool,
  polygon: polygonTool,
  eraser: eraserTool,
  magicbrush: magicbrushTool,
  superpixel: superpixelTool,
}

const TOOL_LABELS: Record<ToolType, string> = {
  selection: 'Selection',
  brush: 'Brush',
  blankRect: 'Bounding Box',
  filledRect: 'Filled Box',
  polygon: 'Pen',
  eraser: 'Eraser',
  magicbrush: 'Magic Brush',
  superpixel: 'Superpixel',
}

const DEFAULT_TOOLS: ToolType[] = [
  'selection',
  'blankRect',
  'polygon',
  'brush',
  'eraser',
]

export function LabelingToolbar({
  tools = DEFAULT_TOOLS,
  sections: _sections,
  onSave,
  isSaving,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  children,
}: LabelingToolbarInternalProps) {
  const currentTool = useToolSelectionStore((s) => s.tool)
  const setTool = useToolSelectionStore((s) => s.setTool)
  const handleToolSelect = useCallback(
    (toolType: ToolType) => {
      const factory = TOOL_MAP[toolType]
      if (factory) {
        setTool(factory())
      }
    },
    [setTool],
  )

  // Build toolbar items from tools config
  const toolItems: ToolbarItem[] = []

  // Selection is always first if included
  const toolList = tools.length > 0 ? tools : DEFAULT_TOOLS
  for (const toolType of toolList) {
    if (toolType === 'selection') {
      toolItems.push({
        variant: 'radio',
        id: 'selection',
        name: 'tool',
        title: TOOL_LABELS.selection,
        checked: currentTool?.id === 'selection',
        onClick: () => handleToolSelect('selection'),
      })
      // Add divider after selection
      toolItems.push({ variant: 'divider' })
      continue
    }

    toolItems.push({
      variant: 'radio',
      id: toolType,
      name: 'tool',
      title: TOOL_LABELS[toolType],
      checked: currentTool?.id === toolType ||
        (toolType === 'blankRect' && currentTool?.id === 'bounded-box') ||
        (toolType === 'filledRect' && currentTool?.id === 'filled-box'),
      onClick: () => handleToolSelect(toolType),
    })
  }

  // Add eraser divider
  const eraserIndex = toolItems.findIndex(
    (item) => item.variant === 'radio' && (item as any).id === 'eraser',
  )
  if (eraserIndex > 0) {
    toolItems.splice(eraserIndex, 0, { variant: 'divider' })
  }

  // Navigation items
  const navItems: ToolbarItem[] = []
  if (onPrev || onNext) {
    navItems.push({ variant: 'divider' })
    if (onPrev) {
      navItems.push({
        variant: 'button',
        title: 'Previous',
        disabled: !hasPrev,
        onClick: onPrev,
      })
    }
    if (onNext) {
      navItems.push({
        variant: 'button',
        title: 'Next',
        disabled: !hasNext,
        onClick: onNext,
      })
    }
  }

  // Save item
  const saveItems: ToolbarItem[] = []
  if (onSave) {
    saveItems.push({ variant: 'divider' })
    saveItems.push({
      variant: 'button',
      title: 'Save',
      disabled: isSaving,
      onClick: onSave,
    })
  }

  const allItems: ToolbarItem[] = [
    ...toolItems,
    ...navItems,
    ...saveItems,
  ]

  return (
    <LabelingFloatingToolbar items={allItems}>
      {children}
    </LabelingFloatingToolbar>
  )
}
