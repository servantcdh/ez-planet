// ─── Tool Info Identifiers ───

export const TOOL_INFO_BRUSH = 'Brush'
export const TOOL_INFO_BOUNDED_BOX = 'Bounded Box'
export const TOOL_INFO_FILLED_BOX = 'Filled Box'
export const TOOL_INFO_FILLED_POLYGON = 'Filled Polygon'
export const TOOL_INFO_MAGIC_BRUSH = 'Magic Brush'
export const TOOL_INFO_SUPERPIXEL = 'Superpixel'
export const TOOL_INFO_BRUSHCURSOR = 'BrushCursor'
export const TOOL_INFO_SUPERPIXEL_BOUNDARY = 'SuperpixelBoundary'
export const TOOL_INFO_COMBINED_LABELS = 'Combined Label'
export const TOOL_INFO_AUTO_LABELING = 'Auto Labeling'
export const TOOL_INFO_SEGMENT_ANYTHING = 'Segment Anything'
export const TOOL_INFO_SEGMENT_ANYTHING_BOX = 'Segment Anything Box'
export const TOOL_INFO_UPLOADED_LABEL = 'Uploaded Label'
export const TOOL_INFO_ERASER = 'Eraser'

// ─── SAM ───

export const SEGMENT_ANYTHING_MASKINPUT_POSITIVE = 1
export const SEGMENT_ANYTHING_MASKINPUT_NEGATIVE = 0

// ─── Tool Groups ───

export const BUFFER_TOOLS = [
  TOOL_INFO_MAGIC_BRUSH,
  TOOL_INFO_SUPERPIXEL,
  TOOL_INFO_AUTO_LABELING,
  TOOL_INFO_COMBINED_LABELS,
  TOOL_INFO_UPLOADED_LABEL,
]

export const EXCEPTION_TOOLS = [
  TOOL_INFO_BRUSHCURSOR,
  TOOL_INFO_SUPERPIXEL_BOUNDARY,
  TOOL_INFO_SEGMENT_ANYTHING_BOX,
]

export const MOVEMENT_LOCK_TOOLS = [
  TOOL_INFO_SEGMENT_ANYTHING,
  TOOL_INFO_SUPERPIXEL,
  TOOL_INFO_SUPERPIXEL_BOUNDARY,
  TOOL_INFO_MAGIC_BRUSH,
  TOOL_INFO_AUTO_LABELING,
  TOOL_INFO_UPLOADED_LABEL,
]

// ─── Label Types ───

export const LABEL_TYPE_CLASSIFICATION = 'classification'
export const LABEL_TYPE_OBJECT_DETECTION = 'object detection'
export const LABEL_TYPE_SEGMENTATION = 'segmentation'

// ─── Export Props ───

export const EXPORT_PROPS = [
  'id',
  'unique',
  'hex',
  'alpha',
  'info',
  'selected',
  'class',
  'added',
  'index',
  'seq',
  'copied',
  'combinded',
  'labeler',
  'labelInsertData',
  'labelPayload',
  'pathContours',
  'pathEditableContourIndex',
  'pathBaseOffset',
  'points',
]

// ─── Stroke Width ───

export const STROKE_WIDTH_BOUNDED_BOX = 5
export const STROKE_WIDTH_SEGMENT_ANYTHING_BOX = 3
