import { useCallback, useMemo } from 'react'
import type { Annotation, CanvasState } from '../types/public'
import type { LabeledFabricObject } from '../types/internal'
import {
  getCanvasInstance,
  getCanvasJSON,
  getLabeledObjects,
  renderAllSafe,
} from '../canvas/core'
import { canvasToAnnotations, annotationToFabricProps } from '../canvas/serializer'
import { useCanvasObjectsStore } from '../store/canvas-objects.store'
import { useZoomStore } from '../store/zoom.store'

/**
 * Level 3 headless hook — Direct canvas access.
 *
 * Provides low-level canvas operations: add/remove objects,
 * export state, zoom control, etc.
 */
export function useLabelingCanvas() {
  const objects = useCanvasObjectsStore((s) => s.objects)
  const setObjects = useCanvasObjectsStore((s) => s.setObjects)
  const zoom = useZoomStore((s) => s.level)
  const setZoom = useZoomStore((s) => s.setZoom)

  const getAnnotations = useCallback(
    async (imageWidth: number, imageHeight: number): Promise<Annotation[]> => {
      const labeled = getLabeledObjects()
      return canvasToAnnotations(labeled, imageWidth, imageHeight)
    },
    [],
  )

  const addAnnotation = useCallback(
    async (annotation: Annotation, imageWidth: number, imageHeight: number) => {
      const canvas = getCanvasInstance()
      if (!canvas) return

      const props = annotationToFabricProps(annotation, imageWidth, imageHeight)
      const fabric = await import('fabric')

      let fabricObject: any = null
      const type = props.type as string

      if (type === 'rect') {
        fabricObject = new fabric.Rect(props)
      } else if (type === 'polygon' && props.points) {
        fabricObject = new fabric.Polygon(props.points as any, props)
      } else if (type === 'path' && props.path) {
        fabricObject = new fabric.Path(props.path as any, props)
      } else if (type === 'image' && typeof props.src === 'string') {
        fabricObject = await fabric.FabricImage.fromURL(props.src, { crossOrigin: 'anonymous' })
        fabricObject.set(props)
      }

      if (fabricObject) {
        canvas.add(fabricObject)
        renderAllSafe(canvas as any)
        setObjects(canvas.getObjects() as LabeledFabricObject[])
      }
    },
    [setObjects],
  )

  const removeAnnotation = useCallback(
    (annotationId: string) => {
      const canvas = getCanvasInstance()
      if (!canvas) return

      const objects = canvas.getObjects() as LabeledFabricObject[]
      const target = objects.find((obj) => (obj as any).unique === annotationId)
      if (target) {
        canvas.remove(target)
        renderAllSafe(canvas as any)
        setObjects(canvas.getObjects() as LabeledFabricObject[])
      }
    },
    [setObjects],
  )

  const clearCanvas = useCallback(() => {
    const canvas = getCanvasInstance()
    if (!canvas) return
    const all = canvas.getObjects()
    for (const obj of all) {
      canvas.remove(obj)
    }
    renderAllSafe(canvas as any)
    setObjects([])
  }, [setObjects])

  const exportState = useCallback(
    async (imageWidth: number, imageHeight: number): Promise<CanvasState> => {
      const annotations = await getAnnotations(imageWidth, imageHeight)
      const canvasJSON = getCanvasJSON()
      return {
        annotations,
        canvasJSON,
        image: { width: imageWidth, height: imageHeight },
      }
    },
    [getAnnotations],
  )

  const setZoomLevel = useCallback(
    (level: number) => {
      const canvas = getCanvasInstance()
      if (!canvas) return
      canvas.setZoom(level)
      renderAllSafe(canvas as any)
      setZoom({ level, width: canvas.getWidth(), height: canvas.getHeight() })
    },
    [setZoom],
  )

  return useMemo(
    () => ({
      objects,
      zoom,
      getAnnotations,
      addAnnotation,
      removeAnnotation,
      clearCanvas,
      exportState,
      setZoomLevel,
    }),
    [objects, zoom, getAnnotations, addAnnotation, removeAnnotation, clearCanvas, exportState, setZoomLevel],
  )
}
