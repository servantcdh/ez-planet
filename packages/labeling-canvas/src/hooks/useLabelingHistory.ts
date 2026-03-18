import { useCallback, useMemo } from 'react'
import { useToolSelectionStore } from '../store/tool.store'
import { getCanvasInstance, getCanvasJSON, renderAllSafe } from '../canvas/core'
import type { LabeledFabricObject } from '../types/internal'
import { useCanvasObjectsStore } from '../store/canvas-objects.store'

/**
 * Level 3 headless hook — Canvas undo/redo history.
 *
 * Uses the tool store's undo/redo stacks (JSON snapshots).
 */
export function useLabelingHistory() {
  const undoStack = useToolSelectionStore((s) => s.undoStack)
  const redoStack = useToolSelectionStore((s) => s.redoStack)
  const setUndoStack = useToolSelectionStore((s) => s.setUndoStack)
  const setRedoStack = useToolSelectionStore((s) => s.setRedoStack)
  const setObjects = useCanvasObjectsStore((s) => s.setObjects)

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  const pushSnapshot = useCallback(() => {
    const json = getCanvasJSON()
    const snapshot = JSON.stringify(json)
    setUndoStack([...undoStack, snapshot])
    setRedoStack([])
  }, [undoStack, setUndoStack, setRedoStack])

  const undo = useCallback(async () => {
    if (!canUndo) return
    const canvas = getCanvasInstance()
    if (!canvas) return

    // Save current state to redo
    const currentJSON = JSON.stringify(getCanvasJSON())
    setRedoStack([...redoStack, currentJSON])

    // Pop last from undo
    const newUndo = [...undoStack]
    const prevSnapshot = newUndo.pop()!
    setUndoStack(newUndo)

    // Restore canvas
    await (canvas as any).loadFromJSON(prevSnapshot)
    renderAllSafe(canvas as any)
    setObjects(canvas.getObjects() as LabeledFabricObject[])
  }, [canUndo, undoStack, redoStack, setUndoStack, setRedoStack, setObjects])

  const redo = useCallback(async () => {
    if (!canRedo) return
    const canvas = getCanvasInstance()
    if (!canvas) return

    // Save current state to undo
    const currentJSON = JSON.stringify(getCanvasJSON())
    setUndoStack([...undoStack, currentJSON])

    // Pop last from redo
    const newRedo = [...redoStack]
    const nextSnapshot = newRedo.pop()!
    setRedoStack(newRedo)

    // Restore canvas
    await (canvas as any).loadFromJSON(nextSnapshot)
    renderAllSafe(canvas as any)
    setObjects(canvas.getObjects() as LabeledFabricObject[])
  }, [canRedo, undoStack, redoStack, setUndoStack, setRedoStack, setObjects])

  const clear = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
  }, [setUndoStack, setRedoStack])

  return useMemo(
    () => ({
      canUndo,
      canRedo,
      undo,
      redo,
      pushSnapshot,
      clear,
    }),
    [canUndo, canRedo, undo, redo, pushSnapshot, clear],
  )
}
