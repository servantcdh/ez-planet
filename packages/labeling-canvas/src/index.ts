// ─── Types ───
export type {
  // Annotation
  Annotation,
  AnnotationType,
  AnnotationGeometry,
  AnnotationLabel,
  AnnotationStyle,
  BoxGeometry,
  SegmentationGeometry,
  PolygonGeometry,
  BrushGeometry,
  RecognitionGeometry,

  // Events
  CanvasChangeEvent,
  CanvasAction,
  CanvasState,

  // Navigation
  WorkspaceRecord,
  RecordStatus,

  // InfoPanel
  LabelingClass,

  // Validation
  ValidationResult,
  ValidateEvent,
  ValidationUpdateEvent,
  ValidationDeleteEvent,

  // Indicator
  WorkspaceIndicator,

  // Theme & Config
  LabelingTheme,
  ToolType,
  ToolbarSection,
  WorkspaceLayout,
  WorkspaceMode,

  // Extension
  LabelingExtension,
  ToolExtension,
  ExtensionContext,
  CanvasPointerEvent,

  // Component Props
  LabelingWorkspaceProps,
  LabelingToolbarProps,
} from './types/public'

// ─── Components ───
// TODO: Phase 1-2 에서 구현
// export { LabelingWorkspace } from './components/LabelingWorkspace'
// export { LabelingProvider } from './components/LabelingProvider'
// export { LabelingCanvas } from './components/LabelingCanvas'
// export { LabelingToolbar } from './components/LabelingToolbar'
// export { LabelingNavigation } from './components/LabelingNavigation'
// export { LabelingInfoPanel } from './components/LabelingInfoPanel'

// ─── Hooks ───
// TODO: Phase 3 에서 구현
// export { useLabelingTools } from './hooks/useLabelingTools'
// export { useLabelingCanvas } from './hooks/useLabelingCanvas'
// export { useLabelingHistory } from './hooks/useLabelingHistory'
