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

// ─── 13 Planets (matching ez-planet) ───

const planets: PlanetConfig[] = [
  // ── MLOps Lifecycle ──
  {
    id: 'nebula', label: 'Nebula', subtitle: 'Content', color: '#9b59b6', x: 100, y: 300,
    satellites: [
      { id: 'content-upload', label: 'Upload', route: '/material/content/upload', icon: '📤' },
      { id: 'content-management', label: 'Management', route: '/material/content/management', icon: '📁' },
      { id: 'content-preprocess', label: 'Preprocess', route: '/material/content/preprocess', icon: '⚙️' },
    ],
  },
  {
    id: 'terra', label: 'Terra', subtitle: 'Dataset', color: '#27ae60', x: 350, y: 200,
    satellites: [
      { id: 'dataset-management', label: 'Management', route: '/material/dataset/management', icon: '🗃️' },
      { id: 'dataset-upload', label: 'Upload / Metadata', route: '/material/dataset/upload', icon: '📋' },
    ],
  },
  {
    id: 'atlas', label: 'Atlas', subtitle: 'Labeling', color: '#3498db', x: 350, y: 420,
    satellites: [
      { id: 'labeling-policy', label: 'Policy', route: '/material/labeling/policy', icon: '📐' },
      { id: 'labeling-labeling', label: 'Labeling', route: '/material/labeling/labeling', icon: '🏷️' },
      { id: 'labeling-validation', label: 'Validation', route: '/material/labeling/validation', icon: '✅' },
    ],
  },
  {
    id: 'nova', label: 'Nova', subtitle: 'Model', color: '#e74c3c', x: 650, y: 310,
    satellites: [
      { id: 'model-management', label: 'Management', route: '/ml/model/management', icon: '🧠' },
      { id: 'model-version', label: 'Versions', route: '/ml/model/management', icon: '🔖' },
    ],
  },
  {
    id: 'forge', label: 'Forge', subtitle: 'Training', color: '#f39c12', x: 900, y: 180,
    satellites: [
      { id: 'training-set', label: 'Training Sets', route: '/ml/training/training-set', icon: '📦' },
      { id: 'training-augmentation', label: 'Augmentation', route: '/ml/training/augmentation', icon: '🔄' },
      { id: 'training-perform', label: 'Perform', route: '/ml/training/perform', icon: '🚀' },
      { id: 'training-analysis', label: 'Result Analysis', route: '/ml/training/result-analysis', icon: '📊' },
    ],
  },
  {
    id: 'prism', label: 'Prism', subtitle: 'Test', color: '#1abc9c', x: 900, y: 440,
    satellites: [
      { id: 'test-set', label: 'Test Sets', route: '/ml/test/test-set', icon: '🧪' },
      { id: 'test-perform', label: 'Perform', route: '/ml/test/perform', icon: '▶️' },
      { id: 'test-analysis', label: 'Result Analysis', route: '/ml/test/result-analysis', icon: '📈' },
    ],
  },
  {
    id: 'orbit', label: 'Orbit', subtitle: 'Pipeline', color: '#95a5a6', x: 1200, y: 310,
    satellites: [
      { id: 'pipeline-template', label: 'Templates', route: '/ecosystem/pipeline/pipeline-template', icon: '📝' },
      { id: 'pipeline-instance', label: 'Instances', route: '/ecosystem/pipeline/pipeline-instance', icon: '🔗' },
      { id: 'pipeline-workflow', label: 'Workflow', route: '/ecosystem/pipeline/workflow-template', icon: '🔀' },
      { id: 'pipeline-perform', label: 'Perform', route: '/ecosystem/pipeline/perform', icon: '⚡' },
    ],
  },
  {
    id: 'chrono', label: 'Chrono', subtitle: 'Schedule', color: '#8e44ad', x: 1200, y: 500,
    satellites: [
      { id: 'schedule', label: 'Schedules', route: '/ecosystem/schedule/schedule', icon: '⏰' },
    ],
  },
  {
    id: 'pulse', label: 'Pulse', subtitle: 'Metric / Alert', color: '#e67e22', x: 1450, y: 200,
    satellites: [
      { id: 'metric-management', label: 'Metrics', route: '/ecosystem/metric/management', icon: '📉' },
      { id: 'metric-resource', label: 'Resources', route: '/ecosystem/metric/resource', icon: '💻' },
      { id: 'alert-subscriber', label: 'Alert Subscribers', route: '/ecosystem/alert/subscriber', icon: '🔔' },
    ],
  },
  {
    id: 'beacon', label: 'Beacon', subtitle: 'Provision', color: '#f1c40f', x: 1450, y: 420,
    satellites: [
      { id: 'provision-model', label: 'Model Deploy', route: '/ecosystem/provision/model', icon: '🚢' },
    ],
  },
  {
    id: 'nexus', label: 'Nexus', subtitle: 'Report', color: '#34495e', x: 1650, y: 310,
    satellites: [
      { id: 'report-management', label: 'Reports', route: '/ecosystem/report/management', icon: '📄' },
    ],
  },
  // ── Support ──
  {
    id: 'gateway', label: 'Gateway', subtitle: 'Member / Auth', color: '#bdc3c7', x: 100, y: 600,
    satellites: [
      { id: 'member-user', label: 'Users', route: '/member/user/user', icon: '👤' },
      { id: 'member-group', label: 'Groups', route: '/member/user/group', icon: '👥' },
      { id: 'member-org', label: 'Organization', route: '/member/user/organization', icon: '🏢' },
      { id: 'member-account', label: 'Accounts', route: '/member/account/account', icon: '🔑' },
      { id: 'member-zone', label: 'Zones', route: '/member/account/zone', icon: '🌐' },
      { id: 'member-permission', label: 'Permissions', route: '/member/permission/permission', icon: '🛡️' },
    ],
  },
  {
    id: 'vault', label: 'Vault', subtitle: 'Finance', color: '#f1c40f', x: 350, y: 600,
    satellites: [
      { id: 'finance-point', label: 'Point', route: '/finance/payment/point', icon: '💰' },
      { id: 'finance-coupon', label: 'Coupon', route: '/finance/payment/coupon', icon: '🎟️' },
    ],
  },
]

// ─── Data Flow Orbits (15 connections) ───

const orbits: OrbitConfig[] = [
  { source: 'nebula', target: 'terra', label: 'Upload → Dataset' },
  { source: 'nebula', target: 'atlas', label: 'Upload → Labeling' },
  { source: 'terra', target: 'nova', label: 'Dataset → Model' },
  { source: 'atlas', target: 'nova', label: 'Labeled → Model' },
  { source: 'nova', target: 'forge', label: 'Model → Training' },
  { source: 'nova', target: 'prism', label: 'Model → Test' },
  { source: 'forge', target: 'prism', label: 'Trained → Test' },
  { source: 'forge', target: 'orbit', label: 'Training → Pipeline' },
  { source: 'prism', target: 'orbit', label: 'Test → Pipeline' },
  { source: 'orbit', target: 'chrono', label: 'Pipeline → Schedule' },
  { source: 'orbit', target: 'beacon', label: 'Pipeline → Deploy' },
  { source: 'beacon', target: 'pulse', label: 'Deploy → Monitor' },
  { source: 'pulse', target: 'nexus', label: 'Monitor → Report' },
  { source: 'gateway', target: 'nebula', label: 'Auth → Access' },
  { source: 'vault', target: 'gateway', label: 'Billing → Account' },
]

// ─── Tutorial (13 steps = 11 phases + 2 support) ───

const tutorialSteps: TutorialStep[] = [
  {
    planetId: 'nebula',
    title: 'Nebula — 원본 데이터 수집과 전처리',
    description: 'MLOps의 시작점입니다. 이미지, 영상, 텍스트 등 원본 데이터를 업로드하고 전처리하여 학습에 사용할 수 있는 상태로 준비합니다.',
    chipText: 'Phase 1',
    chipColor: '#9b59b6',
  },
  {
    planetId: 'terra',
    title: 'Terra — 데이터셋 구성과 분할',
    description: '업로드된 콘텐츠를 목적에 맞는 데이터셋으로 구성합니다. 메타데이터를 부여하고 학습/검증/테스트 세트로 분할합니다.',
    chipText: 'Phase 2',
    chipColor: '#27ae60',
  },
  {
    planetId: 'atlas',
    title: 'Atlas — 데이터 라벨링과 어노테이션',
    description: '데이터에 라벨(정답)을 부여하는 어노테이션 작업을 수행합니다. 라벨링 정책 설정부터 작업, 검수까지 전체 라벨링 파이프라인을 관리합니다.',
    chipText: 'Phase 3',
    chipColor: '#3498db',
  },
  {
    planetId: 'nova',
    title: 'Nova — AI 모델 등록과 버전 관리',
    description: 'AI 모델의 중심지입니다. 모델을 등록하고 버전을 관리합니다. 데이터셋과 라벨링 결과를 결합하여 학습 준비를 완료합니다.',
    chipText: 'Phase 4',
    chipColor: '#e74c3c',
  },
  {
    planetId: 'forge',
    title: 'Forge — 모델 학습과 결과 분석',
    description: '모델 학습의 용광로입니다. 트레이닝 세트 구성, 데이터 증강, 학습 수행, 결과 분석까지 학습의 전 과정을 다룹니다.',
    chipText: 'Phase 5',
    chipColor: '#f39c12',
  },
  {
    planetId: 'prism',
    title: 'Prism — 모델 성능 검증과 테스트',
    description: '학습된 모델의 성능을 검증합니다. 테스트 세트를 구성하고 테스트를 수행한 뒤, 정확도·재현율 등 지표를 분석합니다.',
    chipText: 'Phase 6',
    chipColor: '#1abc9c',
  },
  {
    planetId: 'orbit',
    title: 'Orbit — MLOps 파이프라인 자동화',
    description: 'MLOps 자동화의 핵심입니다. 학습→테스트→배포를 하나의 워크플로우로 연결하는 파이프라인 템플릿을 설계하고 실행합니다.',
    chipText: 'Phase 7',
    chipColor: '#95a5a6',
  },
  {
    planetId: 'chrono',
    title: 'Chrono — 자동 실행 스케줄링',
    description: '파이프라인의 자동 실행 스케줄을 관리합니다. Cron 기반으로 주기적 재학습, 정기 테스트 등을 예약할 수 있습니다.',
    chipText: 'Phase 8',
    chipColor: '#8e44ad',
  },
  {
    planetId: 'beacon',
    title: 'Beacon — 모델 배포와 프로비저닝',
    description: '검증된 모델을 실제 서비스 환경에 배포합니다. 컨테이너 이미지 빌드부터 서빙 인프라 프로비저닝까지 배포 전 과정을 관리합니다.',
    chipText: 'Phase 9',
    chipColor: '#f1c40f',
  },
  {
    planetId: 'pulse',
    title: 'Pulse — 실시간 모니터링과 알림',
    description: '배포된 모델과 인프라의 상태를 실시간으로 모니터링합니다. 메트릭 수집, 리소스 사용량 추적, 이상 징후 시 알림을 발송합니다.',
    chipText: 'Phase 10',
    chipColor: '#e67e22',
  },
  {
    planetId: 'nexus',
    title: 'Nexus — 종합 리포트 생성',
    description: 'MLOps 전체 라이프사이클의 결과를 종합하여 리포트로 생성합니다. 학습 이력, 배포 상태, 모니터링 결과를 한눈에 확인합니다.',
    chipText: 'Phase 11',
    chipColor: '#34495e',
  },
  {
    planetId: 'gateway',
    title: 'Gateway — 사용자 인증과 권한 관리',
    description: '사용자, 조직, 권한을 관리하는 인증/인가 영역입니다. 모든 기능에 대한 접근 권한을 제어하고, 팀 협업 환경을 구성합니다.',
    chipText: 'Support',
    chipColor: '#bdc3c7',
  },
  {
    planetId: 'vault',
    title: 'Vault — 과금과 결제 관리',
    description: '과금, 포인트, 쿠폰 등 결제와 빌링을 관리하는 영역입니다. GPU 사용량 기반 과금, 포인트 충전/차감 등을 처리합니다.',
    chipText: 'Support',
    chipColor: '#f1c40f',
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
