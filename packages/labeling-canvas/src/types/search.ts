export type SearchFieldOperator =
  | "EQ"
  | "LIKE"
  | "GT"
  | "LT"
  | "GTE"
  | "LTE"
  | "IN"
  | "NIN"
  | "NULL"
  | "NOT_NULL"
  | "NOT_EMPTY"
  | "EMPTY"
  | "NOT"
  | "BETWEEN"
  | "ELEM_MATCH"
  | "ALL";

export type SearchFieldType = "STRING" | "NUMBER" | "DATE" | "BOOLEAN";

export interface SearchInfoField {
  field: string;
  value?: string | null;
  type: SearchFieldType;
  operator: SearchFieldOperator[];
  display: string;
  order: boolean;
}

export interface FilterFieldMeta {
  label: string;
  field: string;
  type: SearchFieldType;
  operatorOptions: Array<{ value: SearchFieldOperator; label: string }>;
  placeholder?: string;
  filter?: {
    operator: SearchFieldOperator;
    value: string | string[] | boolean | number | null;
  };
  isDropdownOpen: boolean;
  fromField?: string;
  toField?: string;
  fromFilter?: {
    operator: SearchFieldOperator;
    value: string | string[] | boolean | number | null;
  };
  toFilter?: {
    operator: SearchFieldOperator;
    value: string | string[] | boolean | number | null;
  };
  order: boolean;
  display: string;
}

export type SearchSchema = {
  filter?: string;
};
