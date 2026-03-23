import type {
  DatasetContentRecord,
  SchemaItemDTO,
} from "@/features/dataset/types/domain";

import type {
  LabelingRecordsCellAccessoriesMap,
  LabelingRecordsTableRow,
} from "../components/LabelingRecordsTable";

export interface LabelingSchemaEntry {
  label: string;
  summaryKeys: string[];
  detailSchemaNames: string[];
  contentType: string;
  isRequired: boolean;
  maxItems: number | string | null;
  schema?: SchemaItemDTO;
}

export interface LabelingDatasetCellReference {
  datasetId: string;
  version: string;
  contentSetId: string;
  schemaNames: string[];
  schemaLabel: string;
  contentType: string;
  isRequired: boolean;
  maxItems: number | string | null;
  showIntProps?: boolean;
}

export interface LabelingRecordSelection {
  datasetId: string | null;
  record: DatasetContentRecord;
  displayRow: LabelingRecordsTableRow;
  schemaEntries: LabelingSchemaEntry[];
  schemaNameToContentType: Record<string, string>;
  accessories?: LabelingRecordsCellAccessoriesMap;
  detailReference?: LabelingDatasetCellReference;
  rowIndex: number;
  rowId: string;
}
