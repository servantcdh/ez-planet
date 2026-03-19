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
  const allSegments = segments.length > 0 ? segments : (content.segments ?? [])

  // Normalize columns: accept string[] or {key,label}[]
  const normalizedColumns: Array<{ key: string; label: string }> =
    source.columns.map((col, i) =>
      typeof col === 'string'
        ? { key: String(i), label: col }
        : col as { key: string; label: string },
    )

  // Normalize rows: accept number[][] or Record[]
  const isArrayRows = Array.isArray(source.rows[0])

  return (
    <div className={styles.numberSection}>
      {/* Chart area — placeholder for host-app chart rendering */}
      {content.canRender && (
        <div className={styles.chartArea}>
          <div className={styles.chartPlaceholder}>
            Chart ({content.mode ?? 'line'}) — rendered by host app
          </div>
        </div>
      )}

      {/* Data Table */}
      {source.rows.length > 0 && (
        <div className={styles.dataTable}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                {normalizedColumns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {source.rows.map((row, index) => {
                const isSegmented = allSegments.some(
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
                    {normalizedColumns.map((col, colIdx) => (
                      <td key={col.key}>
                        {String(
                          isArrayRows
                            ? (row as unknown[])[colIdx] ?? ''
                            : (row as Record<string, unknown>)[col.key] ?? '',
                        )}
                      </td>
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
