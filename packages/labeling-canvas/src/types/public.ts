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

// ─── Navigation ───

export type RecordStatus = 'unlabeled' | 'labeled' | 'validated' | 'issue'

export interface WorkspaceRecord {
  id: string
  title: string
  thumbnail?: string
  status?: RecordStatus
  children?: WorkspaceRecord[]
  meta?: Record<string, unknown>
}

// ─── InfoPanel ───

export interface LabelingClass {
  id: string
  name: string
  color: string
  hotkey?: string
  group?: string
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

  // Navigation
  records: WorkspaceRecord[]
  activeRecordId: string
  onRecordSelect: (record: WorkspaceRecord) => void
  totalRecords?: number
  onPageChange?: (page: number) => void

  // InfoPanel
  classes: LabelingClass[]
  onClassSelect?: (cls: LabelingClass) => void

  // Actions
  onSave: (state: CanvasState) => void | Promise<void>
  isSaving?: boolean

  // Mode
  mode?: WorkspaceMode
  onModeChange?: (mode: WorkspaceMode) => void

  // Validation
  validationResults?: ValidationResult[]
  onValidate?: (event: ValidateEvent) => void | Promise<void>
  onValidationUpdate?: (event: ValidationUpdateEvent) => void | Promise<void>
  onValidationDelete?: (event: ValidationDeleteEvent) => void | Promise<void>

  // Indicator
  indicator?: WorkspaceIndicator

  // Extensions
  extensions?: LabelingExtension[]

  // Config
  tools?: ToolType[]
  theme?: Partial<LabelingTheme>
  layout?: WorkspaceLayout
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
