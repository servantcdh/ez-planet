import type { SearchFieldOperator } from "@/types/search";

export interface ApiResponse<T> {
  code?: number;
  message?: string;
  data: T;
}

export interface ContentApiHeaders {
  orgId?: string;
  zoneId?: string;
  accountId?: string;
  userId?: string;
  userName?: string;
}

export interface SchemaProperty {
  fieldName: string;
  fieldType: string;
  isRequired?: boolean;
  isVisible?: boolean;
  customizable?: boolean;
}

export interface SchemaInfo {
  schemaName: string;
  isRequired?: boolean;
  isVisible?: boolean;
  contentType: ContentType;
  contentSize?: number;
  fileFormatList?: string[];
  properties?: SchemaProperty[];
  value?: unknown;
  contentCount?: number;
}

export interface GroupItem {
  id: string;
  exist?: boolean;
  orgId?: string;
  zoneId?: string;
  accountId?: string;
  groupName: string;
  description?: string;
  tags?: string[];
  previewUrls?: string[];
  schemaTypes?: string[];
  schemaGroup?: Record<string, SchemaInfo>;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
  recordCount?: number;
}

export interface SearchOperatorValue<T = unknown> {
  operator?: SearchFieldOperator;
  value?: T;
}

export interface SearchRequest {
  orderBy?: Record<string, "ASC" | "DESC">;
  pageSize?: number;
  pageNumber?: number;
  groupName?: SearchOperatorValue<string>;
  description?: SearchOperatorValue<string>;
  tags?: SearchOperatorValue<string[]>;
  exist?: SearchOperatorValue<boolean>;
  hasSchemas?: SearchOperatorValue<boolean>;
  createdBy?: SearchOperatorValue<string>;
  modifiedBy?: SearchOperatorValue<string>;
  fromCreatedDate?: SearchOperatorValue<string>;
  toCreatedDate?: SearchOperatorValue<string>;
  fromModifiedDate?: SearchOperatorValue<string>;
  toModifiedDate?: SearchOperatorValue<string>;
  schemaName?: SearchOperatorValue<string>;
  contentType?: SearchOperatorValue<ContentType | ContentType[]>;
  contentSize?: SearchOperatorValue<number>;
  isTemplate?: SearchOperatorValue<boolean>;
  fileFormat?: SearchOperatorValue<string | string[]>;
  status?: SearchOperatorValue<string>;
  transactionId?: SearchOperatorValue<string>;
  schemaLength?: SearchOperatorValue<number>;
}

export interface SearchResponse<TItem> {
  filter: SearchRequest;
  list: TItem[];
  totalCount: number;
}

export type ContentType =
  | "IMAGE"
  | "WORD"
  | "PDF"
  | "TABLE"
  | "TABULAR"
  | "TEXT"
  | "CUSTOM";
