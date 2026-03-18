import { type ChangeEvent, useCallback, useMemo, useState } from 'react'
import type { WorkspaceRecord } from '../types/public'
import styles from '../styles/navigation.module.css'

interface LabelingNavigationProps {
  records: WorkspaceRecord[]
  activeRecordId: string
  onRecordSelect: (record: WorkspaceRecord) => void
  direction?: 'horizontal' | 'vertical'
  onDirectionChange?: (direction: 'horizontal' | 'vertical') => void
  hidden?: boolean
}

export function LabelingNavigation({
  records,
  activeRecordId,
  onRecordSelect,
  direction = 'horizontal',
  onDirectionChange,
  hidden = false,
}: LabelingNavigationProps) {
  const [search, setSearch] = useState('')

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records
    const term = search.trim().toLowerCase()
    return records.filter((r) =>
      r.title.toLowerCase().includes(term) ||
      r.children?.some((c) => c.title.toLowerCase().includes(term))
    )
  }, [records, search])

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const position = direction === 'vertical' ? 'bottom' : 'left'

  return (
    <div
      className={styles.navigationWrapper}
      data-position={position}
      data-hidden={hidden || undefined}
    >
      <div className={styles.title}>
        <p>Navigation</p>
        {onDirectionChange && (
          <div className={styles.titleUtil}>
            <button
              className={styles.directionButton}
              data-active={direction === 'horizontal' || undefined}
              onClick={() => onDirectionChange('horizontal')}
              title="Side panel"
            >
              <SidebarIcon />
            </button>
            <button
              className={styles.directionButton}
              data-active={direction === 'vertical' || undefined}
              onClick={() => onDirectionChange('vertical')}
              title="Bottom panel"
            >
              <BottombarIcon />
            </button>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search records..."
          value={search}
          onChange={handleSearch}
        />

        {filteredRecords.length === 0 ? (
          <div className={styles.empty}>No records found</div>
        ) : (
          <div className={styles.recordList}>
            {filteredRecords.map((record) => (
              <RecordItem
                key={record.id}
                record={record}
                activeRecordId={activeRecordId}
                onRecordSelect={onRecordSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Record Item ───

function RecordItem({
  record,
  activeRecordId,
  onRecordSelect,
}: {
  record: WorkspaceRecord
  activeRecordId: string
  onRecordSelect: (record: WorkspaceRecord) => void
}) {
  const isActive = record.id === activeRecordId
  const hasChildren = record.children && record.children.length > 0
  const [expanded, setExpanded] = useState(isActive || false)

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setExpanded((prev) => !prev)
    }
    onRecordSelect(record)
  }, [hasChildren, onRecordSelect, record])

  return (
    <>
      <div
        className={styles.recordItem}
        data-active={isActive || undefined}
        onClick={handleClick}
      >
        {record.thumbnail && (
          <img
            className={styles.recordThumbnail}
            src={record.thumbnail}
            alt={record.title}
          />
        )}
        <span className={styles.recordTitle}>{record.title}</span>
        {record.status && (
          <span className={styles.recordStatus} data-status={record.status} />
        )}
      </div>
      {hasChildren && expanded && (
        <div className={styles.childrenList}>
          {record.children!.map((child) => (
            <RecordItem
              key={child.id}
              record={child}
              activeRecordId={activeRecordId}
              onRecordSelect={onRecordSelect}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Icons ───

function SidebarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5" y1="1" x2="5" y2="13" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function BottombarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
