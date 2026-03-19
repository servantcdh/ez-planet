import { useCallback, useRef } from 'react'
import type { TextContent } from '../types/public'
import { useTextSegmentSelectionStore } from '../store/text-segment-selection.store'
import { usePaletteStore, useOpacityStore } from '../store/palette.store'
import styles from '../styles/text-section.module.css'

interface LabelingTextSectionProps {
  content?: TextContent
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
 * Text labeling section — renders text content with highlighted segments.
 * Users can select text to create new segments via mouseup events.
 */
export function LabelingTextSection({
  content,
  readOnly = false,
  segments = [],
}: LabelingTextSectionProps) {
  const textRef = useRef<HTMLDivElement>(null)
  const setSelectedSegment = useTextSegmentSelectionStore((s) => s.setSelectedSegment)
  const colorCode = usePaletteStore((s) => s.colorCode)
  const opacity = useOpacityStore((s) => s.opacity)

  const handleMouseUp = useCallback(() => {
    if (readOnly) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !textRef.current) return

    const range = selection.getRangeAt(0)
    const textNode = textRef.current
    if (!textNode.contains(range.startContainer) || !textNode.contains(range.endContainer)) return

    // Calculate offset within text content
    const preRange = document.createRange()
    preRange.selectNodeContents(textNode)
    preRange.setEnd(range.startContainer, range.startOffset)
    const start = preRange.toString().length

    const selectedText = range.toString()
    const end = start + selectedText.length

    if (end > start) {
      setSelectedSegment({
        key: `${Date.now()}`,
        labelId: null,
        tempId: `temp-${Date.now()}`,
        start,
        end,
        text: selectedText,
        color: colorCode,
        opacity,
      })
    }

    selection.removeAllRanges()
  }, [readOnly, setSelectedSegment, colorCode, opacity])

  if (!content) {
    return (
      <div className={styles.textSection}>
        <div className={styles.emptyState}>No text content</div>
      </div>
    )
  }

  // Build rendered text with highlighted segments
  const rendered = renderTextWithSegments(content.value, segments)

  return (
    <div className={styles.textSection}>
      <div
        ref={textRef}
        className={styles.textContent}
        onMouseUp={handleMouseUp}
      >
        {rendered}
      </div>
    </div>
  )
}

function renderTextWithSegments(
  text: string,
  segments: Array<{ id: string; start: number; end: number; color: string; opacity?: number }>,
) {
  if (!segments.length) return text

  // Sort segments by start position
  const sorted = [...segments].sort((a, b) => a.start - b.start)

  const parts: Array<string | JSX.Element> = []
  let cursor = 0

  for (const seg of sorted) {
    if (seg.start > cursor) {
      parts.push(text.slice(cursor, seg.start))
    }
    parts.push(
      <span
        key={seg.id}
        className={styles.segment}
        style={{
          backgroundColor: seg.color,
          opacity: seg.opacity ?? 0.4,
        }}
      >
        {text.slice(seg.start, seg.end)}
      </span>,
    )
    cursor = seg.end
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return <>{parts}</>
}
