import type { WorkspaceIndicator } from '../types/public'
import styles from '../styles/panel.module.css'

interface LabelingIndicatorProps {
  indicator?: WorkspaceIndicator
}

export function LabelingIndicator({ indicator }: LabelingIndicatorProps) {
  if (!indicator) return null

  return (
    <div className={styles.indicator}>
      <span>{indicator.title}</span>
      {indicator.subtitle && <span>: {indicator.subtitle}</span>}
      {indicator.detail && <span> {indicator.detail}</span>}
      {indicator.progress && (
        <span className={styles.indicatorProgress}>
          ({indicator.progress.current}/{indicator.progress.total})
        </span>
      )}
    </div>
  )
}
