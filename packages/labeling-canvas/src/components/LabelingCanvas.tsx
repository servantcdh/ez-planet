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

  const setZoom = useZoomStore((s) => s.setZoom)
  const setObjects = useCanvasObjectsStore((s) => s.setObjects)

  // Resolve image URL and dimensions
  const imageUrl = typeof image === 'string' ? image : image.url

  // Initialize Fabric canvas
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
      setObjects(canvas.getObjects() as LabeledFabricObject[])
    }

    loadAnnotations()
  }, [annotations, mounted, imageSize.width, imageSize.height, readOnly, setObjects])

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
      setObjects(objects)
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
  }, [mounted, imageSize.width, imageSize.height, setObjects])

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
