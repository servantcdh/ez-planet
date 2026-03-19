import { useEffect } from 'react'
import type { WorkspaceViewMode, ToolType } from '../types/public'
import {
  LABELING_SHORTCUTS,
  getLabelingShortcutKey,
  shouldIgnoreLabelingShortcutEvent,
} from '../utils/labelingShortcuts'
import { useLayerModeStore } from '../store/layer.store'
import { useWorkspaceLayoutStore } from '../store/workspace-layout.store'
import { useZoomStore } from '../store/zoom.store'

interface KeyboardShortcutsConfig {
  viewMode: WorkspaceViewMode
  isValidationMode: boolean
  setTool: (toolType: ToolType) => void
  onUndo?: () => void
  onRedo?: () => void
  disabled?: boolean
}

/**
 * Registers keyboard shortcuts matching portal-iris-web.
 * Shortcuts are view-mode-aware: Image mode has brush/eraser keys,
 * Text mode has highlighting, etc.
 */
export function useKeyboardShortcuts({
  viewMode,
  isValidationMode,
  setTool,
  onUndo,
  onRedo,
  disabled = false,
}: KeyboardShortcutsConfig) {
  const cycleLayerMode = useLayerModeStore((s) => s.cycleMode)
  const toggleNavigation = useWorkspaceLayoutStore((s) => s.toggleActive)
  const zoomStore = useZoomStore()

  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreLabelingShortcutEvent(event)) return

      const key = getLabelingShortcutKey(event)

      // Ctrl/Cmd shortcuts
      if (event.ctrlKey || event.metaKey) {
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault()
          onUndo?.()
          return
        }
        if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault()
          onRedo?.()
          return
        }
        if (key === '=' || key === '+') {
          event.preventDefault()
          zoomStore.setZoom({
            level: Math.min(zoomStore.level * 1.1, 5),
            width: zoomStore.width,
            height: zoomStore.height,
          })
          return
        }
        if (key === '-') {
          event.preventDefault()
          zoomStore.setZoom({
            level: Math.max(zoomStore.level / 1.1, 0.1),
            width: zoomStore.width,
            height: zoomStore.height,
          })
          return
        }
        if (key === '0') {
          event.preventDefault()
          zoomStore.setZoom({
            level: 1,
            width: zoomStore.width,
            height: zoomStore.height,
          })
          return
        }
        return
      }

      // Common shortcuts
      const { common } = LABELING_SHORTCUTS
      if (key === common.selection) {
        setTool('selection')
        return
      }
      if (key === common.layerToggle) {
        cycleLayerMode()
        return
      }
      if (key === common.navigationToggle) {
        toggleNavigation()
        return
      }

      // Validation mode shortcuts
      if (isValidationMode) {
        // validation shortcuts handled by validation UIMeta
        return
      }

      // View-mode-specific shortcuts
      if (viewMode === 'Image') {
        const { image } = LABELING_SHORTCUTS
        switch (key) {
          case image.boundingBox:
            setTool('blankRect')
            return
          case image.pen:
            setTool('polygon')
            return
          case image.brush:
            setTool('brush')
            return
          case image.magicBrush:
            setTool('magicbrush')
            return
          case image.superpixel:
            setTool('superpixel')
            return
          case image.eraser:
            setTool('eraser')
            return
        }
      }

      // Text/Number don't have extra single-key shortcuts beyond common ones
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    viewMode,
    isValidationMode,
    setTool,
    onUndo,
    onRedo,
    disabled,
    cycleLayerMode,
    toggleNavigation,
    zoomStore,
  ])
}
