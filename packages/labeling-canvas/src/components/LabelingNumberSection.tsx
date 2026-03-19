import { useCallback } from 'react'
import type { NumberContent } from '../types/public'
import { useNumberSegmentSelectionStore } from '../store/number-segment-selection.store'
import { usePaletteStore } from '../store/palette.store'
import styles from '../styles/number-section.module.css'

interface LabelingNumberSectionProps {
  content?: NumberContent
  readOnly?: boolean
  segments?: Array<{
    id: string
    start: number
    end: number
    color: string
    opacity?: number
  }>
}

/**
 * Number/chart labeling section.
 * Renders a data table from source data. Chart rendering is delegated to the host
 * app or a future extension (canvas-based chart is complex and library-dependent).
 */
export function LabelingNumberSection({
  content,
  readOnly = false,
  segments = [],
}: LabelingNumberSectionProps) {
  const setSelectedSegment = useNumberSegmentSelectionStore((s) => s.setSelectedSegment)
  const colorCode = usePaletteStore((s) => s.colorCode)

  const handleRowClick = useCallback(
    (index: number) => {
      if (readOnly) return
      setSelectedSegment({
        key: `${Date.now()}`,
        labelId: null,
        tempId: `temp-${Date.now()}`,
        start: index,
        end: index,
        color: colorCode,
      })
    },
    [readOnly, setSelectedSegment, colorCode],
  )

  if (!content) {
    return (
      <div className={styles.numberSection}>
        <div className={styles.emptyState}>No number content</div>
      </div>
    )
  }

  const { source } = content
  const columns = source.columns as Array<{ key: string; label: string }>
  const rows = source.rows as Array<Record<string, unknown>>

  return (
    <div className={styles.numberSection}>
      {/* Chart area — placeholder for host-app chart rendering */}
      <div className={styles.chartArea}>
        {content.canRender ? (
          <div className={styles.chartPlaceholder}>
            Chart ({content.mode}) — rendered by host app
          </div>
        ) : (
          <div className={styles.chartPlaceholder}>
            Cannot render chart for this data
          </div>
        )}
      </div>

      {/* Data Table */}
      {rows.length > 0 && (
        <div className={styles.dataTable}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isSegmented = segments.some(
                  (s) => index >= s.start && index <= s.end,
                )
                return (
                  <tr
                    key={index}
                    data-selected={isSegmented || undefined}
                    onClick={() => handleRowClick(index)}
                    style={{ cursor: readOnly ? 'default' : 'pointer' }}
                  >
                    <td>{index + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key}>{String(row[col.key] ?? '')}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
