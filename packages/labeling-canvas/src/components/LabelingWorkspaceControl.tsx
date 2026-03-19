import { useState, useRef, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { WorkspaceViewMode, WorkspaceMode } from '../types/public'
import { LabelingIcon } from './icons/LabelingIcon'
import { useZoomStore } from '../store/zoom.store'
import { useSelectedObjectsStore } from '../store/selected-objects.store'
import { useTextSegmentSelectionStore } from '../store/text-segment-selection.store'
import { useNumberSegmentSelectionStore } from '../store/number-segment-selection.store'
import { usePaletteStore, useOpacityStore } from '../store/palette.store'
import { useToolSelectionStore } from '../store/tool.store'
import { useIssuePanelStore } from '../store/issue-panel.store'
import styles from '../styles/control.module.css'

// ─── Tool Label Map ───

const TOOL_LABEL_MAP: Record<string, string> = {
  selection: 'Selection',
  'bounded-box': 'Bounding Box',
  'filled-box': 'Filled Box',
  pen: 'Pen',
  brush: 'Brush',
  eraser: 'Eraser',
  'magic-brush': 'Magic Brush',
  superpixel: 'Superpixel',
  'seg-anything': 'SAM',
  'drag-segment': 'Highlighting',
}

// ─── Props ───

interface LabelingWorkspaceControlProps {
  viewMode: WorkspaceViewMode
  onViewModeChange?: (mode: WorkspaceViewMode) => void
  availableViewModes?: WorkspaceViewMode[]
  mode?: WorkspaceMode
  onModeChange?: (mode: WorkspaceMode) => void
  onSave?: () => void
  onSaveToRecord?: () => void
  isSaving?: boolean
  onNavigateLeft?: () => void
  onNavigateRight?: () => void
  canNavigateLeft?: boolean
  canNavigateRight?: boolean
}

export function LabelingWorkspaceControl({
  viewMode,
  onViewModeChange,
  availableViewModes = ['Image'],
  mode = 'labeling',
  onModeChange,
  onSave,
  onSaveToRecord,
  isSaving = false,
  onNavigateLeft,
  onNavigateRight,
  canNavigateLeft = false,
  canNavigateRight = false,
}: LabelingWorkspaceControlProps) {
  return (
    <div className={styles.controlBar}>
      <div className={styles.controlLeft}>
        {/* View Mode Tabs */}
        {availableViewModes.length > 1 && (
          <ViewModeTabs
            viewMode={viewMode}
            availableViewModes={availableViewModes}
            onViewModeChange={onViewModeChange}
          />
        )}
        {/* Meta Info */}
        <MetaInfo viewMode={viewMode} />
      </div>

      <div className={styles.controlRight}>
        {/* Zoom Controls */}
        <ZoomControls />

        {/* Navigation */}
        {(onNavigateLeft || onNavigateRight) && (
          <div className={styles.controlBtnGroup}>
            <button
              className={styles.controlBtn}
              disabled={!canNavigateLeft}
              onClick={onNavigateLeft}
              title="Previous"
            >
              <LabelingIcon iconType="icon-left" size="xs" />
            </button>
            <button
              className={styles.controlBtn}
              disabled={!canNavigateRight}
              onClick={onNavigateRight}
              title="Next"
            >
              <LabelingIcon iconType="icon-right" size="xs" />
            </button>
          </div>
        )}

        {/* Save */}
        {onSave && (
          <SaveButton
            onSave={onSave}
            onSaveToRecord={onSaveToRecord}
            isSaving={isSaving}
          />
        )}

        {/* Validation Toggle */}
        {onModeChange && (
          <button
            className={styles.toggleBtn}
            data-active={mode === 'validation' || undefined}
            onClick={() =>
              onModeChange(mode === 'validation' ? 'labeling' : 'validation')
            }
          >
            Valid
          </button>
        )}

        {/* Issue Panel Toggle */}
        <IssuePanelToggle />
      </div>
    </div>
  )
}

// ─── View Mode Tabs ───

function ViewModeTabs({
  viewMode,
  availableViewModes,
  onViewModeChange,
}: {
  viewMode: WorkspaceViewMode
  availableViewModes: WorkspaceViewMode[]
  onViewModeChange?: (mode: WorkspaceViewMode) => void
}) {
  return (
    <div className={styles.viewModeTabs}>
      {availableViewModes.map((mode) => (
        <button
          key={mode}
          className={styles.viewModeTab}
          data-active={mode === viewMode || undefined}
          onClick={() => onViewModeChange?.(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
  )
}

// ─── Meta Info ───

function MetaInfo({ viewMode }: { viewMode: WorkspaceViewMode }) {
  const currentTool = useToolSelectionStore((s) => s.tool)
  const selectedObjects = useSelectedObjectsStore((s) => s.objects)
  const textSegment = useTextSegmentSelectionStore((s) => s.selectedSegment)
  const numberSegment = useNumberSegmentSelectionStore((s) => s.selectedSegment)
  const colorCode = usePaletteStore((s) => s.colorCode)
  const opacity = useOpacityStore((s) => s.opacity)

  const toolLabel = currentTool ? (TOOL_LABEL_MAP[currentTool.id] ?? currentTool.id) : '—'

  if (viewMode === 'Record' || viewMode === 'File') {
    return null
  }

  return (
    <div className={styles.metaInfo}>
      {/* Tool Name */}
      <div className={styles.metaItem}>
        <em>{toolLabel}</em>
      </div>

      <div className={styles.metaDivider} />

      {/* Spatial/Segment Info */}
      {viewMode === 'Image' && (
        <ImageSpatialInfo objects={selectedObjects} />
      )}
      {viewMode === 'Text' && textSegment && (
        <div className={styles.metaItem}>
          Characters: <em>{textSegment.end - textSegment.start}</em>
        </div>
      )}
      {viewMode === 'Number' && numberSegment && (
        <div className={styles.metaItem}>
          Points: <em>{numberSegment.end - numberSegment.start + 1}</em>
          {' '}
          Index: <em>{numberSegment.start + 1}–{numberSegment.end + 1}</em>
        </div>
      )}

      <div className={styles.metaDivider} />

      {/* Color Info */}
      <div className={styles.metaItem}>
        <span
          className={styles.colorPreview}
          style={{ background: colorCode }}
        />
        <em>{colorCode}</em>
        <span>{Math.round(opacity * 100)}%</span>
      </div>
    </div>
  )
}

function ImageSpatialInfo({ objects }: { objects: any[] }) {
  if (!objects.length) {
    return (
      <div className={styles.metaItem}>
        X: <em>—</em> Y: <em>—</em> W: <em>—</em> H: <em>—</em>
      </div>
    )
  }

  const obj = objects[0]
  const x = Math.round(obj.left ?? 0)
  const y = Math.round(obj.top ?? 0)
  const w = Math.round((obj.width ?? 0) * (obj.scaleX ?? 1))
  const h = Math.round((obj.height ?? 0) * (obj.scaleY ?? 1))

  return (
    <div className={styles.metaItem}>
      X: <em>{x}</em> Y: <em>{y}</em> W: <em>{w}</em> H: <em>{h}</em>
    </div>
  )
}

// ─── Zoom Controls ───

function ZoomControls() {
  const zoomStore = useZoomStore()
  const [inputValue, setInputValue] = useState('')
  const percent = Math.round(zoomStore.level * 100)

  useEffect(() => {
    setInputValue(`${percent}%`)
  }, [percent])

  const applyZoom = useCallback(
    (newLevel: number) => {
      const clamped = Math.max(0.1, Math.min(5, newLevel))
      zoomStore.setZoom({
        level: clamped,
        width: zoomStore.width,
        height: zoomStore.height,
      })
    },
    [zoomStore],
  )

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseInt(inputValue, 10)
      if (!isNaN(parsed)) {
        applyZoom(parsed / 100)
      }
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className={styles.zoomControls}>
      <button
        className={styles.zoomBtn}
        onClick={() => applyZoom(zoomStore.level / 1.1)}
        title="Zoom Out"
      >
        <LabelingIcon iconType="icon-minus" size="xs" />
      </button>
      <input
        className={styles.zoomInput}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleInputKeyDown}
        onBlur={() => setInputValue(`${percent}%`)}
      />
      <button
        className={styles.zoomBtn}
        onClick={() => applyZoom(zoomStore.level * 1.1)}
        title="Zoom In"
      >
        <LabelingIcon iconType="icon-plus" size="xs" />
      </button>
    </div>
  )
}

// ─── Save Button ───

function SaveButton({
  onSave,
  onSaveToRecord,
  isSaving,
}: {
  onSave: () => void
  onSaveToRecord?: () => void
  isSaving: boolean
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  if (!onSaveToRecord) {
    return (
      <button
        className={styles.controlBtnPrimary}
        disabled={isSaving}
        onClick={onSave}
      >
        <LabelingIcon iconType="icon-save" size="xs" />
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    )
  }

  return (
    <div className={styles.saveDropdownWrapper} ref={ref}>
      <div className={styles.controlBtnGroup}>
        <button
          className={styles.controlBtnPrimary}
          disabled={isSaving}
          onClick={onSave}
        >
          <LabelingIcon iconType="icon-save" size="xs" />
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          className={styles.controlBtnPrimary}
          onClick={() => setDropdownOpen((prev) => !prev)}
          disabled={isSaving}
        >
          <LabelingIcon iconType="icon-down" size="xxs" />
        </button>
      </div>
      {dropdownOpen && (
        <div className={styles.saveDropdown}>
          <button
            className={styles.saveDropdownItem}
            onClick={() => {
              onSave()
              setDropdownOpen(false)
            }}
          >
            Save
          </button>
          <button
            className={styles.saveDropdownItem}
            onClick={() => {
              onSaveToRecord?.()
              setDropdownOpen(false)
            }}
          >
            Save to Record
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Issue Panel Toggle ───

function IssuePanelToggle() {
  const isOpen = useIssuePanelStore((s) => s.isOpen)
  const toggle = useIssuePanelStore((s) => s.toggle)

  return (
    <button
      className={styles.toggleBtn}
      data-active={isOpen || undefined}
      onClick={toggle}
      title="Issues"
    >
      <LabelingIcon iconType="icon-issue" size="sm" />
    </button>
  )
}
