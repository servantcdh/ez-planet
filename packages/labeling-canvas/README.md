# @servantcdh/ez-planet-labeling

Fabric.js 기반 이미지 라벨링 워크스페이스 라이브러리.

호스트 앱이 데이터와 뮤테이션을 Context로 주입하면, 라이브러리는 순수 프레젠테이션 레이어로 동작합니다. CSS는 JS 번들에 자동 주입되어 별도 import가 필요 없습니다.

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
| `fabric` | `^5.0.0` | 캔버스 엔진 |

### Bundled Dependencies (라이브러리에 포함)

| Package | 용도 |
|---------|------|
| `zustand` | 내부 상태 관리 |
| `zundo` | Undo/Redo |
| `@erase2d/fabric` | EraserBrush |
| `@tanstack/react-table` | 가상화 테이블 |
| `@tanstack/react-virtual` | 가상화 스크롤 |
| `echarts` | 차트 라벨 렌더링 |

## 기본 사용법

```tsx
import {
  LabelingProviders,
  LabelingWorkspace,
  staticData,
  loadingData,
} from '@servantcdh/ez-planet-labeling';
// CSS import 불필요 — JS 번들에 자동 포함

function App() {
  const dataCtx = useMyLabelingData();          // 호스트가 구현
  const mutationCtx = useMyLabelingMutations(); // 호스트가 구현
  const datasetCtx = useMyDatasetData();        // 호스트가 구현

  return (
    <LabelingProviders
      data={dataCtx}
      mutations={mutationCtx}
      dataset={datasetCtx}
    >
      <LabelingWorkspace />
    </LabelingProviders>
  );
}
```

## Architecture

### Provider 구조

라이브러리는 3개의 Context를 통해 호스트로부터 데이터를 주입받습니다. 변경 빈도별로 분리하여 불필요한 리렌더를 방지합니다.

```
LabelingProviders
├── LabelingDataProvider      — 라벨/정책/컨텍스트 데이터 (자주 변경)
├── LabelingMutationProvider  — Mutation 콜백 함수 (참조 안정적)
└── LabelingDatasetProvider   — 데이터셋/콘텐츠 (레코드 선택 시만 변경)
```

### AsyncData\<T\>

모든 쿼리 데이터는 `AsyncData<T>` 래퍼로 전달합니다. react-query의 반환 타입과 동일한 인터페이스입니다.

```ts
interface AsyncData<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  dataUpdatedAt: number;
}
```

헬퍼 함수:

| 함수 | 용도 |
|------|------|
| `staticData(value)` | 이미 로드된 값을 래핑 |
| `loadingData()` | 로딩 상태 플레이스홀더 |
| `errorData(error)` | 에러 상태 플레이스홀더 |

### LabelingDataContextValue

```ts
interface LabelingDataContextValue {
  policiesBatch: AsyncData<PolicyDetail[]>;
  labelContext: AsyncData<LabelContextResponse>;
  labelContextStatus: AsyncData<ContentsetStatusResponse>;
  labelContextInLabeling: AsyncData<InLabelingStatusResponse>;
  labelContextEnable: AsyncData<LabelContextEnableResponse>;
  labelSearch: AsyncData<LabelSearchResult>;
  previousLabelContexts: AsyncData<PreviousLabelContextWithLabelsResponse[]>;
  validResultSearch: AsyncData<ValidResultSearchResult>;
}
```

### LabelingMutationContextValue

각 뮤테이션은 `async function` + `MutationState` 쌍으로 구성됩니다.

```ts
interface LabelingMutationContextValue {
  batchUpdateLabels: (vars: LabelBatchUpdateVariables) => Promise<LabelBatchUpdateResponse>;
  batchUpdateLabelsState: MutationState;

  bulkCreateLabels: (vars: LabelBulkCreateVariables) => Promise<BulkLabelCreateResponse>;
  bulkCreateLabelsState: MutationState;

  createLabelContext: (body: LabelContextCreateRequest) => Promise<LabelContextResponse>;
  createLabelContextState: MutationState;

  updateLabelContext: (vars: LabelContextUpdateVariables) => Promise<LabelContextResponse>;
  updateLabelContextState: MutationState;

  createLabelStatus: (body: LabelStatusCreateRequest) => Promise<ApiResponse<LabelStatusResponse>>;
  createLabelStatusState: MutationState;

  uploadFileLabel: (vars: FileLabelUploadVariables) => Promise<LabelResponse>;
  uploadFileLabelState: MutationState;

  copyLabels: (body: LabelCopyRequest) => Promise<LabelCopyResponse>;
  copyLabelsState: MutationState;

  createValidResult: (body: ValidResultCreateRequest) => Promise<ValidResultResponse>;
  createValidResultState: MutationState;

  updateValidResult: (vars: ValidResultUpdateVariables) => Promise<ValidResultResponse>;
  updateValidResultState: MutationState;

  bulkDeleteValidResults: (body: ValidResultBulkDeleteRequest) => Promise<ValidResultBulkDeleteResponse>;
  bulkDeleteValidResultsState: MutationState;

  onMutationSuccess: (hint: MutationSuccessHint) => void;
}
```

`onMutationSuccess`는 라이브러리가 뮤테이션 성공 후 호출합니다. 호스트는 `hint.type`에 따라 적절한 캐시 무효화/리페치를 수행하면 됩니다.

```ts
type MutationSuccessHint =
  | { type: "labels-saved"; labelContextId: string | null }
  | { type: "labels-copied" }
  | { type: "labels-bulk-created"; labelContextId: string }
  | { type: "label-context-created"; labelContextId: string }
  | { type: "label-context-updated"; labelContextId: string }
  | { type: "label-status-created" }
  | { type: "valid-result-created" }
  | { type: "valid-result-updated" }
  | { type: "valid-results-deleted" }
  | { type: "file-uploaded"; labelContextId: string };
```

### LabelingDatasetContextValue

```ts
interface LabelingDatasetContextValue {
  datasetDetail: AsyncData<DatasetDTO>;
  datasetContents: AsyncData<DatasetApiResponse<DatasetContentSearchResponse>>;
  datasetContentDetail: AsyncData<DatasetContentRecord | null>;
}
```

## Extension System

`LabelingWorkspace`는 `extensions` prop을 통해 호스트가 확장 기능을 등록할 수 있습니다. 라이브러리는 렌더 슬롯만 제공하며, 모든 UI와 로직은 호스트가 소유합니다.

```tsx
<LabelingWorkspace extensions={[samExtension, autoLabelingExtension]} />
```

### LabelingExtension

```ts
interface LabelingExtension {
  id: string;
  name: string;
  enabled?: boolean;
  renderInfoPanelAction?: (ctx: ExtensionRenderContext) => ReactNode;
  renderOverlay?: (ctx: ExtensionRenderContext) => ReactNode;
  renderToolbarAction?: (ctx: ExtensionRenderContext) => ReactNode;
}
```

### Render Slots

| Slot | 위치 | 용도 |
|------|------|------|
| `renderInfoPanelAction` | InfoPanel 하단 | 액션 버튼 (예: Auto Labeling 실행) |
| `renderOverlay` | 워크스페이스 루트 위 | 모달, 패널 등 오버레이 UI |
| `renderToolbarAction` | 플로팅 툴바 끝 | 캔버스 도구 버튼 (예: SAM) |

### ExtensionRenderContext

각 렌더 함수는 현재 워크스페이스 상태와 캔버스 접근 API를 포함한 컨텍스트를 받습니다.

```ts
interface ExtensionRenderContext {
  // 워크스페이스 상태
  contentSetId: string | null;
  labelContextId: string | null;
  policyIds: string[];
  datasetId: string;
  datasetVersion: string;
  requestDataRefresh: (hint: MutationSuccessHint) => void;

  // 캔버스 접근
  canvasRef: RefObject<unknown | null>;   // fabric.Canvas 인스턴스
  imageInfo: WorkspaceImageInfo | null;   // { url, width, height }
  addCanvasObjects: (objects: unknown[]) => void;
  removeCanvasObjects: (predicate: (obj: unknown) => boolean) => void;
}
```

### Canvas Access

캔버스와 직접 상호작용해야 하는 확장은 다음 export를 사용할 수 있습니다:

```ts
import {
  getCanvasInstance,    // fabric.Canvas 싱글턴 반환
  addCanvasObjects,     // fabric 오브젝트 추가
  removeCanvasObjects,  // 조건에 맞는 오브젝트 제거
} from '@servantcdh/ez-planet-labeling';
```

### Extension 구현 예시 (SAM)

```tsx
import type { LabelingExtension } from '@servantcdh/ez-planet-labeling';

function createSAMExtension(api: SAMApi): LabelingExtension {
  return {
    id: 'sam',
    name: 'Segment Anything',
    renderToolbarAction: (ctx) => (
      <SAMToolButton
        canvasRef={ctx.canvasRef}
        imageInfo={ctx.imageInfo}
        onResult={(polygons) => ctx.addCanvasObjects(polygons)}
      />
    ),
    renderOverlay: (ctx) => (
      <SAMResultPanel
        api={api}
        contentSetId={ctx.contentSetId}
        onApply={() => ctx.requestDataRefresh({
          type: 'labels-saved',
          labelContextId: ctx.labelContextId,
        })}
      />
    ),
  };
}
```

### Extension 구현 예시 (Automated Labeling)

```tsx
function createAutoLabelingExtension(api: AutoLabelingApi): LabelingExtension {
  return {
    id: 'auto-labeling',
    name: 'Automated Labeling',
    renderInfoPanelAction: (ctx) => (
      <AutoLabelingButton
        contentSetId={ctx.contentSetId}
        policyIds={ctx.policyIds}
      />
    ),
    renderOverlay: (ctx) => (
      <AutoLabelingModal
        api={api}
        datasetId={ctx.datasetId}
        onComplete={() => ctx.requestDataRefresh({
          type: 'labels-saved',
          labelContextId: ctx.labelContextId,
        })}
      />
    ),
  };
}
```

## 주요 기능

- **도구**: Selection, Bounding Box, Polygon, Brush, Eraser, Magic Brush, Superpixel
- **Extension System**: 렌더 슬롯 + 캔버스 접근 기반 플러그인 아키텍처
- **Validation Mode**: 검증 워크플로우 지원
- **Undo/Redo**: zundo 기반 temporal history
- **CSS Scoping**: `.lc-root` 컨테이너 스코핑, `--lc-*` 네임스페이스 CSS 변수
- **CSS-in-JS 번들**: `vite-plugin-css-injected-by-js`로 별도 CSS import 불필요

## Exports

### Components

| Export | 설명 |
|--------|------|
| `LabelingWorkspace` | 메인 워크스페이스 컴포넌트 |
| `LabelingProviders` | 3개 Provider 합성 래퍼 |

### Types

| Export | 설명 |
|--------|------|
| `LabelingWorkspaceProps` | 워크스페이스 props |
| `LabelingProvidersProps` | Provider props |
| `LabelingDataContextValue` | 데이터 Context 인터페이스 |
| `LabelingMutationContextValue` | 뮤테이션 Context 인터페이스 |
| `LabelingDatasetContextValue` | 데이터셋 Context 인터페이스 |
| `AsyncData<T>` | 비동기 데이터 래퍼 |
| `MutationState` | 뮤테이션 상태 |
| `MutationSuccessHint` | 뮤테이션 성공 힌트 |
| `LabelingExtension` | 확장 인터페이스 |
| `ExtensionRenderContext` | 확장 렌더 컨텍스트 |
| `WorkspaceImageInfo` | 이미지 정보 |

### Helpers

| Export | 설명 |
|--------|------|
| `staticData(value)` | 로드 완료 상태의 `AsyncData` 생성 |
| `loadingData()` | 로딩 상태의 `AsyncData` 생성 |
| `errorData(error)` | 에러 상태의 `AsyncData` 생성 |
| `IDLE_MUTATION` | 대기 상태의 `MutationState` |

### Canvas Access

| Export | 설명 |
|--------|------|
| `getCanvasInstance()` | fabric.Canvas 싱글턴 반환 |
| `addCanvasObjects(objects)` | 캔버스에 fabric 오브젝트 추가 |
| `removeCanvasObjects(predicate)` | 조건에 맞는 오브젝트 제거 |

### Domain Types

라벨, 정책, 데이터셋 관련 도메인 타입은 `index.ts`에서 re-export됩니다. 전체 목록은 소스를 참조하세요.

## License

MIT
