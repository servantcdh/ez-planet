import { useCallback, useMemo } from 'react'
import type { ToolType } from '../types/public'
import { useToolSelectionStore } from '../store/tool.store'
import { usePaletteStore, useOpacityStore, useBrushStore } from '../store/palette.store'
import {
  brushTool,
  eraserTool,
  magicbrushTool,
  polygonTool,
  blankRectTool,
  filledRectTool,
  selectionTool,
  superpixelTool,
} from '../canvas/tools'

const TOOL_FACTORIES: Record<ToolType, () => { id: string; init: (...args: any[]) => any }> = {
  selection: selectionTool,
  brush: brushTool,
  blankRect: blankRectTool,
  filledRect: filledRectTool,
  polygon: polygonTool,
  eraser: eraserTool,
  magicbrush: magicbrushTool,
  superpixel: superpixelTool,
}

/**
 * Level 3 headless hook — Tool selection and palette state.
 *
 * Returns current tool, setTool, and palette/brush/opacity state with setters.
 */
export function useLabelingTools() {
  const currentTool = useToolSelectionStore((s) => s.tool)
  const _setTool = useToolSelectionStore((s) => s.setTool)

  const colorCode = usePaletteStore((s) => s.colorCode)
  const setColorCode = usePaletteStore((s) => s.setColorCode)
  const opacity = useOpacityStore((s) => s.opacity)
  const setOpacity = useOpacityStore((s) => s.setOpacity)
  const brush = useBrushStore((s) => s.brush)
  const setBrush = useBrushStore((s) => s.setBrush)

  const setTool = useCallback(
    (toolType: ToolType) => {
      const factory = TOOL_FACTORIES[toolType]
      if (factory) {
        _setTool(factory())
      }
    },
    [_setTool],
  )

  const clearTool = useCallback(() => {
    _setTool(null)
  }, [_setTool])

  const activeToolId = currentTool?.id ?? null

  return useMemo(
    () => ({
      activeToolId,
      currentTool,
      setTool,
      clearTool,
      colorCode,
      setColorCode,
      opacity,
      setOpacity,
      brush,
      setBrush,
    }),
    [activeToolId, currentTool, setTool, clearTool, colorCode, setColorCode, opacity, setOpacity, brush, setBrush],
  )
}
