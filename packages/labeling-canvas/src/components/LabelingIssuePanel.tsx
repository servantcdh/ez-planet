import { useCallback, useState } from 'react'
import type {
  Annotation,
  ValidateEvent,
  ValidationDeleteEvent,
  ValidationResult,
  ValidationUpdateEvent,
} from '../types/public'
import styles from '../styles/validation.module.css'

interface LabelingIssuePanelProps {
  annotations: Annotation[]
  validationResults: ValidationResult[]
  selectedAnnotationId?: string | null
  onAnnotationSelect?: (annotation: Annotation) => void
  onValidate?: (event: ValidateEvent) => void | Promise<void>
  onValidationUpdate?: (event: ValidationUpdateEvent) => void | Promise<void>
  onValidationDelete?: (event: ValidationDeleteEvent) => void | Promise<void>
}

export function LabelingIssuePanel({
  annotations,
  validationResults,
  selectedAnnotationId,
  onAnnotationSelect,
  onValidate,
  onValidationUpdate: _onValidationUpdate,
  onValidationDelete,
}: LabelingIssuePanelProps) {
  const [reason, setReason] = useState('')
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)

  const failCount = validationResults.filter((r) => !r.result).length

  const handleApprove = useCallback(async () => {
    if (!selectedAnnotationId) return
    await onValidate?.({
      annotationIds: [selectedAnnotationId],
      result: true,
    })
  }, [selectedAnnotationId, onValidate])

  const handleReject = useCallback(async () => {
    if (!selectedAnnotationId) return
    await onValidate?.({
      annotationIds: [selectedAnnotationId],
      result: false,
      reason: reason || undefined,
    })
    setReason('')
  }, [selectedAnnotationId, reason, onValidate])

  const handleDeleteResult = useCallback(
    async (id: string) => {
      await onValidationDelete?.({ ids: [id] })
    },
    [onValidationDelete],
  )

  const getAnnotationForResult = useCallback(
    (result: ValidationResult) => {
      if (!result.annotationId) return null
      return annotations.find((a) => a.id === result.annotationId) ?? null
    },
    [annotations],
  )

  return (
    <div className={styles.issuePanel}>
      <div className={styles.issuePanelTitle}>
        <span>Validation</span>
        {failCount > 0 && (
          <span className={styles.issueCount}>{failCount} issues</span>
        )}
      </div>

      {/* Validation Results List */}
      {validationResults.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No validation results yet</p>
        </div>
      ) : (
        validationResults.map((result) => {
          const annotation = getAnnotationForResult(result)
          return (
            <div
              key={result.id}
              className={styles.issueItem}
              data-selected={selectedResultId === result.id || undefined}
              data-result={result.result ? 'pass' : 'fail'}
              onClick={() => {
                setSelectedResultId(result.id)
                if (annotation) {
                  onAnnotationSelect?.(annotation)
                }
              }}
            >
              <div className={styles.issueHeader}>
                <span className={styles.issueLabel}>
                  {annotation?.label.name ?? `Annotation ${result.annotationId ?? result.id}`}
                </span>
                <span
                  className={styles.issueBadge}
                  data-result={result.result ? 'pass' : 'fail'}
                >
                  {result.result ? 'Pass' : 'Fail'}
                </span>
              </div>
              {result.reason && (
                <p className={styles.issueReason}>{result.reason}</p>
              )}
              {result.validatedAt && (
                <span className={styles.issueDate}>{result.validatedAt}</span>
              )}
              {onValidationDelete && (
                <button
                  className={styles.validateButton}
                  data-variant="secondary"
                  style={{ marginTop: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteResult(result.id)
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )
        })
      )}

      {/* Validation Actions */}
      {onValidate && (
        <div className={styles.validationActions}>
          <textarea
            className={styles.reasonInput}
            placeholder="Reason (optional)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}
      {onValidate && (
        <div className={styles.validationActions}>
          <button
            className={styles.validateButton}
            data-variant="approve"
            disabled={!selectedAnnotationId}
            onClick={handleApprove}
          >
            Approve
          </button>
          <button
            className={styles.validateButton}
            data-variant="reject"
            disabled={!selectedAnnotationId}
            onClick={handleReject}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
