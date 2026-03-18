# ez-planet-canvas

MLOps 플랫폼을 위한 재사용 가능한 캔버스 라이브러리 모노레포.

| Package | Description | Size (gzip) |
|---------|-------------|-------------|
| [`@ez-planet/labeling-canvas`](#labeling-canvas) | Fabric.js v6 기반 이미지 라벨링 워크스페이스 | JS 22.6KB, CSS 3.0KB |
| [`@ez-planet/cosmos-canvas`](#cosmos-canvas) | ReactFlow + Three.js 코스모스 시각화 | JS 8.0KB, CSS 2.0KB |

## Quick Start

```bash
# 전체 빌드
npm install
npm run build

# 개별 빌드
npm run build:labeling
npm run build:cosmos
```

---

## labeling-canvas

Fabric.js v6 기반의 이미지 라벨링 라이브러리. 3-Level API로 유연한 통합을 지원합니다.

### 설치

```bash
npm install @ez-planet/labeling-canvas
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | `^18.0.0` |
| `react-dom` | `^18.0.0` |
| `fabric` | `^6.0.0` |

### Bundled Dependencies

| Package | 용도 |
|---------|------|
| `zustand` | 내부 상태 관리 (호스트 앱 store와 격리) |
| `zundo` | temporal history (undo/redo) |
| `@erase2d/fabric` | Fabric v6 EraserBrush 대체 |

### 3-Level API

**Level 1 — All-in-one**

```tsx
import { LabelingWorkspace } from '@ez-planet/labeling-canvas'

<LabelingWorkspace
  image={{ url: '/img.png', width: 1920, height: 1080 }}
  annotations={annotations}
  onChange={(e) => setAnnotations(e.annotations)}
  records={records}
  activeRecordId={currentId}
  onRecordSelect={handleSelect}
  classes={classes}
  onSave={handleSave}
  tools={['selection', 'blankRect', 'polygon', 'brush', 'eraser']}
  mode="labeling"
/>
```

**Level 2 — Composable**

```tsx
import {
  LabelingProvider,
  LabelingCanvas,
  LabelingToolbar,
  LabelingNavigation,
  LabelingInfoPanel,
} from '@ez-planet/labeling-canvas'

<LabelingProvider image={image} annotations={annotations} onChange={onChange} ...>
  <LabelingNavigation records={records} activeRecordId={id} onRecordSelect={onSelect} />
  <LabelingCanvas image={image} annotations={annotations} onChange={onChange} />
  <LabelingToolbar tools={['selection', 'brush', 'eraser']} />
  <LabelingInfoPanel classes={classes} annotations={annotations} />
</LabelingProvider>
```

**Level 3 — Headless Hooks**

```tsx
import {
  useLabelingTools,
  useLabelingCanvas,
  useLabelingHistory,
} from '@ez-planet/labeling-canvas'

const { activeToolId, setTool, colorCode, setColorCode } = useLabelingTools()
const { addAnnotation, removeAnnotation, exportState } = useLabelingCanvas()
const { canUndo, canRedo, undo, redo } = useLabelingHistory()
```

### 주요 기능

- **도구**: Selection, Bounding Box, Polygon, Brush, Eraser, Magic Brush, Superpixel
- **Extension System**: `ToolExtension`으로 커스텀 도구 등록 (SAM, AutoLabeling 등)
- **Validation Mode**: `mode="validation"`으로 검증 워크플로우 지원
- **SSR Safe**: `loadFabric()` 비동기 동적 import로 Next.js 호환
- **CSS Modules**: `lc-` prefix 스코핑, CSS 변수 기반 theming

---

## cosmos-canvas

ReactFlow + Three.js 기반의 코스모스(우주) 스타일 플랫폼 시각화 라이브러리.

### 설치

```bash
npm install @ez-planet/cosmos-canvas
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | `^18.0.0` |
| `react-dom` | `^18.0.0` |
| `@xyflow/react` | `^12.0.0` |
| `@react-three/fiber` | `^8.0.0` |
| `@react-three/drei` | `^9.0.0` |
| `three` | `>=0.160.0` |
| `framer-motion` | `^11.0.0` |

### Bundled Dependencies

| Package | 용도 |
|---------|------|
| `zustand` | 내부 상태 관리 |

### 사용법

```tsx
import { CosmosCanvas } from '@ez-planet/cosmos-canvas'
import type { PlanetConfig, OrbitConfig, TutorialStep } from '@ez-planet/cosmos-canvas'

const planets: PlanetConfig[] = [
  {
    id: 'nova', label: 'Nova', subtitle: 'Model',
    color: '#e74c3c', x: 650, y: 310,
    satellites: [
      { id: 'model-mgmt', label: 'Management', icon: '🧠', route: '/model/management' },
    ],
  },
  // ...
]

const orbits: OrbitConfig[] = [
  { source: 'terra', target: 'nova', label: 'Dataset → Model' },
  // ...
]

<CosmosCanvas
  planets={planets}
  orbits={orbits}
  topBar={<MyTopBar />}
  starField={{ starCount: 2000, nebulaCount: 500 }}
  tutorialSteps={tutorialSteps}
  showTutorial={isFirstVisit}
  onTutorialComplete={() => markTutorialDone()}
  onPlanetClick={(planet) => console.log('Inspect:', planet.id)}
  onPlanetEnter={(planet) => console.log('Enter:', planet.id)}
  onSatelliteClick={({ satellite }) => router.push(satellite?.route ?? '/')}
  renderPlanetInterior={(planet, onExit) => (
    <MyCustomInterior planet={planet} onBack={onExit} />
  )}
/>
```

### 주요 기능

- **StarField**: Three.js 2000개 별 + 500개 성운 파티클 배경
- **PlanetNode**: 상태별 글로우/펄스 효과 (`idle`, `running`, `error`, `success`)
- **OrbitEdge**: 베지어 궤도 + 글로우 레이어 + 대시 애니메이션
- **SidePanel**: 행성 클릭 시 위성 목록 슬라이드 패널
- **PlanetInterior**: 행성 내부 뷰 (원형 위성 배치) 또는 `renderPlanetInterior` 커스텀 렌더
- **ZoomTransition**: 행성 진입 시 줌인 애니메이션
- **CosmosTutorial**: 온보딩 시스템 (welcome → stepping → complete)
- **TopBar Slot**: `topBar` prop으로 호스트 앱의 네비게이션 바 주입
- **Custom Node/Edge**: `nodeTypes`, `edgeTypes` prop으로 커스텀 ReactFlow 노드/엣지 등록

---

## 프로젝트 구조

```
ez-planet-canvas/
├── packages/
│   ├── labeling-canvas/          # @ez-planet/labeling-canvas
│   │   ├── src/
│   │   │   ├── canvas/           # Fabric.js 코어, 도구, 시리얼라이저
│   │   │   ├── components/       # React 컴포넌트 (Level 1, 2)
│   │   │   ├── hooks/            # Headless hooks (Level 3)
│   │   │   ├── extensions/       # Extension 시스템
│   │   │   ├── store/            # Zustand 스토어
│   │   │   ├── styles/           # CSS Modules
│   │   │   └── types/            # Public + Internal 타입
│   │   └── vite.config.ts
│   └── cosmos-canvas/            # @ez-planet/cosmos-canvas
│       ├── src/
│       │   ├── components/       # CosmosCanvas, PlanetNode, StarField 등
│       │   ├── styles/           # CSS Modules
│       │   └── types/            # Public 타입
│       └── vite.config.ts
├── tsconfig.base.json
└── package.json                  # npm workspaces root
```

## 개발

```bash
# 의존성 설치
npm install

# 전체 빌드
npm run build

# 타입 체크
npm run typecheck

# 빌드 산출물 정리
npm run clean
```

## 요구사항

- Node.js >= 18.0.0
- TypeScript >= 5.5

## License

MIT
