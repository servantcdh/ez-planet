import type {
  ContentType,
  GroupItem,
} from "@/features/content-group/types/domain";

export interface DatasetApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface DatasetApiHeaders {
  orgId?: string;
  zoneId?: string;
  accountId?: string;
  userId?: string;
  userName?: string;
}

export type DatasetContentType =
  | "IMAGE"
  | "CSV"
  | "TABLE"
  | "PDF"
  | "WORD"
  | "TABULAR"
  | "CUSTOM"
  | (string & {});

export interface SchemaItemRequest {
  contentGroupId: string;
  schemaIdList: string[];
}

export type SchemaItem = SchemaItemRequest;

export interface SchemaPresetItemPropsRequest {
  schemaName: string;
  presetContentType: string;
  isRequired: boolean;
  contentSize: number;
}

export interface SchemaPresetItemRequest {
  presetList: SchemaPresetItemPropsRequest[];
}

interface CreateDatasetBaseRequest {
  name: string;
  isArchMode: boolean;
  tags?: string[];
}

export type CreateDatasetRequest =
  | (CreateDatasetBaseRequest & {
      schema: SchemaItemRequest;
      preset?: never;
    })
  | (CreateDatasetBaseRequest & {
      schema?: never;
      preset: SchemaPresetItemRequest;
    });

export interface DatasetUpdateRequest {
  name?: string;
  isArchMode?: boolean;
  tags?: string[];
  schema?: SchemaItemRequest;
  preset?: SchemaPresetItemRequest;
}

export interface DatasetSchemaProperty {
  fieldName: string;
  fieldType: string;
  isRequired?: boolean;
  isVisible?: boolean;
}

export interface DatasetPresetItem {
  schemaName: string;
  contentType: DatasetContentType;
  contentSize?: number;
  fileFormatList?: string[];
  isRequired?: boolean;
  isVisible?: boolean;
  properties?: DatasetSchemaProperty[];
}

export interface DatasetPresetListResponse {
  list: DatasetPresetItem[];
  totalCount: number;
}

export type SchemaSizeOperator = "EQ" | "GTE" | "LTE";

export interface SchemaCondition {
  schemaName?: string | null;
  contentType: ContentType;
  contentSize: number;
  sizeOperator?: SchemaSizeOperator;
}

export interface SearchContentGroupsBySchemaRequest {
  schemaConditions: SchemaCondition[];
  pageNumber?: number;
  pageSize?: number;
  orderBy?: Record<string, "ASC" | "DESC">;
}

export interface SearchContentGroupsBySchemaResponse {
  filter: SearchContentGroupsBySchemaRequest;
  list: GroupItem[];
  totalCount: number;
}

export interface SearchOperatorValue<T = unknown> {
  operator: string;
  value?: T;
}

export interface VersionDTO {
  version: string | null;
  versionedDate: string;
  versionRecords: string;
}

export interface BaseInfoDTO {
  contentSize?: number;
  contentType?: string;
  fileFormat?: string[];
  isRequired?: boolean;
  isPreset?: boolean;
  isVisible?: boolean;
  schemaId?: string;
  schemaName?: string;
}

export interface SchemaItemDTO {
  baseInfo: BaseInfoDTO;
  properties: Record<string, unknown>;
}

export interface DatasetDTO {
  id: string;
  orgId: string;
  zoneId: string;
  accountId: string;
  exist: boolean;
  name: string;
  latestVersion: string;
  currentVersion: string | null;
  records: string;
  versionList: VersionDTO[];
  isLock: boolean;
  isEditing: boolean;
  isArchMode: boolean;
  tags: string[];
  schema?: SchemaItemDTO[];
  importTransactionId?: string;
  createdId: string;
  createdBy: string;
  createdDate: string;
  modifiedId: string;
  modifiedBy: string;
  modifiedDate: string;
  schemaTypes: DatasetContentType[];
}

export interface CustomPageHelperDatasetDTO {
  filter?: unknown;
  list: DatasetDTO[];
  totalCount: number;
}

export type DatasetListResponse = CustomPageHelperDatasetDTO;

export interface DatasetListSearchRequest {
  createdBy?: SearchOperatorValue<string>;
  currentRecords?: SearchOperatorValue<number>;
  fromCreatedDate?: string;
  fromModifiedDate?: string;
  datasetId?: SearchOperatorValue<string>;
  isEditing?: SearchOperatorValue<boolean>;
  isLock?: SearchOperatorValue<boolean>;
  latestVersion?: SearchOperatorValue<string>;
  modifiedBy?: SearchOperatorValue<string>;
  name?: SearchOperatorValue<string>;
  orderBy?: Record<string, unknown>;
  pageNumber?: number;
  pageSize?: number;
  schemaName?: SearchOperatorValue<string>;
  tags?: SearchOperatorValue<string[]>;
  toCreatedDate?: string;
  toModifiedDate?: string;
  exist?: SearchOperatorValue<boolean>;
}

export const DEFAULT_DATASET_LIST_PARAMS: DatasetListSearchRequest = {
  orderBy: { modifiedDate: "DESC" },
  pageNumber: 1,
  pageSize: 20,
  exist: { operator: "EQ", value: true },
} as const;

export interface ContentDTO {
  accountId?: string;
  contents?: Record<string, Array<Record<string, unknown>>>;
  contentSetId?: string;
  createdBy?: string;
  createdDate?: string;
  createdId?: string;
  datasetId?: string;
  id?: string;
  modifiedBy?: string;
  modifiedDate?: string;
  modifiedId?: string;
  orgId?: string;
  summary?: Record<string, number>;
  transactionId?: string;
  version?: string | null;
  zoneId?: string;
}

export type DatasetContentRecord = ContentDTO;

export interface CustomListHelperContentDTO {
  list: DatasetContentRecord[];
}

export type DatasetContentListResponse = CustomListHelperContentDTO;

export interface ContentListSearchRequest {
  orderBy?: Record<string, unknown>;
  pageNumber?: number;
  pageSize?: number;
  fromCreatedDate?: string;
  toCreatedDate?: string;
  createdBy?: SearchOperatorValue<string>;
  fromModifiedDate?: string;
  toModifiedDate?: string;
  modifiedBy?: SearchOperatorValue<string>;
  datasetId: SearchOperatorValue<string>;
  version?: SearchOperatorValue<string>;
  contentSetIdList?: SearchOperatorValue<string[]>;
}

export interface DatasetContentSearchResponse {
  filter?: Record<string, unknown>;
  list: DatasetContentRecord[];
  totalCount: number;
}

export type CustomPageHelperContentDTO_Full = DatasetContentSearchResponse;

export interface DatasetContentDetailParams {
  datasetId: string;
  version: string;
  contentSetId: string;
  schemaNames: string[];
  showIntProps?: boolean;
}

export interface ImportContentMap {
  contentSchemaId: string;
  datasetSchemaId: string;
}

export interface ImportContentCondition {
  recordLength: SearchOperatorValue<number>;
}

export interface ContentImport {
  archRecords?: string;
  archVersion?: string;
  contentGroupId: string;
  datasetId: string;
  mapping: ImportContentMap[];
  mappingCondition?: ImportContentCondition;
  transactionId?: string;
}

export interface UpdateIsEditingRequest {
  isEditing: boolean;
}

export type ContentListSearchRequest_Full = ContentListSearchRequest;

export interface AcquireContentVersion {
  datasetId: string;
  version: string;
}

export interface AcquireContentVersionResponse {
  datasetId: string;
  isArchMode: boolean;
  requestVersion: string;
  archVersion: string;
}

export type CustomListHelperContentDTO_Full = CustomListHelperContentDTO;
export type CustomListHelperContentDTO_Summary = CustomListHelperContentDTO;
