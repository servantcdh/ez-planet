import type { DatasetContentVersion } from "@/features/dataset/queries";

export interface ApiResponse<T> {
  code?: number;
  message?: string;
  data: T;
}

export interface LabelingApiHeaders {
  orgId?: string;
  zoneId?: string;
  accountId?: string;
  userId?: string;
  userName?: string;
}

export type LabelOrderDirection = "ASC" | "DESC" | "asc" | "desc";

export interface SearchOperatorFilter<TValue> {
  operator: string;
  value: TValue;
}

export type ValidType = "CONTENTSET" | "ELEMENT" | "LABEL";

export interface ValidResultCreateRequest {
  labelContextId: string;
  datasetId: string;
  datasetVersion: string;
  contentSetId: string;
  elementId?: string;
  policyId?: string;
  labelId?: string;
  result: boolean;
  reason?: string;
  validType: ValidType;
}

export interface ValidResultUpdateRequest {
  result?: boolean;
  reason?: string;
  validType?: ValidType;
}

export interface ValidResultResponse {
  id: string;
  labelContextId: string;
  datasetId: string;
  datasetVersion: string;
  contentSetId: string;
  elementId?: string;
  policyId?: string;
  labelId?: string;
  result: boolean;
  reason?: string;
  validType: ValidType;
  validatedDate?: string;
  organizationId?: string;
  accountId?: string;
  zoneId?: string;
  userId?: string;
  modifiedBy?: string;
  modifiedDate?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface ValidResultSearchRequest {
  orderBy?: Record<string, LabelOrderDirection>;
  pageNumber?: number;
  pageSize?: number;
  labelContextId?: SearchOperatorFilter<string>;
  contentSetId?: SearchOperatorFilter<string>;
  elementId?: SearchOperatorFilter<string>;
  policyId?: SearchOperatorFilter<string>;
  validType?: SearchOperatorFilter<ValidType>;
}

export type ValidResultSearchResult = CustomPageWrapper<
  ValidResultResponse,
  ValidResultSearchRequest
>;

export interface ValidResultBulkDeleteRequest {
  validResultIds: string[];
}

export interface ValidResultBulkDeleteResponse {
  deletedIds: string[];
  failedIds: string[];
  successCount: number;
  failureCount: number;
  totalCount: number;
}

export interface LabelSearchRequest {
  labelContextId: SearchOperatorFilter<string>;
  contentSetId?: SearchOperatorFilter<string>;
  elementId?: SearchOperatorFilter<string>;
  unitType?: SearchOperatorFilter<LabelUnitType>;
  orderBy?: Record<string, LabelOrderDirection>;
  pageNumber?: number;
  pageSize?: number;
}

export interface CustomPageWrapper<TItem, TFilter = unknown> {
  list: TItem[];
  totalCount: number;
  filter: TFilter;
}

export type LabelSearchResult = CustomPageWrapper<
  LabelDetailResponse,
  LabelSearchRequest
>;

export type LabelInferenceType =
  | "CLASSIFICATION"
  | "OBJECT_DETECTION"
  | "SEGMENTATION"
  | "RECOGNITION";

export type LabelType = "FILE" | "TABLE";

export type LabelUnitType = "CONTENTSET" | "ELEMENT";

export type LabelAttributeType = "SELECT" | "CHECKBOX" | "TEXT";

export interface AttributeValue {
  attributeType?: LabelAttributeType;
  name?: string;
  values?: string[];
}

export interface AutoLabelingInfo {
  modelId?: string;
  externalModelId?: string;
  scores?: Score[];
  transactionId?: string;
  containerId?: string;
  status?: string;
  inferenceType?: string;
  threshold?: number;
}

export interface Score {
  className?: string;
  score?: number;
  [key: string]: unknown;
}

export interface ClassificationValue {
  classIndex?: number;
  className?: string;
}

export interface BoxValue {
  className?: string;
  classIndex?: number;
  coord?: number[];
  color?: string;
  lineColor?: string;
  opacity?: number;
  zindex?: number;
}

export interface SegmentationResponseValue {
  className?: string;
  classIndex?: number;
  bucket?: string;
  objectName?: string;
  endpoint?: string;
  segVector?: string;
  segColor?: string;
  segOrder?: number;
  segOpacity?: number;
  color?: string;
  opacity?: number;
  zindex?: number;
}

export interface SegmentationBase64Value {
  className?: string;
  classIndex?: number;
  segColor?: string;
  segOrder?: number;
  segOpacity?: number;
  segBuffer: string;
  segVector?: string;
  segContentType?: string;
}

export interface ChartValue {
  className?: string;
  classIndex?: number;
  columnName?: string;
  color?: string;
  opacity?: number;
  zindex?: number;
}

export interface RecognitionValue {
  className?: string;
  classIndex?: number;
  start?: number;
  end?: number;
  text?: string;
  color?: string;
  opacity?: number;
  zindex?: number;
}

export type LabelValue =
  | ClassificationValue
  | BoxValue
  | SegmentationResponseValue
  | SegmentationBase64Value
  | ChartValue
  | RecognitionValue
  | FileValue
  | unknown;

export interface FileValue {
  bucket?: string;
  objectName?: string;
  endpoint?: string;
  fileName?: string;
  [key: string]: unknown;
}

export interface LabelDetailResponse {
  id: string;
  labelContextId: string;
  contentId?: string;
  contentSetId?: string;
  elementId?: string;
  policyId: string;
  schemaName?: string;
  isLabeled?: boolean;
  organizationId?: string;
  accountId?: string;
  zoneId?: string;
  userId?: string;
  autoLabelingInfo?: AutoLabelingInfo;
  inferenceType?: LabelInferenceType;
  labelType?: LabelType;
  unitType?: LabelUnitType;
  labelValue?: LabelValue;
  attributeValues?: AttributeValue[];
  modifiedBy?: string;
  modifiedDate?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface LabelContextResponse {
  id: string;
  datasetId: string;
  datasetVersion?: string | number;
  policyIds: string[];
  enable?: boolean;
  organizationId?: string;
  accountId?: string;
  zoneId?: string;
  userId?: string;
  inLabeling?: boolean;
  isLabeled?: boolean;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface LabelContextCreateRequest {
  datasetId: string;
  datasetVersion: string | number;
  policyIds: string[];
}

export interface LabelContextUpdateRequest {
  policyIds?: string[];
  inLabeling?: boolean;
  enable?: boolean;
}

export type LabelCopyType = "POLICY" | "DATASET";

export interface LabelCopyRequest {
  copyType: LabelCopyType;
  sourcePolicyId?: string;
  targetPolicyId?: string;
  targetLabelContextId?: string;
  targetPolicyIds?: string[];
  sourceDatasetId?: string;
  sourceDatasetVersion?: string;
}

export interface LabelCopyResponse {
  copyType?: LabelCopyType;
  copiedCount?: number;
  skippedCount?: number;
  totalProcessedCount?: number;
  copiedLabelIds?: string[];
  message?: string;
  sourcePolicyId?: string;
  targetPolicyId?: string;
  targetLabelContextId?: string;
  sourceDatasetId?: string;
  sourceDatasetVersion?: string;
}

export interface LabelContextQueryParams {
  datasetId: string;
  datasetVersion: DatasetContentVersion;
}

export interface LabelContextStatusRequest {
  contentSetIds?: string[];
  elementIds?: string[];
}

export interface ContentsetStatusResponse {
  labelContextId: string;
  datasetId: string;
  contentSets: ContentsetStatus[];
}

export type ContentsetStatusState =
  | "IN_LABELING"
  | "COMPLETED"
  | "VALIDATION_COMPLETED"
  | "VALIDATION_ERROR";

export interface ContentsetStatus {
  contentSetId: string;
  totalCount?: number;
  // New spec: array of statuses
  contentSetStatus?: ContentsetStatusState[];
  // Legacy fallback for backward compatibility
  contentsetStatus?: "NONE" | ContentsetStatusState;
  schemas?: SchemaStatus[];
  elements?: ElementStatus[];
}

export interface ElementStatus {
  elementId?: string;
  inLabeling?: boolean;
  /**
   * New spec (OAS): elementStatus 배열로 상태를 내려줌
   * - IN_LABELING / VALIDATION_ERROR / VALIDATION_COMPLETED
   */
  elementStatus?: ContentsetStatusState[];
  policyStatuses?: PolicyLabelStatus[];
}

export interface PolicyLabelStatus {
  policyId?: string;
  labelId?: string;
  status?: ContentsetStatusState[];
  hasValidationError?: boolean;
}

export interface SchemaStatus {
  name?: string;
  totalCount?: number;
  elements?: ElementStatus[];
}

export interface PreviousLabelContextWithLabelsResponse {
  id: string;
  datasetId: string;
  datasetVersion: string;
  policyIds: string[];
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface InLabelingStatusResponse {
  inLabeling: boolean;
}

export interface BulkLabelCreateRequest {
  labels: LabelInsertData[];
}

export interface BulkLabelCreateResponse {
  labelContextId: string;
  createdLabels: LabelResponse[];
}

export interface FileLabelUploadRequest {
  file: File;
  contentSetId?: string;
  elementId?: string;
  policyId: string;
  schemaName?: string;
}

export interface LabelContextEnableResponse {
  enable: boolean;
}

export interface LabelStatusCreateRequest {
  labelContextId: string;
  contentSetId: string;
  elementId: string;
  isLabeling?: boolean;
}

export interface LabelStatusResponse {
  id: string;
  labelContextId: string;
  contentSetId: string;
  elementId: string;
  isLabeling?: boolean;
  organizationId?: string;
  accountId?: string;
  zoneId?: string;
  userId?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface LabelInsertData {
  contentSetId?: string;
  elementId?: string; // 엘레멘트 단위 라벨 생성 시 사용
  policyId: string;
  schemaName?: string; // 엘레먼트 단위 라벨 생성 시 사용
  inferenceType?: LabelInferenceType; // 레코드 단위 라벨 생성 시 classification 고정
  /**
   * labelType 설명
   * inferenceType classification 전용
   * 파일 업로드 기반 라벨 > FILE
   * 차트(Number) 기반 라벨 > TABLE
   * 그외 타입의 엘레멘트 단위 or 레코드 단위 라벨 > 사용 안함
   */
  labelType?: LabelType;
  /**
   * unitType 설명
   * 엘레멘트 단위 > ELEMENT
   * 레코드 단위 > CONTENTSET
   */
  unitType?: LabelUnitType;
  labelValue?: LabelValue;
  attributeValues?: AttributeValue[];
  isLabeled?: boolean;
}

export interface LabelUpdateData extends LabelInsertData {
  id: string;
}

export interface LabelDeleteData {
  id: string;
}

export interface LabelBatchUpdateRequest {
  deletes?: LabelDeleteData[];
  inserts?: LabelInsertData[];
  updates?: LabelUpdateData[];
}

export interface BatchUpdateSummary {
  deletedCount?: number;
  insertedCount?: number;
  updatedCount?: number;
  totalProcessed?: number;
}

export interface LabelResponse extends LabelDetailResponse {
  version: DatasetContentVersion;
}

export interface LabelBatchUpdateResponse {
  deletedIds?: string[];
  insertedLabels?: LabelResponse[];
  updatedLabels?: LabelResponse[];
  summary?: BatchUpdateSummary;
}
