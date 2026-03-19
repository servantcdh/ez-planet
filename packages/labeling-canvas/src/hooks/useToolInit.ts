import { useEffect, useRef } from 'react'
import type { LabelingTool, BrushOptions } from '../types/internal'
import { getCanvasInstance } from '../canvas/core'

export interface ToolInitConfig {
  colorCode: string
  brush: BrushOptions
  imageUrl?: string
  magicbrushConfig?: { threshold: number; radius: number }
  superpixelConfig?: Record<string, number>
  segAnythingCallback?: (payload: any) => void
  previousTool?: LabelingTool | null
}

/**
 * Manages tool lifecycle: calls tool.init(config) when the tool changes,
 * and runs the cleanup function returned by init when unmounting or switching.
 */
export function useToolInit(
  currentTool: LabelingTool | null,
  config: ToolInitConfig,
  canvasReady = false,
) {
  const cleanupRef = useRef<(() => void) | null>(null)
  const toolIdRef = useRef<string | null>(null)

  // Stable refs for config values to avoid re-running on every render
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    const canvas = getCanvasInstance()
    if (!canvas) return

    // Clean up previous tool
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    if (!currentTool) {
      toolIdRef.current = null
      return
    }

    const cfg = configRef.current
    let disposed = false

    const initTool = async () => {
      let cleanup: (() => void) | void | undefined

      switch (currentTool.id) {
        case 'selection':
          cleanup = await currentTool.init()
          break

        case 'brush':
          cleanup = await currentTool.init({
            brush: cfg.brush,
            colorCode: cfg.colorCode,
          })
          break

        case 'bounded-box':
        case 'filled-box':
          cleanup = await currentTool.init({
            colorCode: cfg.colorCode,
          })
          break

        case 'pen':
          cleanup = await currentTool.init({
            colorCode: cfg.colorCode,
          })
          break

        case 'eraser':
          cleanup = await currentTool.init({
            brush: cfg.brush,
          })
          break

        case 'magic-brush':
          cleanup = await currentTool.init({
            src: cfg.imageUrl ?? '',
            colorCode: cfg.colorCode,
            brush: cfg.brush,
            magicbrushConfig: cfg.magicbrushConfig ?? {
              threshold: 15,
              radius: 5,
            },
          })
          break

        case 'superpixel':
          cleanup = await currentTool.init({
            src: cfg.imageUrl ?? '',
            colorCode: cfg.colorCode,
            superpixelConfig: cfg.superpixelConfig ?? {},
            previousTool: cfg.previousTool ?? null,
          })
          break

        case 'seg-anything':
          cleanup = await currentTool.init({
            callback: cfg.segAnythingCallback,
          })
          break

        default:
          // Extension or unknown tool — try init with full config
          cleanup = await currentTool.init(cfg)
          break
      }

      if (!disposed && typeof cleanup === 'function') {
        cleanupRef.current = cleanup
      }
    }

    toolIdRef.current = currentTool.id
    initTool()

    return () => {
      disposed = true
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [currentTool, canvasReady])

  return { activeToolId: toolIdRef.current }
}
