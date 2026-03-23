import { useLabelBatchStore } from "./labelBatch.store";
import { createTemporalHistoryStore } from "./labelingHistory.store";

type LabelBatchState = ReturnType<typeof useLabelBatchStore.getState>;
type ClassificationLabelEntry = LabelBatchState["classificationLabels"][number];

export type NumberLabelHistorySnapshot = {
  classificationLabels: ClassificationLabelEntry[];
  classificationDeletedIds: string[];
  committedClassificationDeletedIds: string[];
};

const isTableClassificationEntry = (entry: ClassificationLabelEntry) =>
  (entry.label.labelType ?? "").toUpperCase() === "TABLE";

export const useNumberLabelHistoryStore =
  createTemporalHistoryStore<NumberLabelHistorySnapshot>();

export const getNumberLabelHistorySnapshot = (
  state: LabelBatchState,
  tableLabelIdSet?: Set<string> | null
): NumberLabelHistorySnapshot => {
  const classificationLabels = state.classificationLabels.filter(
    isTableClassificationEntry
  );
  const deletedIds = tableLabelIdSet
    ? state.classificationDeletedIds.filter((id) => tableLabelIdSet.has(id))
    : state.classificationDeletedIds;
  const committedDeletedIds = tableLabelIdSet
    ? state.committedClassificationDeletedIds.filter((id) =>
        tableLabelIdSet.has(id)
      )
    : state.committedClassificationDeletedIds;
  return {
    classificationLabels,
    classificationDeletedIds: deletedIds,
    committedClassificationDeletedIds: committedDeletedIds,
  };
};

export const applyNumberLabelHistorySnapshot = (
  snapshot: NumberLabelHistorySnapshot | null,
  tableLabelIdSet?: Set<string> | null
) => {
  if (!snapshot) {
    return;
  }
  const state = useLabelBatchStore.getState();
  const preservedLabels = state.classificationLabels.filter(
    (entry) => !isTableClassificationEntry(entry)
  );
  const nextClassificationLabels = [
    ...preservedLabels,
    ...snapshot.classificationLabels,
  ];
  const preservedDeletedIds = tableLabelIdSet
    ? state.classificationDeletedIds.filter((id) => !tableLabelIdSet.has(id))
    : [];
  const preservedCommittedIds = tableLabelIdSet
    ? state.committedClassificationDeletedIds.filter(
        (id) => !tableLabelIdSet.has(id)
      )
    : [];

  useLabelBatchStore.getState().applyHistorySnapshot({
    classificationLabels: nextClassificationLabels,
    classificationDeletedIds: tableLabelIdSet
      ? [...preservedDeletedIds, ...snapshot.classificationDeletedIds]
      : snapshot.classificationDeletedIds,
    committedClassificationDeletedIds: tableLabelIdSet
      ? [...preservedCommittedIds, ...snapshot.committedClassificationDeletedIds]
      : snapshot.committedClassificationDeletedIds,
  });
};

const areArraysEqual = <T,>(a: T[], b: T[]) => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

export const areNumberLabelHistorySnapshotsEqual = (
  a: NumberLabelHistorySnapshot | null,
  b: NumberLabelHistorySnapshot | null
) => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    areArraysEqual(a.classificationLabels, b.classificationLabels) &&
    areArraysEqual(a.classificationDeletedIds, b.classificationDeletedIds) &&
    areArraysEqual(
      a.committedClassificationDeletedIds,
      b.committedClassificationDeletedIds
    )
  );
};
