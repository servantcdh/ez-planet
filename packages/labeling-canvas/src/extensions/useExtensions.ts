import { useEffect, useMemo, useRef } from 'react'
import type {
  Annotation,
  CanvasPointerEvent,
  ExtensionContext,
  LabelingExtension,
  ToolExtension,
} from '../types/public'
import { getCanvasInstance, getCanvasJSON } from '../canvas/core'

interface UseExtensionsOptions {
  extensions: LabelingExtension[]
  image: { url: string; width: number; height: number }
  annotations: Annotation[]
  selectedIds: string[]
  activeTool: string
  addAnnotations: (annotations: Annotation[]) => void
  updateAnnotation: (id: string, annotation: Partial<Annotation>) => void
  removeAnnotations: (ids: string[]) => void
  setTool: (tool: string) => void
}

/**
 * Manages extension lifecycle — provides the ExtensionContext
 * and hooks up ToolExtension canvas handlers.
 */
export function useExtensions(options: UseExtensionsOptions) {
  const {
    extensions,
    image,
    annotations,
    selectedIds,
    activeTool,
    addAnnotations,
    updateAnnotation,
    removeAnnotations,
    setTool,
  } = options

  // Separate by slot
  const toolExtensions = useMemo(
    () => extensions.filter((ext): ext is ToolExtension => ext.slot === 'tool'),
    [extensions],
  )
  const sidePanelExtensions = useMemo(
    () => extensions.filter((ext) => ext.slot === 'sidePanel'),
    [extensions],
  )
  const toolbarExtensions = useMemo(
    () => extensions.filter((ext) => ext.slot === 'toolbar'),
    [extensions],
  )

  // Build context
  const context = useMemo<ExtensionContext>(
    () => ({
      image,
      annotations,
      selectedIds,
      activeTool,
      addAnnotations,
      updateAnnotation,
      removeAnnotations,
      setTool,
      canvas: {
        toJSON: () => getCanvasJSON(),
        getImageDataURL: () => {
          const canvas = getCanvasInstance()
          if (!canvas) return ''
          return (canvas as any).toDataURL({ format: 'png', multiplier: 1 })
        },
      },
    }),
    [image, annotations, selectedIds, activeTool, addAnnotations, updateAnnotation, removeAnnotations, setTool],
  )

  // Active tool extension canvas handlers
  const activeToolExtension = useMemo(
    () => toolExtensions.find((ext) => ext.id === activeTool),
    [toolExtensions, activeTool],
  )

  const handlersRef = useRef(activeToolExtension?.canvasHandlers)
  handlersRef.current = activeToolExtension?.canvasHandlers

  useEffect(() => {
    const canvas = getCanvasInstance()
    if (!canvas || !handlersRef.current) return

    const toPointerEvent = (e: any): CanvasPointerEvent => {
      const pointer = (canvas as any).getScenePoint?.(e) ?? (canvas as any).getPointer?.(e) ?? { x: 0, y: 0 }
      return {
        x: pointer.x,
        y: pointer.y,
        shiftKey: e.e?.shiftKey ?? false,
        ctrlKey: e.e?.ctrlKey ?? false,
        altKey: e.e?.altKey ?? false,
      }
    }

    const onDown = (e: any) => handlersRef.current?.onMouseDown?.(toPointerEvent(e))
    const onMove = (e: any) => handlersRef.current?.onMouseMove?.(toPointerEvent(e))
    const onUp = (e: any) => handlersRef.current?.onMouseUp?.(toPointerEvent(e))

    ;(canvas as any).on('mouse:down', onDown)
    ;(canvas as any).on('mouse:move', onMove)
    ;(canvas as any).on('mouse:up', onUp)

    return () => {
      ;(canvas as any).off('mouse:down', onDown)
      ;(canvas as any).off('mouse:move', onMove)
      ;(canvas as any).off('mouse:up', onUp)
    }
  }, [activeToolExtension?.id])

  return {
    context,
    toolExtensions,
    sidePanelExtensions,
    toolbarExtensions,
    activeToolExtension,
  }
}
