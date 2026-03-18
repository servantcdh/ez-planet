import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'
import type {
  Annotation,
  CanvasChangeEvent,
  CanvasState,
  LabelingClass,
  LabelingExtension,
  LabelingTheme,
  ToolType,
  ValidationResult,
  WorkspaceIndicator,
  WorkspaceLayout,
  WorkspaceMode,
  WorkspaceRecord,
} from '../types/public'

// ─── Context Value ───

interface LabelingContextValue {
  // Canvas state
  image: string | { url: string; width: number; height: number }
  annotations: Annotation[]
  onChange: (event: CanvasChangeEvent) => void

  // Navigation
  records: WorkspaceRecord[]
  activeRecordId: string
  onRecordSelect: (record: WorkspaceRecord) => void

  // InfoPanel
  classes: LabelingClass[]
  onClassSelect?: (cls: LabelingClass) => void
  selectedClassId: string | null
  setSelectedClassId: (id: string | null) => void

  // Annotation selection
  selectedAnnotationId: string | null
  setSelectedAnnotationId: (id: string | null) => void

  // Actions
  onSave: (state: CanvasState) => void | Promise<void>
  isSaving: boolean

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

  // Navigation
  records: WorkspaceRecord[]
  activeRecordId: string
  onRecordSelect: (record: WorkspaceRecord) => void

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
  records,
  activeRecordId,
  onRecordSelect,
  classes,
  onClassSelect,
  onSave,
  isSaving = false,
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

  const value = useMemo<LabelingContextValue>(
    () => ({
      image,
      annotations,
      onChange,
      records,
      activeRecordId,
      onRecordSelect,
      classes,
      onClassSelect,
      selectedClassId,
      setSelectedClassId,
      selectedAnnotationId,
      setSelectedAnnotationId,
      onSave,
      isSaving,
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
      records,
      activeRecordId,
      onRecordSelect,
      classes,
      onClassSelect,
      selectedClassId,
      selectedAnnotationId,
      onSave,
      isSaving,
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
      <div style={themeStyle as any}>{children}</div>
    </LabelingContext.Provider>
  )
}
