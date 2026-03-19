// ─── Public Types ───
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

  // View Mode
  WorkspaceViewMode,

  // Content Types
  TextContent,
  NumberContent,
  FileContent,

  // Navigation
  WorkspaceRecord,
  RecordStatus,
  NavigationSchema,
  NavigationCellBadge,
  NavigationCellAccessories,
  NavigationDetailData,

  // InfoPanel
  LabelingClass,
  LabelingPolicy,

  // Label Data
  LabelInsertData,
  LabelUpdateData,
  LabelDeleteData,
  SavePayload,
  SaveToRecordPayload,
  SaveValidationPayload,
  FileUploadPayload,

  // Validation
  ValidationResult,
  ValidateEvent,
  ValidationUpdateEvent,
  ValidationDeleteEvent,

  // Indicator
  WorkspaceIndicator,

  // Icons
  LabelingIconName,

  // Theme & Config
  LabelingTheme,
  ToolType,
  TextToolType,
  NumberToolType,
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
} from './types/public'

export { WORKSPACE_VIEW_MODES } from './types/public'

// ─── Canvas Core ───
export {
  loadFabric,
  ensureCanvas,
  getCanvasInstance,
  setCanvasInstance,
  subscribeLabelEvents,
  emitLabelEvent,
  getCanvasJSON,
  getLabeledObjects,
  getActiveLabeledObjects,
  renderAllSafe,
} from './canvas/core'

// ─── Canvas Tools ───
export {
  brushTool,
  eraserTool,
  magicbrushTool,
  setMagicBrushModule,
  polygonTool,
  blankRectTool,
  filledRectTool,
  segmentAnythingTool,
  selectionTool,
  superpixelTool,
  setSuperpixelModules,
} from './canvas/tools'

// ─── Serializer ───
export {
  fabricObjectToAnnotation,
  canvasToAnnotations,
  annotationToFabricProps,
} from './canvas/serializer'

// ─── Color Utilities ───
export {
  toRgba,
  toRgbaArray,
  toHex,
  toRGBAHex,
} from './canvas/colors'

// ─── Image Utilities ───
export {
  createImage,
  cropAlphaArea,
  transparentBlackPixel,
} from './canvas/image'

// ─── Constants ───
export {
  TOOL_INFO_BRUSH,
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_FILLED_BOX,
  TOOL_INFO_FILLED_POLYGON,
  TOOL_INFO_MAGIC_BRUSH,
  TOOL_INFO_SUPERPIXEL,
  TOOL_INFO_ERASER,
  TOOL_INFO_COMBINED_LABELS,
  EXCEPTION_TOOLS,
  EXPORT_PROPS,
} from './canvas/constants'

// ─── Stores ───
export {
  useToolSelectionStore,
  getToolSelectionStore,
  usePaletteStore,
  useOpacityStore,
  useBrushStore,
  basicColors,
  basicBrushes,
  useLayerModeStore,
  LAYER_MODE,
  useCanvasObjectsStore,
  useZoomStore,
  createTemporalHistoryStore,
  useViewModeStore,
  getViewModeStore,
  useImageToolStore,
  getImageToolStore,
  useTextToolStore,
  useNumberToolStore,
  useTextAutoHighlightStore,
  useValidationModeStore,
  useLabelBatchStore,
  useLabelSelectionStore,
  useLabelVisibilityStore,
  useSelectedObjectsStore,
  useTextSegmentSelectionStore,
  useNumberSegmentSelectionStore,
  useIssuePanelStore,
  useWorkspaceLayoutStore,
} from './store'

// ─── Components ───
export {
  LabelingWorkspace,
  LabelingProvider,
  useLabelingContext,
  LabelingCanvas,
  LabelingToolbar,
  LabelingWorkspaceControl,
  LabelingWorkspaceSection,
  LabelingTextSection,
  LabelingNumberSection,
  LabelingFileSection,
  LabelingNavigation,
  LabelingInfoPanel,
  LabelingIndicator,
  LabelingFloatingToolbar,
  LabelingIssuePanel,
  LabelingIcon,
} from './components'
export type {
  LabelingContextValue,
  ToolbarItem,
  ToolbarButtonItem,
  ToolbarRadioItem,
  ToolbarCheckboxItem,
  ToolbarDividerItem,
} from './components'

// ─── Hooks (Level 3 Headless) ───
export {
  useLabelingTools,
  useLabelingCanvas,
  useLabelingHistory,
  useLabelingUIMeta,
  useToolInit,
  useKeyboardShortcuts,
} from './hooks'

// ─── Shortcuts ───
export {
  LABELING_SHORTCUTS,
  formatShortcutTitle,
  getLabelingShortcutKey,
} from './utils/labelingShortcuts'

// ─── Extensions ───
export { useExtensions } from './extensions'
