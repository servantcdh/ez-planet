import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type {
  Annotation,
  CanvasChangeEvent,
  FileContent,
  LabelingClass,
  LabelingExtension,
  LabelingPolicy,
  LabelingTheme,
  NumberContent,
  SavePayload,
  TextContent,
  ToolType,
  ValidationResult,
  WorkspaceIndicator,
  WorkspaceLayout,
  WorkspaceMode,
  WorkspaceRecord,
  WorkspaceViewMode,
} from '../types/public'
import { useViewModeStore } from '../store/view-mode.store'
import { useValidationModeStore } from '../store/validation-mode.store'

// ─── Context Value ───

export interface LabelingContextValue {
  // Canvas state
  image: string | { url: string; width: number; height: number }
  annotations: Annotation[]
  onChange: (event: CanvasChangeEvent) => void

  // View mode
  viewMode: WorkspaceViewMode
  onViewModeChange: (mode: WorkspaceViewMode) => void
  availableViewModes: WorkspaceViewMode[]

  // Content-specific data
  textContent?: TextContent
  numberContent?: NumberContent
  fileContent?: FileContent

  // Navigation
  records: WorkspaceRecord[]
  activeRecordId: string
  onRecordSelect: (record: WorkspaceRecord) => void

  // InfoPanel
  classes: LabelingClass[]
  policies: LabelingPolicy[]
  onClassSelect?: (cls: LabelingClass) => void
  selectedClassId: string | null
  setSelectedClassId: (id: string | null) => void

  // Annotation selection
  selectedAnnotationId: string | null
  setSelectedAnnotationId: (id: string | null) => void

  // Actions
  onSave: (payload: SavePayload) => void | Promise<void>
  onSaveToRecord?: () => void
  onFileUpload?: (file: File) => void
  isSaving: boolean

  // Navigation arrows
  onNavigateLeft?: () => void
  onNavigateRight?: () => void
  canNavigateLeft: boolean
  canNavigateRight: boolean

  // Mode
  mode: WorkspaceMode
  onModeChange?: (mode: WorkspaceMode) => void

  // Validation
  validationResults: ValidationResult[]

  // Indicator
  indicator?: WorkspaceIndicator

  // Extensions
  extensions: LabelingExtension[]

  // Config
  tools: ToolType[]
  theme?: Partial<LabelingTheme>
  layout: WorkspaceLayout

  // Navigation direction
  navDirection: 'horizontal' | 'vertical'
  setNavDirection: (dir: 'horizontal' | 'vertical') => void
  navVisible: boolean
  setNavVisible: (visible: boolean) => void
}

const LabelingContext = createContext<LabelingContextValue | null>(null)

export function useLabelingContext(): LabelingContextValue {
  const ctx = useContext(LabelingContext)
  if (!ctx) {
    throw new Error('useLabelingContext must be used within a LabelingProvider')
  }
  return ctx
}

// ─── Provider ───

interface LabelingProviderProps {
  // Canvas
  image: string | { url: string; width: number; height: number }
  annotations: Annotation[]
  onChange: (event: CanvasChangeEvent) => void

  // View mode
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

  // InfoPanel
  classes: LabelingClass[]
  policies?: LabelingPolicy[]
  onClassSelect?: (cls: LabelingClass) => void

  // Actions
  onSave: (payload: SavePayload) => void | Promise<void>
  onSaveToRecord?: () => void
  onFileUpload?: (file: File) => void
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

  // Indicator
  indicator?: WorkspaceIndicator

  // Extensions
  extensions?: LabelingExtension[]

  // Config
  tools?: ToolType[]
  theme?: Partial<LabelingTheme>
  layout?: WorkspaceLayout

  children: ReactNode
}

export function LabelingProvider({
  image,
  annotations,
  onChange,
  viewMode: viewModeProp,
  onViewModeChange: onViewModeChangeProp,
  availableViewModes = ['Image'],
  textContent,
  numberContent,
  fileContent,
  records,
  activeRecordId,
  onRecordSelect,
  classes,
  policies = [],
  onClassSelect,
  onSave,
  onSaveToRecord,
  onFileUpload,
  isSaving = false,
  onNavigateLeft,
  onNavigateRight,
  canNavigateLeft = false,
  canNavigateRight = false,
  mode = 'labeling',
  onModeChange,
  validationResults = [],
  indicator,
  extensions = [],
  tools = ['selection', 'blankRect', 'polygon', 'brush', 'eraser'],
  theme,
  layout = {},
  children,
}: LabelingProviderProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id ?? null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [navDirection, setNavDirection] = useState<'horizontal' | 'vertical'>(
    layout.navigation === 'bottom' ? 'vertical' : 'horizontal',
  )
  const [navVisible, setNavVisible] = useState(layout.navigation !== 'hidden')

  // Sync viewMode prop with store
  const setStoreViewMode = useViewModeStore((s) => s.setMode)
  const storeViewMode = useViewModeStore((s) => s.mode)

  const viewMode = viewModeProp ?? storeViewMode
  const onViewModeChange = onViewModeChangeProp ?? setStoreViewMode

  useEffect(() => {
    if (viewModeProp) {
      setStoreViewMode(viewModeProp)
    }
  }, [viewModeProp, setStoreViewMode])

  // Sync validation mode
  const setValidationMode = useValidationModeStore((s) => s.setValidationMode)
  useEffect(() => {
    setValidationMode(mode === 'validation')
  }, [mode, setValidationMode])

  const value = useMemo<LabelingContextValue>(
    () => ({
      image,
      annotations,
      onChange,
      viewMode,
      onViewModeChange,
      availableViewModes,
      textContent,
      numberContent,
      fileContent,
      records,
      activeRecordId,
      onRecordSelect,
      classes,
      policies,
      onClassSelect,
      selectedClassId,
      setSelectedClassId,
      selectedAnnotationId,
      setSelectedAnnotationId,
      onSave,
      onSaveToRecord,
      onFileUpload,
      isSaving,
      onNavigateLeft,
      onNavigateRight,
      canNavigateLeft,
      canNavigateRight,
      mode,
      onModeChange,
      validationResults,
      indicator,
      extensions,
      tools,
      theme,
      layout,
      navDirection,
      setNavDirection,
      navVisible,
      setNavVisible,
    }),
    [
      image,
      annotations,
      onChange,
      viewMode,
      onViewModeChange,
      availableViewModes,
      textContent,
      numberContent,
      fileContent,
      records,
      activeRecordId,
      onRecordSelect,
      classes,
      policies,
      onClassSelect,
      selectedClassId,
      selectedAnnotationId,
      onSave,
      onSaveToRecord,
      onFileUpload,
      isSaving,
      onNavigateLeft,
      onNavigateRight,
      canNavigateLeft,
      canNavigateRight,
      mode,
      onModeChange,
      validationResults,
      indicator,
      extensions,
      tools,
      theme,
      layout,
      navDirection,
      navVisible,
    ],
  )

  // Apply theme CSS variables
  const themeStyle = useMemo(() => {
    if (!theme) return undefined
    const vars: Record<string, string> = {}
    if (theme.primary) vars['--lc-primary'] = theme.primary
    if (theme.background) vars['--lc-background'] = theme.background
    if (theme.surface) vars['--lc-surface'] = theme.surface
    if (theme.border) vars['--lc-border'] = theme.border
    if (theme.text) vars['--lc-text'] = theme.text
    if (theme.textSecondary) vars['--lc-text-secondary'] = theme.textSecondary
    if (theme.hover) vars['--lc-hover'] = theme.hover
    if (theme.fontFamily) vars['--lc-font-family'] = theme.fontFamily
    return Object.keys(vars).length > 0 ? vars : undefined
  }, [theme])

  return (
    <LabelingContext.Provider value={value}>
      <div style={{ width: '100%', height: '100%', ...themeStyle } as any}>{children}</div>
    </LabelingContext.Provider>
  )
}
