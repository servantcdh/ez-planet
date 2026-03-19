# @servantcdh/ez-planet-cosmos

ReactFlow + Three.js 기반의 코스모스(우주) 스타일 플랫폼 시각화 라이브러리.

행성(Planet), 궤도(Orbit), 위성(Satellite) 메타포로 MLOps 파이프라인을 시각화합니다.

[![StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/servantcdh/ez-planet/tree/master/examples/cosmos-demo?file=src/App.tsx)

## 설치

```bash
npm install @servantcdh/ez-planet-cosmos
```

## Dependencies

### Peer Dependencies (호스트 앱에서 설치)

| Package | Version | 용도 |
|---------|---------|------|
| `react` | `^18.0.0` | UI 런타임 |
| `react-dom` | `^18.0.0` | DOM 렌더링 |
| `@xyflow/react` | `^12.0.0` | 그래프 시각화 |
| `@react-three/fiber` | `^8.0.0` | Three.js React 바인딩 |
| `@react-three/drei` | `^9.0.0` | Three.js 유틸리티 |
| `three` | `>=0.160.0` | 3D 렌더링 (StarField) |
| `framer-motion` | `^11.0.0` | 애니메이션 |

### Bundled Dependencies (라이브러리에 포함)

| Package | 용도 |
|---------|------|
| `zustand` | 내부 상태 관리 |

## Quick Start

```tsx
import { CosmosCanvas } from '@servantcdh/ez-planet-cosmos'
import type { PlanetConfig, OrbitConfig } from '@servantcdh/ez-planet-cosmos'
import '@servantcdh/ez-planet-cosmos/dist/style.css'
import '@xyflow/react/dist/style.css'

const planets: PlanetConfig[] = [
  {
    id: 'terra',
    label: 'Terra',
    subtitle: 'Dataset',
    color: '#3498db',
    x: 200, y: 300,
    satellites: [
      { id: 'upload', label: 'Upload', icon: '📤', route: '/data/upload' },
      { id: 'browse', label: 'Browse', icon: '🔍', route: '/data/browse' },
    ],
  },
  {
    id: 'nova',
    label: 'Nova',
    subtitle: 'Model',
    color: '#e74c3c',
    x: 650, y: 310,
    satellites: [
      { id: 'train', label: 'Training', icon: '🧠', route: '/model/train' },
    ],
  },
]

const orbits: OrbitConfig[] = [
  { source: 'terra', target: 'nova', label: 'Dataset → Model' },
]

function App() {
  return (
    <CosmosCanvas
      planets={planets}
      orbits={orbits}
      topBar={<MyTopBar />}
      onPlanetClick={(planet) => console.log('Click:', planet.id)}
      onPlanetEnter={(planet) => console.log('Enter:', planet.id)}
      onSatelliteClick={({ satellite }) => {
        if (satellite?.route) router.push(satellite.route)
      }}
    />
  )
}
```

## Props Reference

### CosmosCanvasProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `planets` | `PlanetConfig[]` | Yes | 행성 목록 |
| `orbits` | `OrbitConfig[]` | Yes | 궤도(연결선) 목록 |
| `onPlanetClick` | `(planet: PlanetConfig) => void` | No | 행성 클릭 (사이드패널 열기) |
| `onPlanetEnter` | `(planet: PlanetConfig) => void` | No | 행성 더블클릭 (내부 진입) |
| `onPlanetExit` | `() => void` | No | 행성 내부에서 나가기 |
| `onSatelliteClick` | `(event: CosmosNavigateEvent) => void` | No | 위성 클릭 (라우팅) |
| `topBar` | `ReactNode` | No | 상단 슬롯 (호스트 앱 네비게이션 바) |
| `starField` | `boolean \| StarFieldConfig` | No | Three.js 별 배경 (기본: `true`) |
| `theme` | `Partial<CosmosTheme>` | No | 테마 커스터마이징 |
| `tutorialSteps` | `TutorialStep[]` | No | 온보딩 튜토리얼 단계 |
| `showTutorial` | `boolean` | No | 튜토리얼 표시 여부 |
| `onTutorialComplete` | `() => void` | No | 튜토리얼 완료 콜백 |
| `initialView` | `CosmosView` | No | 초기 뷰 상태 |
| `onViewChange` | `(view: CosmosView) => void` | No | 뷰 상태 변경 콜백 |
| `renderPlanetInterior` | `(planet, onExit) => ReactNode` | No | 행성 내부 커스텀 렌더 |
| `nodeTypes` | `Record<string, ComponentType>` | No | 커스텀 ReactFlow 노드 타입 |
| `edgeTypes` | `Record<string, ComponentType>` | No | 커스텀 ReactFlow 엣지 타입 |

### PlanetConfig

```ts
interface PlanetConfig {
  id: string
  label: string
  subtitle: string
  color: string             // 행성 색상 (radial gradient, glow)
  x: number                 // ReactFlow 위치
  y: number
  satellites: Satellite[]   // 위성 (서브메뉴)
  status?: PlanetStatus     // 'idle' | 'running' | 'error' | 'success' | 'disabled'
  icon?: ReactNode
  meta?: Record<string, unknown>
}
```

### Satellite

```ts
interface Satellite {
  id: string
  label: string
  route?: string            // 클릭 시 라우팅 경로
  icon?: string | ReactNode
  summary?: { total?: number; running?: number; failed?: number }
  quickActions?: Array<{ label: string; action: string }>
}
```

## 주요 기능

### StarField

Three.js 기반 우주 배경. 2000개 별 + 500개 성운 파티클.

```tsx
<CosmosCanvas
  starField={{ starCount: 3000, nebulaCount: 800, rotationSpeed: 0.0005 }}
  ...
/>
```

### PlanetNode

상태별 시각 효과:
- `idle` — 기본 글로우
- `running` — 펄스 애니메이션
- `error` — 빨간 글로우
- `success` — 초록 글로우
- `disabled` — 회색 디밍

### SidePanel

행성 클릭 시 슬라이드-인 패널. 위성 목록, 요약 통계, Enter 버튼.

### PlanetInterior

행성 더블클릭 시 줌인 + 내부 뷰. 원형 위성 배치. `renderPlanetInterior`로 커스터마이징 가능.

### Tutorial System

3단계 온보딩: Welcome → Stepping (키보드/클릭) → Complete.

```tsx
const tutorialSteps: TutorialStep[] = [
  { planetId: 'terra', title: 'Dataset', description: '데이터를 관리합니다.' },
  { planetId: 'nova', title: 'Model', description: '모델을 학습합니다.' },
]

<CosmosCanvas
  tutorialSteps={tutorialSteps}
  showTutorial={isFirstVisit}
  onTutorialComplete={() => markTutorialDone()}
  ...
/>
```

### TopBar Slot

호스트 앱의 네비게이션 바를 주입합니다.

```tsx
<CosmosCanvas topBar={<MyAppTopBar user={user} onLogout={logout} />} ... />
```

## Theming

```tsx
<CosmosCanvas
  theme={{
    background: '#0a0a1a',
    textColor: '#e2e8f0',
    panelBackground: 'rgba(20, 20, 40, 0.9)',
    panelBorder: 'rgba(255, 255, 255, 0.1)',
    controlsBackground: 'rgba(20, 20, 40, 0.8)',
    fontFamily: 'Pretendard, sans-serif',
  }}
  ...
/>
```

## 개별 컴포넌트 사용

모든 하위 컴포넌트를 개별적으로 import할 수 있습니다.

```tsx
import {
  CosmosCanvas,
  PlanetNode,
  OrbitEdge,
  StarField,
  SidePanel,
  ZoomTransition,
  PlanetInterior,
  CosmosTutorial,
} from '@servantcdh/ez-planet-cosmos'
```

## License

MIT
