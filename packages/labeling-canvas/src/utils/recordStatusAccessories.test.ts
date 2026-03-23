import { describe, expect, it } from "vitest";

import { VIRTUALIZED_RECORDS_ROW_META_SYMBOL } from "@/components/organisms/VirtualizedRecordsTable";

import {
  LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
  type LabelingRecordsTableRow,
} from "../components/LabelingRecordsTable";
import type { ContentsetStatus, SchemaStatus } from "../types/domain";
import type { LabelingSchemaEntry } from "../types/recordSelection";
import {
  applyLabelingRecordStatusAccessories,
  buildSchemaSummaryCountMap,
} from "./recordStatusAccessories";

const schemaEntry: LabelingSchemaEntry = {
  label: "schemaA",
  summaryKeys: ["schemaA"],
  detailSchemaNames: ["schemaA"],
  contentType: "TEXT",
  isRequired: false,
  maxItems: null,
};

function createRow(contentSetId: string): LabelingRecordsTableRow {
  return {
    __rownum: "1",
    schemaA: "1",
    [VIRTUALIZED_RECORDS_ROW_META_SYMBOL]: {
      rowId: contentSetId,
      rowRef: {
        id: contentSetId,
        contentSetId,
      },
      columnRefs: {},
    },
  } as unknown as LabelingRecordsTableRow;
}

describe("recordStatusAccessories", () => {
  it("buildSchemaSummaryCountMap normalizes summary count by content set", () => {
    const map = buildSchemaSummaryCountMap([
      {
        id: "1",
        contentSetId: "cs-1",
        summary: { schemaA: 3 },
      } as never,
      {
        id: "2",
        contentsetId: "cs-2",
        summary: { schemaA: 2 },
      } as never,
    ]);

    expect(map.get("cs-1")?.get("schemaA")).toBe(3);
    expect(map.get("cs-2")?.get("schemaA")).toBe(2);
  });

  it("applyLabelingRecordStatusAccessories marks labeled/completed accessories", () => {
    const rows = [createRow("cs-1")];
    const contentSetStatusMap = new Map<string, ContentsetStatus>([
      [
        "cs-1",
        {
          contentSetId: "cs-1",
          totalCount: 1,
          contentSetStatus: ["COMPLETED"],
        },
      ],
    ]);
    const schemaStatusMap = new Map<string, Map<string, SchemaStatus>>([
      [
        "cs-1",
        new Map([
          [
            "schemaA",
            {
              name: "schemaA",
              totalCount: 1,
              elements: [
                {
                  elementId: "el-1",
                  elementStatus: ["VALIDATION_COMPLETED"],
                  policyStatuses: [{ status: ["COMPLETED"] }],
                },
              ],
            },
          ],
        ]),
      ],
    ]);
    const schemaSummaryCountMap = buildSchemaSummaryCountMap([
      {
        id: "cs-1",
        contentSetId: "cs-1",
        summary: { schemaA: 1 },
      } as never,
    ]);

    const result = applyLabelingRecordStatusAccessories({
      rows,
      schemaEntries: [schemaEntry],
      contentSetStatusMap,
      schemaStatusMap,
      schemaSummaryCountMap,
    });

    const accessories = result[0][LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL];
    expect(accessories?.__rownum?.badges?.map((badge) => badge.title)).toContain(
      "Labeled"
    );
    expect(accessories?.schemaA?.badges?.map((badge) => badge.title)).toContain(
      "Labeled"
    );
    expect(accessories?.schemaA?.hasValidationCompleted).toBe(true);
  });

  it("applyLabelingRecordStatusAccessories marks validation issue", () => {
    const rows = [createRow("cs-2")];
    const schemaStatusMap = new Map<string, Map<string, SchemaStatus>>([
      [
        "cs-2",
        new Map([
          [
            "schemaA",
            {
              name: "schemaA",
              totalCount: 0,
              elements: [
                {
                  elementId: "el-2",
                  elementStatus: ["VALIDATION_ERROR"],
                  policyStatuses: [{ status: ["VALIDATION_ERROR"] }],
                },
              ],
            },
          ],
        ]),
      ],
    ]);

    const result = applyLabelingRecordStatusAccessories({
      rows,
      schemaEntries: [schemaEntry],
      contentSetStatusMap: new Map(),
      schemaStatusMap,
      schemaSummaryCountMap: buildSchemaSummaryCountMap([
        {
          id: "cs-2",
          contentSetId: "cs-2",
          summary: { schemaA: 1 },
        } as never,
      ]),
    });

    const accessories = result[0][LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL];
    expect(accessories?.schemaA?.hasIssue).toBe(true);
  });
});
