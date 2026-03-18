import type { LabelingWorkspaceProps } from '../types/public'
import { LabelingProvider, useLabelingContext } from './LabelingProvider'
import { LabelingCanvas } from './LabelingCanvas'
import { LabelingNavigation } from './LabelingNavigation'
import { LabelingInfoPanel } from './LabelingInfoPanel'
import { LabelingToolbar } from './LabelingToolbar'
import { LabelingIndicator } from './LabelingIndicator'
import styles from '../styles/workspace.module.css'

/**
 * Level 1: All-in-one labeling workspace.
 * Renders Navigation + Toolbar + Canvas + InfoPanel in a single component.
 */
export function LabelingWorkspace(props: LabelingWorkspaceProps) {
  return (
    <LabelingProvider
      image={props.image}
      annotations={props.annotations}
      onChange={props.onChange}
      records={props.records}
      activeRecordId={props.activeRecordId}
      onRecordSelect={props.onRecordSelect}
      classes={props.classes}
      onClassSelect={props.onClassSelect}
      onSave={props.onSave}
      isSaving={props.isSaving}
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
        {/* Controls Bar */}
        <div className={styles.controls}>
          <div className={styles.controlsLeft}>
            <LabelingIndicator indicator={ctx.indicator} />
          </div>
          <div className={styles.controlsRight}>
            {/* Zoom info could go here */}
          </div>
        </div>

        {/* Canvas */}
        <div className={styles.canvasArea}>
          <LabelingCanvas
            image={ctx.image}
            annotations={ctx.annotations}
            onChange={ctx.onChange}
            readOnly={isReadOnly}
          />

          {/* Floating Toolbar */}
          {!isReadOnly && (
            <LabelingToolbar
              tools={ctx.tools}
              onSave={() => ctx.onSave({
                annotations: ctx.annotations,
                canvasJSON: {},
                image: typeof ctx.image === 'string'
                  ? { width: 0, height: 0 }
                  : { width: ctx.image.width, height: ctx.image.height },
              })}
              isSaving={ctx.isSaving}
            />
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
