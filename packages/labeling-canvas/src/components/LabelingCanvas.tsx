import { useEffect, useRef, useState } from 'react'
import type { Annotation, CanvasChangeEvent } from '../types/public'
import type { LabeledFabricObject } from '../types/internal'
import {
  loadFabric,
  getCanvasInstance,
  setCanvasInstance,
  subscribeLabelEvents,
  getLabeledObjects,
} from '../canvas/core'
import { canvasToAnnotations, annotationToFabricProps } from '../canvas/serializer'
import { useZoomStore } from '../store/zoom.store'
import { useCanvasObjectsStore } from '../store/canvas-objects.store'
import { useToolSelectionStore } from '../store/tool.store'
import { usePaletteStore, useBrushStore } from '../store/palette.store'
import { useViewModeStore } from '../store/view-mode.store'
import { useValidationModeStore } from '../store/validation-mode.store'
import { useSelectedObjectsStore } from '../store/selected-objects.store'
import { useToolInit } from '../hooks/useToolInit'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useLabelingTools } from '../hooks/useLabelingTools'
import styles from '../styles/workspace.module.css'

interface LabelingCanvasProps {
  image: string | { url: string; width: number; height: number }
  annotations: Annotation[]
  onChange?: (event: CanvasChangeEvent) => void
  readOnly?: boolean
  width?: number
  height?: number
}

export function LabelingCanvas({
  image,
  annotations,
  onChange,
  readOnly = false,
  width,
  height,
}: LabelingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const annotationsRef = useRef(annotations)
  annotationsRef.current = annotations
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const zoomStore = useZoomStore()
  const setZoom = zoomStore.setZoom
  const setCanvasObjects = useCanvasObjectsStore((s) => s.setObjects)

  // Tool state
  const currentTool = useToolSelectionStore((s) => s.tool)
  const colorCode = usePaletteStore((s) => s.colorCode)
  const brush = useBrushStore((s) => s.brush)
  const viewMode = useViewModeStore((s) => s.mode)
  const isValidationMode = useValidationModeStore((s) => s.isValidationMode)
  const setSelectedObjects = useSelectedObjectsStore((s) => s.setObjects)
  const { setTool } = useLabelingTools()

  // Resolve image URL and dimensions
  const imageUrl = typeof image === 'string' ? image : image.url

  // ─── Tool Init ───
  useToolInit(currentTool, {
    colorCode,
    brush,
    imageUrl,
  }, mounted)

  // ─── Keyboard Shortcuts ───
  useKeyboardShortcuts({
    viewMode,
    isValidationMode,
    setTool,
    disabled: readOnly,
  })

  // ─── Space-to-Pan ───
  useEffect(() => {
    if (readOnly) return

    let isPanning = false
    let isSpaceDown = false
    let lastX = 0
    let lastY = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement | null
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
        e.preventDefault()
        isSpaceDown = true
        const canvas = getCanvasInstance()
        if (canvas) {
          canvas.defaultCursor = 'grab'
          canvas.hoverCursor = 'grab'
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown = false
        isPanning = false
        const canvas = getCanvasInstance()
        if (canvas) {
          canvas.defaultCursor = 'default'
          canvas.hoverCursor = 'default'
        }
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!isSpaceDown) return
      isPanning = true
      lastX = e.clientX
      lastY = e.clientY
      const canvas = getCanvasInstance()
      if (canvas) {
        canvas.defaultCursor = 'grabbing'
        canvas.hoverCursor = 'grabbing'
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return
      const canvas = getCanvasInstance()
      if (!canvas) return

      const vpt = canvas.viewportTransform
      if (!vpt) return

      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      vpt[4] += dx
      vpt[5] += dy
      canvas.setViewportTransform(vpt)
      canvas.requestRenderAll()
      lastX = e.clientX
      lastY = e.clientY
    }

    const handleMouseUp = () => {
      if (!isPanning) return
      isPanning = false
      const canvas = getCanvasInstance()
      if (canvas && isSpaceDown) {
        canvas.defaultCursor = 'grab'
        canvas.hoverCursor = 'grab'
      }
    }

    // Ctrl/Cmd + scroll-to-zoom
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const canvas = getCanvasInstance()
      if (!canvas) return

      const delta = e.deltaY
      const zoomLevel = canvas.getZoom()
      const newZoom = delta > 0
        ? Math.max(zoomLevel / 1.05, 0.1)
        : Math.min(zoomLevel * 1.05, 5)

      const point = canvas.getScenePoint(e)
      canvas.zoomToPoint(point, newZoom)
      canvas.requestRenderAll()

      setZoom({
        level: newZoom,
        width: zoomStore.width,
        height: zoomStore.height,
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    const container = containerRef.current
    container?.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      container?.removeEventListener('wheel', handleWheel)
    }
  }, [readOnly, setZoom, zoomStore.width, zoomStore.height])

  // ─── Initialize Fabric canvas ───
  useEffect(() => {
    if (typeof document === 'undefined') return

    let disposed = false

    const init = async () => {
      await loadFabric()
      if (disposed || !canvasRef.current) return

      const fabric = await import('fabric')
      const canvas = new fabric.Canvas(canvasRef.current, {
        selection: !readOnly,
        preserveObjectStacking: true,
      })
      setCanvasInstance(canvas as any)
      setMounted(true)

      // Load background image
      const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
      if (disposed) return

      const imgW = typeof image === 'object' ? image.width : (img.width ?? 0)
      const imgH = typeof image === 'object' ? image.height : (img.height ?? 0)
      setImageSize({ width: imgW, height: imgH })

      // Fit canvas to container
      const container = containerRef.current
      const containerW = width ?? container?.clientWidth ?? imgW
      const containerH = height ?? container?.clientHeight ?? imgH

      const scale = Math.min(containerW / (imgW || 1), containerH / (imgH || 1), 1)
      const canvasW = Math.round(imgW * scale)
      const canvasH = Math.round(imgH * scale)

      canvas.setDimensions({ width: canvasW, height: canvasH })
      canvas.setZoom(scale)

      img.set({ selectable: false, evented: false })
      canvas.backgroundImage = img
      canvas.renderAll()

      setZoom({ level: scale, width: canvasW, height: canvasH })
    }

    init()

    return () => {
      disposed = true
      const canvas = getCanvasInstance()
      if (canvas) {
        canvas.dispose()
        setCanvasInstance(null)
      }
    }
  }, [imageUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load annotations onto canvas
  useEffect(() => {
    if (!mounted) return
    const canvas = getCanvasInstance()
    if (!canvas) return

    const loadAnnotations = async () => {
      // Clear existing objects (except background)
      const existingObjects = canvas.getObjects()
      for (const obj of existingObjects) {
        canvas.remove(obj)
      }

      // Convert annotations to fabric props and add to canvas
      const fabric = await import('fabric')
      for (const annotation of annotations) {
        const props = annotationToFabricProps(annotation, imageSize.width, imageSize.height)
        const type = props.type as string

        let fabricObject: any = null
        if (type === 'rect') {
          fabricObject = new fabric.Rect(props)
        } else if (type === 'image' && typeof props.src === 'string') {
          fabricObject = await fabric.FabricImage.fromURL(props.src as string, { crossOrigin: 'anonymous' })
          fabricObject.set(props)
        } else if (type === 'path' && props.path) {
          fabricObject = new fabric.Path(props.path as any, props)
        } else if (type === 'polygon' && props.points) {
          fabricObject = new fabric.Polygon(props.points as any, props)
        }

        if (fabricObject) {
          if (readOnly) {
            fabricObject.set({ selectable: false, evented: false })
          }
          canvas.add(fabricObject)
        }
      }

      canvas.renderAll()
      setCanvasObjects(canvas.getObjects() as LabeledFabricObject[])
    }

    loadAnnotations()
  }, [annotations, mounted, imageSize.width, imageSize.height, readOnly, setCanvasObjects])

  // Listen for canvas changes and emit onChange
  useEffect(() => {
    if (!mounted) return
    const canvas = getCanvasInstance()
    if (!canvas) return

    const handleChanged = async () => {
      const objects = getLabeledObjects()
      const updatedAnnotations = await canvasToAnnotations(
        objects,
        imageSize.width,
        imageSize.height,
      )
      setCanvasObjects(objects)
      onChangeRef.current?.({
        annotations: updatedAnnotations,
        action: {
          type: 'batch',
          added: [],
          updated: updatedAnnotations,
          deleted: [],
        },
      })
    }

    const events = ['object:added', 'object:removed', 'object:modified'] as const
    for (const event of events) {
      (canvas as any).on(event, handleChanged)
    }

    return () => {
      for (const event of events) {
        (canvas as any).off(event, handleChanged)
      }
    }
  }, [mounted, imageSize.width, imageSize.height, setCanvasObjects])

  // ─── Track selection for selectedObjects store ───
  useEffect(() => {
    if (!mounted) return
    const canvas = getCanvasInstance()
    if (!canvas) return

    const handleSelection = () => {
      const active = canvas.getActiveObjects() as LabeledFabricObject[]
      setSelectedObjects(active)
    }

    const handleSelectionCleared = () => {
      setSelectedObjects([])
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleSelectionCleared)

    return () => {
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared', handleSelectionCleared)
    }
  }, [mounted, setSelectedObjects])

  // Subscribe to label events
  useEffect(() => {
    if (!mounted) return
    return subscribeLabelEvents(() => {
      // Forward label events to parent if needed
    })
  }, [mounted])

  return (
    <div ref={containerRef} className={styles.canvasSection}>
      <div className={styles.imagePanel}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
