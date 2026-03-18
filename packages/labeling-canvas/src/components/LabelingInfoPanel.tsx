import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Annotation, LabelingClass } from '../types/public'
import styles from '../styles/panel.module.css'

interface LabelingInfoPanelProps {
  classes: LabelingClass[]
  annotations: Annotation[]
  selectedAnnotationId?: string | null
  onClassSelect?: (cls: LabelingClass) => void
  onAnnotationSelect?: (annotation: Annotation) => void
  onAnnotationDelete?: (annotationId: string) => void
  disabled?: boolean
}

export function LabelingInfoPanel({
  classes,
  annotations,
  selectedAnnotationId,
  onClassSelect,
  onAnnotationSelect,
  onAnnotationDelete,
  disabled = false,
}: LabelingInfoPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'class' | 'label'>('class')
  const [activeClassId, setActiveClassId] = useState<string>(classes[0]?.id ?? '')

  // Sync active class when classes change
  useEffect(() => {
    if (classes.length > 0 && !classes.find((c) => c.id === activeClassId)) {
      setActiveClassId(classes[0].id)
    }
  }, [classes, activeClassId])

  // Group classes by group
  const groupedClasses = useMemo(() => {
    const groups = new Map<string, LabelingClass[]>()
    for (const cls of classes) {
      const group = cls.group ?? ''
      const arr = groups.get(group) ?? []
      arr.push(cls)
      groups.set(group, arr)
    }
    return groups
  }, [classes])

  const handleClassClick = useCallback(
    (cls: LabelingClass) => {
      if (disabled) return
      setActiveClassId(cls.id)
      onClassSelect?.(cls)
    },
    [disabled, onClassSelect],
  )

  // Keyboard shortcut: 1-9 for class selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return
      const target = e.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      ) {
        return
      }
      const key = e.key
      const matched = classes.find((c) => c.hotkey === key)
      if (matched) {
        e.preventDefault()
        handleClassClick(matched)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [classes, disabled, handleClassClick])

  return (
    <div className={styles.infoPanel}>
      {/* Tabs */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <div className={styles.tabs}>
            <button
              className={styles.tab}
              data-active={selectedTab === 'class' || undefined}
              onClick={() => setSelectedTab('class')}
            >
              Class
            </button>
            <button
              className={styles.tab}
              data-active={selectedTab === 'label' || undefined}
              onClick={() => setSelectedTab('label')}
            >
              Label
            </button>
          </div>
        </div>

        {/* Class Tab */}
        {selectedTab === 'class' && (
          <div className={styles.sectionContent}>
            <div className={styles.classList}>
              {Array.from(groupedClasses.entries()).map(([group, items]) => (
                <div key={group || '__default'}>
                  {group && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', padding: '0.25rem 0', marginTop: '0.25rem' }}>
                      {group}
                    </div>
                  )}
                  {items.map((cls) => (
                    <button
                      key={cls.id}
                      className={styles.classButton}
                      data-active={activeClassId === cls.id || undefined}
                      disabled={disabled}
                      onClick={() => handleClassClick(cls)}
                    >
                      <div
                        className={styles.classColorDot}
                        style={{ backgroundColor: cls.color }}
                      />
                      <span className={styles.className}>{cls.name}</span>
                      {cls.hotkey && (
                        <span className={styles.classHotkey}>{cls.hotkey}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Label Tab */}
        {selectedTab === 'label' && (
          <div className={styles.sectionContent}>
            {annotations.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: '#64748b', padding: '1rem 0', textAlign: 'center' }}>
                No labels yet
              </div>
            ) : (
              <div className={styles.labelList}>
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className={styles.labelItem}
                    data-selected={selectedAnnotationId === annotation.id || undefined}
                    onClick={() => onAnnotationSelect?.(annotation)}
                  >
                    <div
                      className={styles.classColorDot}
                      style={{ backgroundColor: annotation.style.color, opacity: annotation.style.opacity }}
                    />
                    <p>{annotation.label.name || annotation.type}</p>
                    {onAnnotationDelete && (
                      <button
                        style={{
                          marginLeft: 'auto',
                          padding: '0.125rem 0.25rem',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAnnotationDelete(annotation.id)
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
