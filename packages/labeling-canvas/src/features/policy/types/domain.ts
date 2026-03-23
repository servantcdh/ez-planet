// Basic response wrapper
export interface ApiResponse<T> {
  code?: number;
  message?: string;
  data: T;
}

export interface PolicyApiHeaders {
  orgId?: string;
  zoneId?: string;
  accountId?: string;
  userId?: string;
  userName?: string;
}

export interface Attribute {
  name: string;
  attributeType: "SELECT" | "CHECKBOX" | "TEXT";
  values: string[];
  placeholder?: string;
}

export interface Class {
  name: string;
  color: string;
  opacity?: number;
  index?: number;
  attributes?: Attribute[] | null;
}

export interface Version {
  id: string;
  version: string;
  classCount: number;
  elementCount: number;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface PolicyDetail {
  id: string;
  basePolicyId: string;
  version: string;
  baseVersion: string;
  name: string;
  exist: boolean;
  classes: Class[];
  elements?: string[];
  tags?: string[];
  versions: Version[];
  zoneId: string;
  organizationId: string;
  accountId: string;
  userId: string;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
  copyLabel?: boolean;
}

export interface PolicyCreateRequest {
  name: string;
  classes: Class[];
  elements?: string[];
  tags?: string[];
}

export interface PolicyUpdateRequest {
  classes?: Class[];
  elements?: string[];
  tags?: string[];
  isCopy?: boolean;
}

export interface PolicyBatchGetRequest {
  ids: string[];
}

export interface PolicyDeleteRequest {
  ids: string[];
}

export type SearchOperator =
  | "EQ"
  | "LIKE"
  | "IN"
  | "GTE"
  | "LTE"
  | "GT"
  | "LT"
  | "NIN"
  | "NULL"
  | "NOT_NULL"
  | "NOT_EMPTY"
  | "EMPTY"
  | "NOT"
  | "BETWEEN"
  | "ELEM_MATCH"
  | "ALL";

export interface SearchOperatorValue<T = unknown> {
  operator: SearchOperator;
  value?: T;
}

export interface PolicySearchRequest {
  orderBy?: Record<string, "ASC" | "DESC" | "asc" | "desc">;
  pageSize?: number;
  pageNumber?: number;
  fromCreatedDate?: SearchOperatorValue<string>;
  toCreatedDate?: SearchOperatorValue<string>;
  createdBy?: SearchOperatorValue<string>;
  fromModifiedDate?: SearchOperatorValue<string>;
  toModifiedDate?: SearchOperatorValue<string>;
  modifiedBy?: SearchOperatorValue<string>;
  name?: SearchOperatorValue<string>;
  version?: SearchOperatorValue<string>;
  classes?: SearchOperatorValue<number>;
  elements?: SearchOperatorValue<number>;
  tags?: SearchOperatorValue<string>;
}

export const DEFAULT_POLICY_SEARCH_PARAMS: PolicySearchRequest = {
  orderBy: { modifiedDate: "DESC" },
  pageNumber: 1,
  pageSize: 10,
};

export interface PolicySearchResponse {
  list: PolicyDetail[];
  filter: PolicySearchRequest;
  totalCount: number;
}

export interface TagUpdateByIdRequest {
  id: string;
  tags?: string[];
}

export interface TagUpdateRequest {
  ids?: TagUpdateByIdRequest[];
  filter?: PolicySearchRequest;
  tagsByFilter?: string[];
}

export interface BulkUpdate {
  modifiedCount?: number;
  matchedCount?: number;
  requestedCount?: number;
}

export interface SearchField {
  operator?: string[];
  field?: string;
  value?: string;
  type?: "STRING" | "NUMBER" | "DATE" | "BOOLEAN";
  display?: string;
  order?: boolean;
}
