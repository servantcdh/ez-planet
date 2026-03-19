import { useState } from 'react'
import {
  CosmosCanvas,
  type PlanetConfig,
  type OrbitConfig,
  type TutorialStep,
  type CosmosNavigateEvent,
  type CosmosView,
} from '@servantcdh/ez-planet-cosmos'
import '@servantcdh/ez-planet-cosmos/dist/style.css'
import '@xyflow/react/dist/style.css'

// ─── Sample Planets ───

const planets: PlanetConfig[] = [
  {
    id: 'terra',
    label: 'Terra',
    subtitle: 'Dataset',
    color: '#3498db',
    x: 200,
    y: 300,
    status: 'success',
    satellites: [
      { id: 'upload', label: 'Upload', icon: '📤', route: '/data/upload', summary: { total: 1240 } },
      { id: 'browse', label: 'Browse', icon: '🔍', route: '/data/browse', summary: { total: 890 } },
      { id: 'preprocess', label: 'Preprocess', icon: '⚙️', route: '/data/preprocess' },
    ],
  },
  {
    id: 'iris',
    label: 'Iris',
    subtitle: 'Labeling',
    color: '#9b59b6',
    x: 450,
    y: 150,
    status: 'running',
    satellites: [
      { id: 'workspace', label: 'Workspace', icon: '🏷️', route: '/labeling/workspace', summary: { total: 500, running: 12 } },
      { id: 'review', label: 'Review', icon: '✅', route: '/labeling/review' },
    ],
  },
  {
    id: 'nova',
    label: 'Nova',
    subtitle: 'Model',
    color: '#e74c3c',
    x: 750,
    y: 300,
    satellites: [
      { id: 'train', label: 'Training', icon: '🧠', route: '/model/train', summary: { total: 24, running: 2, failed: 1 } },
      { id: 'evaluate', label: 'Evaluate', icon: '📊', route: '/model/evaluate' },
      { id: 'deploy', label: 'Deploy', icon: '🚀', route: '/model/deploy' },
    ],
  },
  {
    id: 'orbit',
    label: 'Orbit',
    subtitle: 'Pipeline',
    color: '#f39c12',
    x: 500,
    y: 480,
    status: 'idle',
    satellites: [
      { id: 'scheduler', label: 'Scheduler', icon: '📅', route: '/pipeline/scheduler' },
      { id: 'monitor', label: 'Monitor', icon: '📈', route: '/pipeline/monitor' },
    ],
  },
]

const orbits: OrbitConfig[] = [
  { source: 'terra', target: 'iris', label: 'Dataset → Labeling' },
  { source: 'iris', target: 'nova', label: 'Labeled → Training' },
  { source: 'nova', target: 'orbit', label: 'Model → Pipeline' },
  { source: 'orbit', target: 'terra', label: 'Feedback Loop' },
]

// ─── Tutorial ───

const tutorialSteps: TutorialStep[] = [
  {
    planetId: 'terra',
    title: 'Terra - Dataset',
    description: '데이터셋을 업로드하고 관리하는 곳입니다. 이미지, 텍스트, 비디오 등 다양한 데이터를 지원합니다.',
    chipText: 'Step 1',
    chipColor: '#3498db',
  },
  {
    planetId: 'iris',
    title: 'Iris - Labeling',
    description: '데이터에 라벨을 부여하는 워크스페이스입니다. AI 어시스트 라벨링을 지원합니다.',
    chipText: 'Step 2',
    chipColor: '#9b59b6',
  },
  {
    planetId: 'nova',
    title: 'Nova - Model',
    description: '라벨링된 데이터로 모델을 학습하고 평가합니다. AutoML과 커스텀 학습을 지원합니다.',
    chipText: 'Step 3',
    chipColor: '#e74c3c',
  },
  {
    planetId: 'orbit',
    title: 'Orbit - Pipeline',
    description: '학습된 모델을 자동화 파이프라인으로 운영합니다. 스케줄링과 모니터링을 제공합니다.',
    chipText: 'Step 4',
    chipColor: '#f39c12',
  },
]

// ─── TopBar ───

function TopBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>EZ Planet</span>
        <span style={{ fontSize: 13, opacity: 0.6 }}>MLOps Platform</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => setShowTutorial(true)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#e2e8f0',
            padding: '6px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Tutorial
        </button>
        <span style={{ fontSize: 14 }}>admin@ez-planet.io</span>
      </div>
    </div>
  )
}

// workaround: TopBar needs setShowTutorial from parent scope
let setShowTutorial: (v: boolean) => void = () => {}

// ─── App ───

export default function App() {
  const [showTutorialState, setShowTutorialState] = useState(true)
  const [view, setView] = useState<CosmosView>({ mode: 'universe' })
  setShowTutorial = setShowTutorialState

  const handleSatelliteClick = (event: CosmosNavigateEvent) => {
    const route = event.satellite?.route
    console.log('Navigate to:', route ?? event.satelliteId)
    alert(`Navigate to: ${route ?? event.satelliteId}`)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CosmosCanvas
        planets={planets}
        orbits={orbits}
        topBar={<TopBar />}
        starField={{
          starCount: 2000,
          nebulaCount: 500,
          rotationSpeed: 0.0003,
        }}
        tutorialSteps={tutorialSteps}
        showTutorial={showTutorialState}
        onTutorialComplete={() => {
          setShowTutorialState(false)
          console.log('Tutorial completed!')
        }}
        onPlanetClick={(planet) => {
          console.log('Planet clicked:', planet.label)
        }}
        onPlanetEnter={(planet) => {
          console.log('Entering planet:', planet.label)
        }}
        onPlanetExit={() => {
          console.log('Exited planet')
        }}
        onSatelliteClick={handleSatelliteClick}
        onViewChange={setView}
        theme={{
          background: '#0a0a1a',
          textColor: '#e2e8f0',
          panelBackground: 'rgba(15, 15, 35, 0.95)',
          panelBorder: 'rgba(255, 255, 255, 0.08)',
          fontFamily: "'Pretendard', system-ui, sans-serif",
        }}
      />
    </div>
  )
}
