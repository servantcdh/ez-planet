import { useState } from 'react'
import {
  LabelingWorkspace,
  type Annotation,
  type CanvasChangeEvent,
  type CanvasState,
  type WorkspaceRecord,
  type LabelingClass,
} from '@servantcdh/ez-planet-labeling'
import '@servantcdh/ez-planet-labeling/dist/style.css'

// ─── Sample Data ───

const sampleRecords: WorkspaceRecord[] = [
  { id: '1', title: 'image_001.png', status: 'unlabeled' },
  { id: '2', title: 'image_002.png', status: 'labeled' },
  { id: '3', title: 'image_003.png', status: 'unlabeled' },
  { id: '4', title: 'image_004.png', status: 'validated' },
  { id: '5', title: 'image_005.png', status: 'issue' },
]

const sampleClasses: LabelingClass[] = [
  { id: 'cls-1', name: 'Car', color: '#e74c3c', hotkey: '1' },
  { id: 'cls-2', name: 'Person', color: '#3498db', hotkey: '2' },
  { id: 'cls-3', name: 'Tree', color: '#2ecc71', hotkey: '3' },
  { id: 'cls-4', name: 'Building', color: '#f39c12', hotkey: '4' },
  { id: 'cls-5', name: 'Road', color: '#9b59b6', hotkey: '5' },
]

// Demo image (placeholder)
const sampleImage = {
  url: 'https://picsum.photos/1920/1080',
  width: 1920,
  height: 1080,
}

export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeRecordId, setActiveRecordId] = useState('1')

  const handleChange = (event: CanvasChangeEvent) => {
    setAnnotations(event.annotations)
    console.log('onChange:', event.action.type, event.annotations.length, 'annotations')
  }

  const handleSave = async (state: CanvasState) => {
    console.log('onSave:', state)
    alert(`Saved ${state.annotations.length} annotations!`)
  }

  const handleRecordSelect = (record: WorkspaceRecord) => {
    setActiveRecordId(record.id)
    setAnnotations([]) // Reset annotations for new record
    console.log('Record selected:', record.title)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <LabelingWorkspace
        image={sampleImage}
        annotations={annotations}
        onChange={handleChange}
        records={sampleRecords}
        activeRecordId={activeRecordId}
        onRecordSelect={handleRecordSelect}
        classes={sampleClasses}
        onSave={handleSave}
        tools={['selection', 'blankRect', 'polygon', 'brush', 'eraser']}
        mode="labeling"
        indicator={{
          title: 'Labeling Demo',
          subtitle: 'ez-planet-labeling',
          progress: { current: 2, total: 5 },
        }}
      />
    </div>
  )
}
