import type { ReactNode } from 'react'

// ─── Geometry Types ───

export interface BoxGeometry {
  type: 'box'
  /** Normalized coordinates (0~1 ratio, image-size independent) */
  x: number
  y: number
  width: number
  height: number
}

export interface SegmentationGeometry {
  type: 'segmentation'
  /** Base64 PNG mask */
  mask: string
  /** Fabric object vector for restoration (optional) */
  vector?: string
}

export interface PolygonGeometry {
  type: 'polygon'
  /** Normalized vertex coordinates */
  points: Array<{ x: number; y: number }>
}

export interface BrushGeometry {
  type: 'brush'
  /** SVG path or fabric path data */
  path: string
}

export interface RecognitionGeometry {
  type: 'recognition'
  start: number
  end: number
  text?: string
}

export type AnnotationGeometry =
  | BoxGeometry
  | SegmentationGeometry
  | PolygonGeometry
  | BrushGeometry
  | RecognitionGeometry

// ─── Annotation ───

export interface AnnotationLabel {
  name: string
  index: number
}

export interface AnnotationStyle {
  color: string
  opacity: number
  lineColor?: string
  lineWidth?: number
  zIndex?: number
}

export type AnnotationType =
  | 'box'
  | 'segmentation'
  | 'polygon'
  | 'brush'
  | 'classification'
  | 'recognition'

export interface Annotation {
  /** Host app assigns this freely (DB PK, UUID, temp ID, etc.) */
  id: string
  type: AnnotationType
  label: AnnotationLabel
  style: AnnotationStyle
  geometry: AnnotationGeometry | null
}

// ─── Canvas Events ───

export type CanvasAction =
  | { type: 'add'; annotation: Annotation }
  | { type: 'update'; annotation: Annotation; prev: Annotation }
  | { type: 'delete'; id: string }
  | { type: 'batch'; added: Annotation[]; updated: Annotation[]; deleted: string[] }

export interface CanvasChangeEvent {
  annotations: Annotation[]
  action: CanvasAction
}

export interface CanvasState {
  annotations: Annotation[]
  canvasJSON: object
  image: { width: number; height: number }
}

// ─── View Mode ───

export type WorkspaceViewMode = 'Record' | 'Image' | 'Text' | 'Number' | 'File'

export const WORKSPACE_VIEW_MODES = ['Record', 'Image', 'Text', 'Number', 'File'] as const

// ─── Content-Specific Data ───

export interface TextContent {
  value: string
  elementId?: string
}

export interface NumberContent {
  mode: 'line' | 'bar'
  xAxis: { label: string; ticks: unknown[] }
  yAxis: { label: string; series: unknown[] }
  source: { rows: unknown[]; columns: unknown[] }
  canRender: boolean
}

export interface FileContent {
  endpointUrl?: string
  fileName?: string
  fileType?: string
}

// ─── Navigation ───

export type RecordStatus = 'unlabeled' | 'labeled' | 'validated' | 'issue'

export interface NavigationSchema {
  label: string
  contentType: string
  isRequired: boolean
  maxItems?: number | null
}

export interface NavigationCellBadge {
  title: string
  style: 'primary-light' | 'secondary-light'
}

export interface NavigationCellAccessories {
  badges?: NavigationCellBadge[]
  hasIssue?: boolean
  hasValidationCompleted?: boolean
}

export interface NavigationDetailData {
  rows: Record<string, unknown>[]
  columns?: string[]
}

export interface WorkspaceRecord {
  id: string
  title: string
  thumbnail?: string
  status?: RecordStatus
  children?: WorkspaceRecord[]
  meta?: Record<string, unknown>
  /** Schema-based table mode */
  summary?: Record<string, string>
  schemas?: NavigationSchema[]
  accessories?: Record<string, NavigationCellAccessories>
  detail?: NavigationDetailData
}

// ─── InfoPanel ───

export interface LabelingClass {
  id: string
  name: string
  color: string
  hotkey?: string
  group?: string
}

export interface LabelingPolicy {
  id: string
  name: string
  classes: LabelingClass[]
}

// ─── Label Data (for batch operations) ───

export interface LabelInsertData {
  policyId: string
  classIndex: number
  className: string
  labelValue: unknown
  attributeValues?: Record<string, unknown>
}

export interface LabelUpdateData extends LabelInsertData {
  id: string
}

export interface LabelDeleteData {
  id: string
}

// ─── Save Payloads ───

export interface SavePayload {
  viewMode: WorkspaceViewMode
  inserts: LabelInsertData[]
  updates: LabelUpdateData[]
  deletes: LabelDeleteData[]
  canvasJSON?: object
  imageSize?: { width: number; height: number }
}

export interface SaveToRecordPayload {
  contentSetId: string
  labels: LabelInsertData[]
}

export interface SaveValidationPayload {
  result: boolean
  reason?: string
  labelIds: string[]
}

export interface FileUploadPayload {
  file: File
  policyId: string
  contentSetId: string
  elementId?: string
}

// ─── Validation ───

export interface ValidationResult {
  id: string
  annotationId?: string
  result: boolean
  reason?: string
  validatedAt?: string
}

export interface ValidateEvent {
  annotationIds: string[]
  result: boolean
  reason?: string
}

export interface ValidationUpdateEvent {
  id: string
  result?: boolean
  reason?: string
}

export interface ValidationDeleteEvent {
  ids: string[]
}

// ─── Indicator ───

export interface WorkspaceIndicator {
  title: string
  subtitle?: string
  detail?: string
  progress?: { current: number; total: number }
}

// ─── Theme ───

export interface LabelingTheme {
  primary: string
  background: string
  surface: string
  border: string
  text: string
  textSecondary: string
  hover: string
  primaryLight: string
  fontFamily: string
  radius: number
  spacing: { sm: number; md: number; lg: number }
}

// ─── Tools ───

export type ToolType =
  | 'selection'
  | 'brush'
  | 'blankRect'
  | 'filledRect'
  | 'polygon'
  | 'eraser'
  | 'magicbrush'
  | 'superpixel'
  | 'segAnything'

export type TextToolType = 'selection' | 'drag-segment'

export type NumberToolType = 'selection' | 'drag-segment'

export type ToolbarSection =
  | 'tools'
  | 'brush'
  | 'palette'
  | 'zoom'
  | 'history'
  | 'layers'
  | 'viewMode'
  | 'validation'
  | 'navigation'
  | 'save'

// ─── Icons ───

export type LabelingIconName =
  | 'icon-selection'
  | 'icon-borderd-rect'
  | 'icon-pen'
  | 'icon-brush'
  | 'icon-eraser'
  | 'icon-magic-wand'
  | 'icon-superpixel'
  | 'icon-seg-anything'
  | 'icon-undo'
  | 'icon-redo'
  | 'icon-save'
  | 'icon-down'
  | 'icon-all-layer'
  | 'icon-bottom-layer'
  | 'icon-top-layer'
  | 'icon-plus'
  | 'icon-minus'
  | 'icon-left'
  | 'icon-right'
  | 'icon-issue'
  | 'icon-labeling'
  | 'icon-validated'
  | 'icon-cancel'
  | 'icon-highlight'

// ─── Extension ───

export interface CanvasPointerEvent {
  x: number
  y: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

export interface ExtensionContext {
  image: { url: string; width: number; height: number }
  annotations: Annotation[]
  selectedIds: string[]
  activeTool: string
  addAnnotations: (annotations: Annotation[]) => void
  updateAnnotation: (id: string, annotation: Partial<Annotation>) => void
  removeAnnotations: (ids: string[]) => void
  setTool: (tool: string) => void
  canvas: {
    toJSON: () => object
    getImageDataURL: () => string
  }
}

export interface LabelingExtension {
  id: string
  slot: 'tool' | 'sidePanel' | 'toolbar'
  render: (context: ExtensionContext) => ReactNode
}

export interface ToolExtension extends LabelingExtension {
  slot: 'tool'
  icon: ReactNode
  label: string
  shortcut?: string
  canvasHandlers?: {
    onMouseDown?: (e: CanvasPointerEvent) => void
    onMouseMove?: (e: CanvasPointerEvent) => void
    onMouseUp?: (e: CanvasPointerEvent) => void
  }
}

// ─── Layout ───

export interface WorkspaceLayout {
  navigation?: 'left' | 'bottom' | 'hidden'
  toolbar?: 'top' | 'bottom'
}

// ─── Component Props ───

export type WorkspaceMode = 'labeling' | 'validation' | 'readonly'

export interface LabelingWorkspaceProps {
  // Canvas
  image: string | { url: string; width: number; height: number }
  annotations: Annotation[]
  onChange: (event: CanvasChangeEvent) => void

  // View Mode
  viewMode?: WorkspaceViewMode
  onViewModeChange?: (mode: WorkspaceViewMode) => void
  availableViewModes?: WorkspaceViewMode[]

  // Content-specific data
  textContent?: TextContent
  numberContent?: NumberContent
  fileContent?: FileContent

  // Navigation
  records: WorkspaceRecord[]
  activeRecordId: string
  onRecordSelect: (record: WorkspaceRecord) => void
  onDetailExpand?: (record: WorkspaceRecord, schemaLabel: string) => void
  totalRecords?: number
  onPageChange?: (page: number) => void

  // InfoPanel
  classes: LabelingClass[]
  policies?: LabelingPolicy[]
  onClassSelect?: (cls: LabelingClass) => void

  // Save Actions
  onSave: (payload: SavePayload) => void | Promise<void>
  onSaveToRecord?: (payload: SaveToRecordPayload) => void | Promise<void>
  onFileUpload?: (payload: FileUploadPayload) => void | Promise<void>
  isSaving?: boolean

  // Navigation arrows
  onNavigateLeft?: () => void
  onNavigateRight?: () => void
  canNavigateLeft?: boolean
  canNavigateRight?: boolean

  // Mode
  mode?: WorkspaceMode
  onModeChange?: (mode: WorkspaceMode) => void

  // Validation
  validationResults?: ValidationResult[]
  onValidate?: (event: ValidateEvent) => void | Promise<void>
  onValidationUpdate?: (event: ValidationUpdateEvent) => void | Promise<void>
  onValidationDelete?: (event: ValidationDeleteEvent) => void | Promise<void>
  onSaveValidation?: (payload: SaveValidationPayload) => void | Promise<void>

  // Indicator
  indicator?: WorkspaceIndicator

  // Extensions
  extensions?: LabelingExtension[]

  // Config
  tools?: ToolType[]
  theme?: Partial<LabelingTheme>
  layout?: WorkspaceLayout

  // Dirty state
  isDirty?: boolean
  dirtyConfirmMessage?: string
}

// ─── Toolbar Props ───

export interface LabelingToolbarProps {
  orientation?: 'horizontal' | 'vertical'
  sections?: ToolbarSection[]
  onSave?: () => void
  isSaving?: boolean
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}
