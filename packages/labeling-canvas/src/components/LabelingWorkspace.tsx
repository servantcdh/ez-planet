import type { LabelingWorkspaceProps } from '../types/public'
import { LabelingProvider, useLabelingContext } from './LabelingProvider'
import { LabelingWorkspaceControl } from './LabelingWorkspaceControl'
import { LabelingWorkspaceSection } from './LabelingWorkspaceSection'
import { LabelingNavigation } from './LabelingNavigation'
import { LabelingInfoPanel } from './LabelingInfoPanel'
import { LabelingToolbar } from './LabelingToolbar'
import { LabelingIndicator } from './LabelingIndicator'
import styles from '../styles/workspace.module.css'

/**
 * Level 1: All-in-one labeling workspace.
 * Renders WorkspaceControl + Navigation + WorkspaceSection + FloatingToolbar + InfoPanel.
 */
export function LabelingWorkspace(props: LabelingWorkspaceProps) {
  return (
    <LabelingProvider
      image={props.image}
      annotations={props.annotations}
      onChange={props.onChange}
      viewMode={props.viewMode}
      onViewModeChange={props.onViewModeChange}
      availableViewModes={props.availableViewModes}
      textContent={props.textContent}
      numberContent={props.numberContent}
      fileContent={props.fileContent}
      records={props.records}
      activeRecordId={props.activeRecordId}
      onRecordSelect={props.onRecordSelect}
      classes={props.classes}
      policies={props.policies}
      onClassSelect={props.onClassSelect}
      onSave={props.onSave}
      onSaveToRecord={props.onSaveToRecord
        ? () => props.onSaveToRecord?.({ contentSetId: props.activeRecordId, labels: [] })
        : undefined}
      onFileUpload={props.onFileUpload
        ? (file: File) => props.onFileUpload?.({ file, policyId: '', contentSetId: props.activeRecordId })
        : undefined}
      isSaving={props.isSaving}
      onNavigateLeft={props.onNavigateLeft}
      onNavigateRight={props.onNavigateRight}
      canNavigateLeft={props.canNavigateLeft}
      canNavigateRight={props.canNavigateRight}
      mode={props.mode}
      onModeChange={props.onModeChange}
      validationResults={props.validationResults}
      indicator={props.indicator}
      extensions={props.extensions}
      tools={props.tools}
      theme={props.theme}
      layout={props.layout}
    >
      <WorkspaceInner />
    </LabelingProvider>
  )
}

function WorkspaceInner() {
  const ctx = useLabelingContext()
  const isReadOnly = ctx.mode === 'readonly'
  const showNav = ctx.navVisible && ctx.layout.navigation !== 'hidden'
  const navPosition = ctx.navDirection

  const layoutAttr =
    showNav && navPosition === 'horizontal'
      ? 'with-nav-left'
      : showNav && navPosition === 'vertical'
        ? 'with-nav-bottom'
        : undefined

  return (
    <div className={styles.workspace} data-layout={layoutAttr}>
      {/* Navigation - Left */}
      {showNav && navPosition === 'horizontal' && (
        <LabelingNavigation
          records={ctx.records}
          activeRecordId={ctx.activeRecordId}
          onRecordSelect={ctx.onRecordSelect}
          direction={ctx.navDirection}
          onDirectionChange={ctx.setNavDirection}
        />
      )}

      {/* Main Area */}
      <div className={styles.mainSection}>
        {/* WorkspaceControl (top bar) */}
        <LabelingWorkspaceControl
          viewMode={ctx.viewMode}
          onViewModeChange={ctx.onViewModeChange}
          availableViewModes={ctx.availableViewModes}
          mode={ctx.mode}
          onModeChange={ctx.onModeChange}
          onSave={() => ctx.onSave({
            viewMode: ctx.viewMode,
            inserts: [],
            updates: [],
            deletes: [],
          })}
          onSaveToRecord={ctx.onSaveToRecord}
          isSaving={ctx.isSaving}
          onNavigateLeft={ctx.onNavigateLeft}
          onNavigateRight={ctx.onNavigateRight}
          canNavigateLeft={ctx.canNavigateLeft}
          canNavigateRight={ctx.canNavigateRight}
        />

        {/* Content Area */}
        <div className={styles.canvasArea}>
          <LabelingWorkspaceSection
            viewMode={ctx.viewMode}
            image={ctx.image}
            annotations={ctx.annotations}
            onChange={ctx.onChange}
            readOnly={isReadOnly}
            textContent={ctx.textContent}
            numberContent={ctx.numberContent}
            fileContent={ctx.fileContent}
            onFileUpload={ctx.onFileUpload}
          />

          {/* Floating Toolbar — shown for Image/Text/Number modes */}
          {!isReadOnly && ctx.viewMode !== 'Record' && ctx.viewMode !== 'File' && (
            <LabelingToolbar />
          )}

          {/* Indicator overlay */}
          {ctx.indicator && (
            <LabelingIndicator indicator={ctx.indicator} />
          )}
        </div>

        {/* Side Panel */}
        <div className={styles.sidePanel}>
          <LabelingInfoPanel
            classes={ctx.classes}
            annotations={ctx.annotations}
            selectedAnnotationId={ctx.selectedAnnotationId}
            onClassSelect={ctx.onClassSelect}
            onAnnotationSelect={(annotation) => ctx.setSelectedAnnotationId(annotation.id)}
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Navigation - Bottom */}
      {showNav && navPosition === 'vertical' && (
        <LabelingNavigation
          records={ctx.records}
          activeRecordId={ctx.activeRecordId}
          onRecordSelect={ctx.onRecordSelect}
          direction={ctx.navDirection}
          onDirectionChange={ctx.setNavDirection}
        />
      )}
    </div>
  )
}
