import { useCallback, useRef } from 'react'
import type { FileContent } from '../types/public'
import styles from '../styles/file-section.module.css'

interface LabelingFileSectionProps {
  content?: FileContent
  readOnly?: boolean
  onFileUpload?: (file: File) => void
}

/**
 * File labeling section.
 * Shows file info when a file exists, or an upload area when empty.
 */
export function LabelingFileSection({
  content,
  readOnly = false,
  onFileUpload,
}: LabelingFileSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileUpload?.(file)
      }
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    [onFileUpload],
  )

  // File exists — show file info
  if (content?.fileName) {
    return (
      <div className={styles.fileSection}>
        <div className={styles.fileIcon}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className={styles.fileName}>{content.fileName}</div>
        {content.fileType && (
          <div className={styles.fileType}>{content.fileType}</div>
        )}
      </div>
    )
  }

  // No file — show upload area (if not read-only)
  if (readOnly) {
    return (
      <div className={styles.fileSection}>
        <div className={styles.emptyState}>No file content</div>
      </div>
    )
  }

  return (
    <div className={styles.fileSection}>
      <div className={styles.uploadArea} onClick={handleUploadClick}>
        <div className={styles.fileIcon}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className={styles.uploadText}>Click to upload file</div>
        <div className={styles.uploadHint}>or drag and drop</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
