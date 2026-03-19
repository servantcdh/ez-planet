import type { WorkspaceViewMode } from '../types/public'
import { useImageLabelingUIMeta } from './labelingUIMeta/image'
import { useTextLabelingUIMeta } from './labelingUIMeta/text'
import { useNumberLabelingUIMeta } from './labelingUIMeta/number'
import { useRecordLabelingUIMeta } from './labelingUIMeta/record'
import { useFileLabelingUIMeta } from './labelingUIMeta/file'
import { useValidationLabelingUIMeta } from './labelingUIMeta/validation'
import type { LabelingUIMetaResult } from './labelingUIMeta/types'

export function useLabelingUIMeta(
  viewMode: WorkspaceViewMode,
  isValidationMode: boolean,
): LabelingUIMetaResult {
  const imageResult = useImageLabelingUIMeta()
  const textResult = useTextLabelingUIMeta()
  const numberResult = useNumberLabelingUIMeta()
  const recordResult = useRecordLabelingUIMeta()
  const fileResult = useFileLabelingUIMeta()
  const validationResult = useValidationLabelingUIMeta()

  if (isValidationMode) {
    return validationResult
  }

  switch (viewMode) {
    case 'Image':
      return imageResult
    case 'Text':
      return textResult
    case 'Number':
      return numberResult
    case 'Record':
      return recordResult
    case 'File':
      return fileResult
    default:
      return imageResult
  }
}
