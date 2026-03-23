import { useLabelBatchStore } from "./labelBatch.store";
import { createTemporalHistoryStore } from "./labelingHistory.store";

type LabelBatchState = ReturnType<typeof useLabelBatchStore.getState>;

export type TextLabelHistorySnapshot = Pick<
  LabelBatchState,
  | "recognitionLabels"
  | "recognitionDeletedIds"
  | "committedRecognitionDeletedIds"
>;

export const useTextLabelHistoryStore =
  createTemporalHistoryStore<TextLabelHistorySnapshot>();

export const getTextLabelHistorySnapshot = (
  state: LabelBatchState
): TextLabelHistorySnapshot => ({
  recognitionLabels: state.recognitionLabels,
  recognitionDeletedIds: state.recognitionDeletedIds,
  committedRecognitionDeletedIds: state.committedRecognitionDeletedIds,
});

export const applyTextLabelHistorySnapshot = (
  snapshot: TextLabelHistorySnapshot | null
) => {
  if (!snapshot) {
    return;
  }
  useLabelBatchStore.getState().applyHistorySnapshot({
    recognitionLabels: snapshot.recognitionLabels,
    recognitionDeletedIds: snapshot.recognitionDeletedIds,
    committedRecognitionDeletedIds: snapshot.committedRecognitionDeletedIds,
  });
};

export const areTextLabelHistorySnapshotsEqual = (
  a: TextLabelHistorySnapshot | null,
  b: TextLabelHistorySnapshot | null
) => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.recognitionLabels === b.recognitionLabels &&
    a.recognitionDeletedIds === b.recognitionDeletedIds &&
    a.committedRecognitionDeletedIds === b.committedRecognitionDeletedIds
  );
};
