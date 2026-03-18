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
} from './store'

// ─── Components ───
export {
  LabelingWorkspace,
  LabelingProvider,
  useLabelingContext,
  LabelingCanvas,
  LabelingToolbar,
  LabelingNavigation,
  LabelingInfoPanel,
  LabelingIndicator,
  LabelingFloatingToolbar,
  LabelingIssuePanel,
} from './components'
export type {
  ToolbarItem,
  ToolbarButtonItem,
  ToolbarRadioItem,
  ToolbarDividerItem,
} from './components'

// ─── Hooks (Level 3 Headless) ───
export {
  useLabelingTools,
  useLabelingCanvas,
  useLabelingHistory,
} from './hooks'

// ─── Extensions ───
export { useExtensions } from './extensions'
