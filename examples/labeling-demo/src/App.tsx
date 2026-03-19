import { useState, useCallback } from 'react'
import {
  LabelingWorkspace,
  type Annotation,
  type CanvasChangeEvent,
  type CanvasState,
  type WorkspaceRecord,
  type LabelingClass,
} from '@servantcdh/ez-planet-labeling'
import '@servantcdh/ez-planet-labeling/dist/style.css'

// ─── Sample Classes ───

const sampleClasses: LabelingClass[] = [
  { id: 'cls-1', name: 'Car', color: '#e74c3c', hotkey: '1', group: 'Vehicle' },
  { id: 'cls-2', name: 'Bus', color: '#e67e22', hotkey: '2', group: 'Vehicle' },
  { id: 'cls-3', name: 'Person', color: '#3498db', hotkey: '3', group: 'Human' },
  { id: 'cls-4', name: 'Cyclist', color: '#2980b9', hotkey: '4', group: 'Human' },
  { id: 'cls-5', name: 'Tree', color: '#2ecc71', hotkey: '5', group: 'Nature' },
  { id: 'cls-6', name: 'Building', color: '#f39c12', hotkey: '6', group: 'Structure' },
  { id: 'cls-7', name: 'Road', color: '#9b59b6', hotkey: '7', group: 'Structure' },
  { id: 'cls-8', name: 'Sign', color: '#1abc9c', hotkey: '8', group: 'Object' },
  { id: 'cls-9', name: 'Light', color: '#f1c40f', hotkey: '9', group: 'Object' },
]

// ─── Sample Images (Unsplash, CORS-safe) ───

const sampleImages: Record<string, { url: string; width: number; height: number }> = {
  '1': { url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1280&h=720&fit=crop', width: 1280, height: 720 },
  '2': { url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&h=720&fit=crop', width: 1280, height: 720 },
  '3': { url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1280&h=720&fit=crop', width: 1280, height: 720 },
  '4': { url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1280&h=720&fit=crop', width: 1280, height: 720 },
  '5': { url: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1280&h=720&fit=crop', width: 1280, height: 720 },
}

// ─── Sample Records ───

const sampleRecords: WorkspaceRecord[] = [
  { id: '1', title: 'city_street_01.jpg', status: 'unlabeled', thumbnail: sampleImages['1'].url },
  { id: '2', title: 'downtown_02.jpg', status: 'labeled', thumbnail: sampleImages['2'].url },
  { id: '3', title: 'skyline_03.jpg', status: 'unlabeled', thumbnail: sampleImages['3'].url },
  { id: '4', title: 'intersection_04.jpg', status: 'validated', thumbnail: sampleImages['4'].url },
  { id: '5', title: 'highway_05.jpg', status: 'issue', thumbnail: sampleImages['5'].url },
]

// ─── Pre-existing Annotations (record '2' has labeled data) ───

const preExistingAnnotations: Record<string, Annotation[]> = {
  '1': [],
  '2': [
    {
      id: 'ann-1',
      type: 'box',
      label: { name: 'Car', index: 0 },
      style: { color: '#e74c3c', opacity: 0.6 },
      geometry: { type: 'box', x: 0.15, y: 0.4, width: 0.12, height: 0.18 },
    },
    {
      id: 'ann-2',
      type: 'box',
      label: { name: 'Car', index: 1 },
      style: { color: '#e74c3c', opacity: 0.6 },
      geometry: { type: 'box', x: 0.55, y: 0.45, width: 0.1, height: 0.15 },
    },
    {
      id: 'ann-3',
      type: 'box',
      label: { name: 'Person', index: 0 },
      style: { color: '#3498db', opacity: 0.6 },
      geometry: { type: 'box', x: 0.35, y: 0.3, width: 0.05, height: 0.2 },
    },
    {
      id: 'ann-4',
      type: 'box',
      label: { name: 'Building', index: 0 },
      style: { color: '#f39c12', opacity: 0.4 },
      geometry: { type: 'box', x: 0.0, y: 0.0, width: 0.3, height: 0.6 },
    },
    {
      id: 'ann-5',
      type: 'polygon',
      label: { name: 'Road', index: 0 },
      style: { color: '#9b59b6', opacity: 0.4 },
      geometry: {
        type: 'polygon',
        points: [
          { x: 0.0, y: 0.7 },
          { x: 1.0, y: 0.7 },
          { x: 1.0, y: 1.0 },
          { x: 0.0, y: 1.0 },
        ],
      },
    },
  ],
  '3': [],
  '4': [
    {
      id: 'ann-6',
      type: 'box',
      label: { name: 'Sign', index: 0 },
      style: { color: '#1abc9c', opacity: 0.6 },
      geometry: { type: 'box', x: 0.42, y: 0.15, width: 0.06, height: 0.1 },
    },
    {
      id: 'ann-7',
      type: 'box',
      label: { name: 'Light', index: 0 },
      style: { color: '#f1c40f', opacity: 0.6 },
      geometry: { type: 'box', x: 0.48, y: 0.08, width: 0.04, height: 0.12 },
    },
  ],
  '5': [
    {
      id: 'ann-8',
      type: 'box',
      label: { name: 'Bus', index: 0 },
      style: { color: '#e67e22', opacity: 0.6 },
      geometry: { type: 'box', x: 0.3, y: 0.35, width: 0.2, height: 0.25 },
    },
  ],
}

// ─── App ───

export default function App() {
  const [activeRecordId, setActiveRecordId] = useState('1')
  const [annotationStore, setAnnotationStore] = useState<Record<string, Annotation[]>>(preExistingAnnotations)

  const currentImage = sampleImages[activeRecordId]
  const currentAnnotations = annotationStore[activeRecordId] ?? []

  const handleChange = useCallback((event: CanvasChangeEvent) => {
    setAnnotationStore((prev) => ({
      ...prev,
      [activeRecordId]: event.annotations,
    }))
    console.log(`[${activeRecordId}] ${event.action.type}:`, event.annotations.length, 'annotations')
  }, [activeRecordId])

  const handleSave = useCallback(async (state: CanvasState) => {
    console.log('Saved:', state)
    alert(`Record ${activeRecordId}: ${state.annotations.length} annotations saved!`)
  }, [activeRecordId])

  const handleRecordSelect = useCallback((record: WorkspaceRecord) => {
    setActiveRecordId(record.id)
    console.log('Record selected:', record.title)
  }, [])

  const labeledCount = Object.values(annotationStore).filter((a) => a.length > 0).length

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <LabelingWorkspace
        image={currentImage}
        annotations={currentAnnotations}
        onChange={handleChange}
        records={sampleRecords}
        activeRecordId={activeRecordId}
        onRecordSelect={handleRecordSelect}
        classes={sampleClasses}
        onSave={handleSave}
        tools={['selection', 'blankRect', 'polygon', 'brush', 'eraser']}
        mode="labeling"
        indicator={{
          title: 'Object Detection',
          subtitle: 'Street Scene Dataset',
          progress: { current: labeledCount, total: sampleRecords.length },
        }}
      />
    </div>
  )
}
