// Main workspace component (wrapped with required providers)
export { LabelingWorkspace, type LabelingWorkspaceProps } from './components/LabelingWorkspaceWrapper';

// Key symbol for virtualized records row meta
export { VIRTUALIZED_RECORDS_ROW_META_SYMBOL } from './components/organisms/VirtualizedRecordsTable';

// Domain types
export type {
  ApiResponse,
  LabelingApiHeaders,
  LabelInferenceType,
  LabelType,
  LabelUnitType,
  LabelAttributeType,
  LabelValue,
  LabelDetailResponse,
  LabelResponse,
  LabelInsertData,
  LabelUpdateData,
  LabelDeleteData,
  LabelBatchUpdateRequest,
  LabelBatchUpdateResponse,
  LabelSearchRequest,
  LabelSearchResult,
  LabelContextResponse,
  LabelContextCreateRequest,
  LabelContextUpdateRequest,
  ValidType,
  ValidResultCreateRequest,
  ValidResultUpdateRequest,
  ValidResultResponse,
  ContentsetStatusResponse,
  ContentsetStatusState,
  ContentsetStatus,
  ClassificationValue,
  BoxValue,
  SegmentationResponseValue,
  SegmentationBase64Value,
  ChartValue,
  RecognitionValue,
  FileValue,
  AttributeValue,
} from './types/domain';

// Record selection types
export type {
  LabelingSchemaEntry,
  LabelingDatasetCellReference,
  LabelingRecordSelection,
} from './types/recordSelection';

// Providers — host wraps the workspace with these to supply data & mutations
export { LabelingProviders, type LabelingProvidersProps } from './providers/LabelingProviders';
export { type LabelingDataContextValue } from './providers/LabelingDataProvider';
export {
  type LabelingMutationContextValue,
  type LabelContextUpdateVariables,
  type LabelBulkCreateVariables,
  type LabelBatchUpdateVariables,
  type FileLabelUploadVariables,
  type ValidResultUpdateVariables,
} from './providers/LabelingMutationProvider';
export { type LabelingDatasetContextValue } from './providers/LabelingDatasetProvider';
export { staticData, loadingData, errorData, IDLE_MUTATION, type AsyncData, type MutationState, type MutationSuccessHint } from './types/asyncData';

// Stores (for external bootstrapping / demo)
export { useWorkspaceNavigationDetailSelectionStore } from './store/workspaceNavigationDetailSelection.store';
export { useFilterStore } from './lib/hooks/useSearchInfoMeta';

// Policy types (for sample data typing)
export type { PolicyDetail, Class as PolicyClass } from './features/policy/types/domain';

// Dataset types (for sample data typing)
export type {
  DatasetDTO,
  SchemaItemDTO,
  VersionDTO,
  DatasetContentRecord,
  DatasetContentSearchResponse,
  DatasetApiResponse,
} from './features/dataset/types/domain';

// Extensions — host-provided features plugged into render slots
export type { LabelingExtension, ExtensionRenderContext, WorkspaceImageInfo } from './types/extension';

// Canvas access — for extensions that interact with the fabric.js canvas
export { getCanvasInstance } from './utils/imageLabelingCore';
export { addCanvasObjects, removeCanvasObjects } from './store/workspaceCanvas.store';

// Styles (injected into JS bundle via vite-plugin-css-injected-by-js)
import './styles/globals.css';
