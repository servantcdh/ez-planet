# @servantcdh/ez-planet-labeling

Fabric.js v6 기반의 이미지 라벨링 워크스페이스 라이브러리.

3-Level API로 유연한 통합을 지원합니다.

[![StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/servantcdh/ez-planet/tree/master/examples/labeling-demo?file=src/App.tsx)

## 설치

```bash
npm install @servantcdh/ez-planet-labeling
```

## Dependencies

### Peer Dependencies (호스트 앱에서 설치)

| Package | Version | 용도 |
|---------|---------|------|
| `react` | `^18.0.0` | UI 런타임 |
| `react-dom` | `^18.0.0` | DOM 렌더링 |
| `fabric` | `^6.0.0` | 캔버스 엔진 |

### Bundled Dependencies (라이브러리에 포함)

| Package | 용도 |
|---------|------|
| `zustand` | 내부 상태 관리 (호스트 앱 store와 격리) |
| `zundo` | Temporal history (Undo/Redo) |
| `@erase2d/fabric` | Fabric v6 EraserBrush 대체 |

## 3-Level API

### Level 1 — All-in-one

단일 컴포넌트로 완성된 라벨링 워크스페이스를 렌더링합니다.

```tsx
import { LabelingWorkspace } from '@servantcdh/ez-planet-labeling'
import '@servantcdh/ez-planet-labeling/dist/style.css'

<LabelingWorkspace
  image={{ url: '/sample.png', width: 1920, height: 1080 }}
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

### Level 2 — Composable

Provider와 개별 컴포넌트를 조합하여 커스텀 레이아웃을 구성합니다.

```tsx
import {
  LabelingProvider,
  LabelingCanvas,
  LabelingToolbar,
  LabelingNavigation,
  LabelingInfoPanel,
} from '@servantcdh/ez-planet-labeling'
import '@servantcdh/ez-planet-labeling/dist/style.css'

<LabelingProvider image={image} annotations={annotations} onChange={onChange} ...>
  <LabelingNavigation records={records} activeRecordId={id} onRecordSelect={onSelect} />
  <LabelingCanvas image={image} annotations={annotations} onChange={onChange} />
  <LabelingToolbar tools={['selection', 'brush', 'eraser']} />
  <LabelingInfoPanel classes={classes} annotations={annotations} />
</LabelingProvider>
```

### Level 3 — Headless Hooks

UI 없이 캔버스 로직만 사용합니다.

```tsx
import {
  useLabelingTools,
  useLabelingCanvas,
  useLabelingHistory,
} from '@servantcdh/ez-planet-labeling'

const { activeToolId, setTool, colorCode, setColorCode } = useLabelingTools()
const { addAnnotation, removeAnnotation, exportState } = useLabelingCanvas()
const { canUndo, canRedo, undo, redo } = useLabelingHistory()
```

## Props Reference

### LabelingWorkspaceProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `image` | `string \| { url, width, height }` | Yes | 라벨링 대상 이미지 |
| `annotations` | `Annotation[]` | Yes | 현재 어노테이션 목록 |
| `onChange` | `(event: CanvasChangeEvent) => void` | Yes | 어노테이션 변경 콜백 |
| `records` | `WorkspaceRecord[]` | Yes | 레코드 목록 (Navigation) |
| `activeRecordId` | `string` | Yes | 현재 활성 레코드 ID |
| `onRecordSelect` | `(record: WorkspaceRecord) => void` | Yes | 레코드 선택 콜백 |
| `classes` | `LabelingClass[]` | Yes | 라벨 클래스 목록 |
| `onSave` | `(state: CanvasState) => void` | Yes | 저장 콜백 |
| `tools` | `ToolType[]` | No | 사용할 도구 목록 |
| `mode` | `'labeling' \| 'validation' \| 'readonly'` | No | 워크스페이스 모드 |
| `theme` | `Partial<LabelingTheme>` | No | 테마 커스터마이징 |
| `layout` | `WorkspaceLayout` | No | 레이아웃 설정 |
| `extensions` | `LabelingExtension[]` | No | 확장 기능 |
| `validationResults` | `ValidationResult[]` | No | 검증 결과 (validation 모드) |
| `indicator` | `WorkspaceIndicator` | No | 진행 표시기 |

### Annotation

```ts
interface Annotation {
  id: string                          // 호스트 앱에서 자유롭게 할당 (DB PK, UUID 등)
  type: AnnotationType                // 'box' | 'segmentation' | 'polygon' | 'brush' | ...
  label: { name: string; index: number }
  style: { color: string; opacity: number; lineColor?: string; lineWidth?: number }
  geometry: AnnotationGeometry | null // BoxGeometry | PolygonGeometry | ...
}
```

## 주요 기능

- **도구**: Selection, Bounding Box, Polygon, Brush, Eraser, Magic Brush, Superpixel
- **Extension System**: `ToolExtension`으로 커스텀 도구 등록 (SAM, AutoLabeling 등)
- **Validation Mode**: `mode="validation"`으로 검증 워크플로우 지원
- **SSR Safe**: `loadFabric()` 비동기 동적 import로 Next.js 호환
- **CSS Modules**: `lc-` prefix 스코핑, CSS 변수 기반 theming
- **Undo/Redo**: zundo 기반 temporal history

## Extension System

```tsx
import type { ToolExtension } from '@servantcdh/ez-planet-labeling'

const samExtension: ToolExtension = {
  id: 'sam-tool',
  slot: 'tool',
  icon: <SAMIcon />,
  label: 'SAM',
  shortcut: 'S',
  canvasHandlers: {
    onMouseDown: (e) => { /* SAM point prompt */ },
    onMouseUp: (e) => { /* Generate mask */ },
  },
  render: (ctx) => <SAMPanel context={ctx} />,
}

<LabelingWorkspace extensions={[samExtension]} ... />
```

## Theming

```tsx
<LabelingWorkspace
  theme={{
    primary: '#3b82f6',
    background: '#1a1a2e',
    surface: '#16213e',
    border: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    fontFamily: 'Pretendard, sans-serif',
    radius: 8,
  }}
  ...
/>
```

## License

MIT
