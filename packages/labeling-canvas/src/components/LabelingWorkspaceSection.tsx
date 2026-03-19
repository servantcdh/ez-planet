import type { ReactNode } from 'react'
import type {
  Annotation,
  CanvasChangeEvent,
  FileContent,
  NumberContent,
  TextContent,
  WorkspaceViewMode,
} from '../types/public'
import { LabelingCanvas } from './LabelingCanvas'
import { LabelingTextSection } from './LabelingTextSection'
import { LabelingNumberSection } from './LabelingNumberSection'
import { LabelingFileSection } from './LabelingFileSection'

interface LabelingWorkspaceSectionProps {
  viewMode: WorkspaceViewMode
  // Image props
  image: string | { url: string; width: number; height: number }
  annotations: Annotation[]
  onChange?: (event: CanvasChangeEvent) => void
  readOnly?: boolean
  // Content-specific
  textContent?: TextContent
  numberContent?: NumberContent
  fileContent?: FileContent
  onFileUpload?: (file: File) => void
  // Slots
  children?: ReactNode
}

/**
 * View-mode switching container.
 * Shows the appropriate content section based on the current view mode.
 */
export function LabelingWorkspaceSection({
  viewMode,
  image,
  annotations,
  onChange,
  readOnly = false,
  textContent,
  numberContent,
  fileContent,
  onFileUpload,
  children,
}: LabelingWorkspaceSectionProps) {
  switch (viewMode) {
    case 'Image':
      return (
        <LabelingCanvas
          image={image}
          annotations={annotations}
          onChange={onChange}
          readOnly={readOnly}
        />
      )

    case 'Text':
      return (
        <LabelingTextSection
          content={textContent}
          readOnly={readOnly}
        />
      )

    case 'Number':
      return (
        <LabelingNumberSection
          content={numberContent}
          readOnly={readOnly}
        />
      )

    case 'File':
      return (
        <LabelingFileSection
          content={fileContent}
          readOnly={readOnly}
          onFileUpload={onFileUpload}
        />
      )

    case 'Record':
      // Record mode typically shows the navigation table as the primary content.
      // The children slot allows embedding additional UI.
      return <>{children}</>

    default:
      return (
        <LabelingCanvas
          image={image}
          annotations={annotations}
          onChange={onChange}
          readOnly={readOnly}
        />
      )
  }
}
