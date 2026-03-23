import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

import type {
  LabelBatchUpdateRequest,
  LabelDeleteData,
  LabelInsertData,
  LabelUpdateData,
} from "../types/domain";
import { serializeFabricObjectToLabel } from "../utils/fabricLabelSerializer";
import { toHex } from "../utils/imageLabelingColors";
import type { LabeledFabricObject } from "../utils/imageLabelingTypes";

type LabelInsertWithOptionalId = LabelInsertData & { id?: string };

interface FabricLabelEntry {
  key: string;
  label: LabelInsertWithOptionalId;
  labelId?: string;
}

interface ClassificationLabelEntry {
  tempId: string;
  label: LabelInsertWithOptionalId;
  color?: string;
}

interface RecognitionLabelEntry {
  tempId: string;
  label: LabelInsertWithOptionalId;
  color?: string;
}

type LabelBatchHistoryPayload = {
  classificationLabels: ClassificationLabelEntry[];
  classificationDeletedIds: string[];
  committedClassificationDeletedIds: string[];
  recognitionLabels: RecognitionLabelEntry[];
  recognitionDeletedIds: string[];
  committedRecognitionDeletedIds: string[];
};

interface LabelBatchState {
  labelContextId: string | null;
  fabricEntries: Record<string, FabricLabelEntry>;
  fabricDeletedIds: string[];
  classificationLabels: ClassificationLabelEntry[];
  classificationDeletedIds: string[];
  committedClassificationDeletedIds: string[];
  recognitionLabels: RecognitionLabelEntry[];
  recognitionDeletedIds: string[];
  committedRecognitionDeletedIds: string[];
  inserts: LabelInsertData[];
  updates: LabelUpdateData[];
  deletes: LabelDeleteData[];
  setLabelContextId: (id: string | null) => void;
  syncFabricObjects: (objects: LabeledFabricObject[]) => void;
  addClassificationLabel: (
    label: LabelInsertWithOptionalId,
    meta?: { tempId?: string; color?: string; opacity?: number }
  ) => void;
  removeClassificationLabel: (tempId: string) => void;
  removeClassificationLabelById: (labelId: string) => void;
  clearTemporaryClassificationLabels: () => void;
  commitPendingClassificationDeletes: () => void;
  trimCommittedClassificationDeletes: (existingIds: Set<string>) => void;
  trimClassificationDeletes: (existingIds: Set<string>) => void;
  addRecognitionLabel: (
    label: LabelInsertWithOptionalId,
    meta?: { tempId?: string; color?: string }
  ) => void;
  removeRecognitionLabel: (tempId: string) => void;
  removeRecognitionLabelById: (labelId: string) => void;
  clearTemporaryRecognitionLabels: () => void;
  commitPendingRecognitionDeletes: () => void;
  trimCommittedRecognitionDeletes: (existingIds: Set<string>) => void;
  trimRecognitionDeletes: (existingIds: Set<string>) => void;
  replaceFabricEntriesFromServer: (objects: LabeledFabricObject[]) => void;
  updateFabricEntryLabel: (key: string, label: LabelInsertWithOptionalId) => void;
  removeFabricEntryByKey: (key: string) => void;
  clearPendingChanges: () => void;
  applyHistorySnapshot: (
    partialState: Partial<LabelBatchHistoryPayload>
  ) => void;
  resetWorkspaceChanges: () => void;
  getPayload: () => LabelBatchUpdateRequest;
  labelDataRevision: number;
  bumpLabelDataRevision: () => void;
  reset: () => void;
}

const stripId = (label: LabelInsertWithOptionalId): LabelInsertData => {
  const { id: _omit, ...rest } = label;
  void _omit;
  return rest;
};

let latestFabricSyncToken = 0;
let lastSyncedFabricLabelSignatures = new Map<string, string>();
let refreshBaselineOnNextSync = false;

const roundNumber = (value: unknown): number | unknown => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }
  const rounded = Number(value.toFixed(4));
  return Number.isFinite(rounded) ? rounded : value;
};

const canonicalizeColor = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const { hex } = toHex(value);
  return `#${hex}`;
};

const normalizeJSONLike = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJSONLike(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>);
    entries.sort();
    const normalized: Record<string, unknown> = {};
    entries.forEach((key) => {
      const current = (value as Record<string, unknown>)[key];
      if (current === null || current === undefined) {
        return;
      }
      normalized[key] = normalizeJSONLike(current);
    });
    return normalized;
  }
  return roundNumber(value);
};

const canonicalizeSegVector = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  const parsed =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;
  if (!parsed) {
    return null;
  }
  try {
    return JSON.stringify(normalizeJSONLike(parsed));
  } catch {
    return null;
  }
};

const normalizeLabelForSignature = (
  label: LabelInsertWithOptionalId
): LabelInsertData => {
  const stripped = stripId(label);
  const value = stripped.labelValue as Record<string, unknown> | undefined;
  if (
    stripped.inferenceType === "OBJECT_DETECTION" &&
    value &&
    Array.isArray(value.coord)
  ) {
    const coord = value.coord.map((v) => Math.round(Number(v) || 0));
    return {
      ...stripped,
      labelValue: {
        ...value,
        coord,
        color: canonicalizeColor(value.color),
        lineColor: canonicalizeColor(value.lineColor),
      },
    };
  }
  if (stripped.inferenceType === "SEGMENTATION" && value) {
    const { segBuffer: _omit, segVector, vectorData, ...rest } = value;
    const vectorSignature = canonicalizeSegVector(segVector ?? vectorData);
    void _omit;
    return {
      ...stripped,
      labelValue: {
        ...rest,
        segVector: vectorSignature ?? undefined,
        segColor: canonicalizeColor(rest.segColor),
      },
    };
  }
  return stripped;
};

const buildLabelSignature = (label: LabelInsertWithOptionalId): string | null => {
  try {
    const normalized = normalizeLabelForSignature(label);
    return JSON.stringify(normalized);
  } catch {
    return null;
  }
};

const toStableKey = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.length) {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
};

const normalizeLabelTarget = <
  T extends { elementId?: string | null; schemaName?: string | null }
>(
  label: T
): T => {
  const next = { ...label } as T;
  if (typeof next.elementId !== "string" || next.elementId.length === 0) {
    delete (next as { elementId?: string }).elementId;
  }
  if (typeof next.schemaName !== "string" || next.schemaName.length === 0) {
    delete (next as { schemaName?: string }).schemaName;
  }
  return next;
};

const sanitizePendingPayload = (
  payload: LabelBatchUpdateRequest
): LabelBatchUpdateRequest => {
  const deletes = payload.deletes ?? [];
  const updates = payload.updates ?? [];
  const inserts = payload.inserts ?? [];

  const deleteIds = new Set(
    deletes
      .map((item) => item.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  const updatesMap = new Map<string, LabelUpdateData>();
  updates.forEach((item) => {
    if (!item.id || deleteIds.has(item.id)) {
      return;
    }
    updatesMap.set(item.id, item);
  });

  const insertsMap = new Map<string, LabelInsertData>();
  inserts.forEach((item, index) => {
    const key =
      (item as { id?: string }).id ??
      toStableKey(item, `insert-${index.toString()}`);
    const id = (item as { id?: string }).id;
    if (id && deleteIds.has(id)) {
      return;
    }
    if (!insertsMap.has(key)) {
      insertsMap.set(key, item);
    }
  });

  const uniqueDeletes = Array.from(deleteIds).map((id) => ({ id }));

  return {
    inserts: Array.from(insertsMap.values()),
    updates: Array.from(updatesMap.values()),
    deletes: uniqueDeletes,
  };
};

const buildPendingPayload = (
  state: Pick<
    LabelBatchState,
    | "fabricEntries"
    | "fabricDeletedIds"
    | "classificationLabels"
    | "classificationDeletedIds"
    | "recognitionLabels"
    | "recognitionDeletedIds"
  >
) => {
  const fabricInserts: LabelInsertData[] = [];
  const fabricUpdates: LabelUpdateData[] = [];

  Object.values(state.fabricEntries).forEach((entry) => {
    const labelId = entry.labelId;
    if (labelId) {
      const signature = buildLabelSignature(entry.label);
      const baselineSignature = lastSyncedFabricLabelSignatures.get(labelId);
      if (signature && baselineSignature === signature) {
        return;
      }
      fabricUpdates.push({
        ...normalizeLabelTarget(entry.label as LabelInsertData),
        id: labelId,
      });
      return;
    }
    fabricInserts.push(normalizeLabelTarget(stripId(entry.label)));
  });

  const classificationInserts: LabelInsertData[] = [];
  const classificationUpdates: LabelUpdateData[] = [];
  state.classificationLabels.forEach((entry) => {
    const labelId = entry.label.id;
    if (labelId) {
      classificationUpdates.push({
        ...normalizeLabelTarget(entry.label as LabelInsertData),
        id: labelId,
      });
      return;
    }
    classificationInserts.push(normalizeLabelTarget(stripId(entry.label)));
  });

  const recognitionInserts: LabelInsertData[] = [];
  const recognitionUpdates: LabelUpdateData[] = [];
  state.recognitionLabels.forEach((entry) => {
    const labelId = entry.label.id;
    if (labelId) {
      recognitionUpdates.push({
        ...normalizeLabelTarget(entry.label as LabelInsertData),
        id: labelId,
      });
      return;
    }
    recognitionInserts.push(normalizeLabelTarget(stripId(entry.label)));
  });

  const deletes: LabelDeleteData[] = [
    ...new Set([
      ...state.fabricDeletedIds,
      ...state.classificationDeletedIds,
      ...state.recognitionDeletedIds,
    ]),
  ]
    .filter((id): id is string => Boolean(id))
    .map((id) => ({ id }));

  const rawPayload: LabelBatchUpdateRequest = {
    inserts: [...fabricInserts, ...classificationInserts, ...recognitionInserts],
    updates: [...fabricUpdates, ...classificationUpdates, ...recognitionUpdates],
    deletes,
  };

  return sanitizePendingPayload(rawPayload);
};

const getClassificationKey = (label: LabelInsertWithOptionalId): string | null => {
  if (label.inferenceType !== "CLASSIFICATION") {
    return null;
  }
  const value = label.labelValue as
    | { classIndex?: number; className?: string; columnName?: string }
    | undefined;
  const policyId = label.policyId ?? "";
  const classIndex =
    typeof value?.classIndex === "number" ? `idx-${value.classIndex}` : null;
  const className = value?.className ? `name-${value.className}` : null;
  const keyPart = classIndex ?? className;
  if (!keyPart) {
    return null;
  }
  const isTableLabel = (label.labelType ?? "").toUpperCase() === "TABLE";
  if (isTableLabel) {
    const elementKey = label.elementId ? label.elementId : "no-element";
    const columnKey = value?.columnName ? value.columnName : "no-column";
    return `${policyId}::${keyPart}::${elementKey}::${columnKey}`;
  }
  return `${policyId}::${keyPart}`;
};

const getRecognitionKey = (label: LabelInsertWithOptionalId): string | null => {
  if (label.inferenceType !== "RECOGNITION") {
    return null;
  }
  const value = label.labelValue as
    | {
        start?: number;
        end?: number;
        classIndex?: number;
        className?: string;
      }
    | undefined;
  const start =
    typeof value?.start === "number" && Number.isFinite(value.start)
      ? Math.max(0, Math.floor(value.start))
      : null;
  const end =
    typeof value?.end === "number" && Number.isFinite(value.end)
      ? Math.max(0, Math.floor(value.end))
      : null;
  if (start === null || end === null) {
    return null;
  }
  const classIndex =
    typeof value?.classIndex === "number" ? `idx-${value.classIndex}` : null;
  const className = value?.className ? `name-${value.className}` : null;
  const classPart = classIndex ?? className ?? "no-class";
  const policyId = label.policyId ?? "";
  return `${policyId}::${start}-${end}::${classPart}`;
};

export const useLabelBatchStore = create<LabelBatchState>((set, get) => ({
  labelContextId: null,
  fabricEntries: {},
  fabricDeletedIds: [],
  classificationLabels: [],
  classificationDeletedIds: [],
  committedClassificationDeletedIds: [],
  recognitionLabels: [],
  recognitionDeletedIds: [],
  committedRecognitionDeletedIds: [],
  inserts: [],
  updates: [],
  deletes: [],
  labelDataRevision: 0,
  setLabelContextId: (id) => set({ labelContextId: id }),
  syncFabricObjects: (objects) => {
    const currentToken = ++latestFabricSyncToken;
    const serializeTasks = objects.map(async (object) => {
      try {
        const label = await serializeFabricObjectToLabel(object);
        return { object, label };
      } catch (error) {
        // eslint-disable-next-line no-console -- 직렬화 실패 진단용
        console.error(
          "[labelBatch.store] failed to serialize fabric object",
          error
        );
        return { object, label: null };
      }
    });

    Promise.all(serializeTasks).then((results) => {
      if (currentToken !== latestFabricSyncToken) {
        return;
      }
      const prevEntries = get().fabricEntries;
      const deletedIds = refreshBaselineOnNextSync
        ? new Set<string>()
        : new Set(get().fabricDeletedIds);
      const nextEntries: Record<string, FabricLabelEntry> = {};
      const currentKeys = new Set<string>();

      results.forEach(({ object, label }) => {
        const entryKey = object.unique ?? label?.id ?? object.toString();
        if (entryKey) {
          currentKeys.add(entryKey);
        }
        if (label) {
          if (label.id) {
            deletedIds.delete(label.id);
          }
          nextEntries[entryKey] = {
            key: entryKey,
            label,
            labelId: label.id,
          };
          return;
        }
        const prevEntry = prevEntries[entryKey];
        if (prevEntry) {
          nextEntries[entryKey] = prevEntry;
        }
      });

      if (!refreshBaselineOnNextSync) {
        Object.keys(prevEntries).forEach((key) => {
          if (!nextEntries[key]) {
            const removed = prevEntries[key];
            if (removed?.labelId && !currentKeys.has(key)) {
              deletedIds.add(removed.labelId);
            }
          }
        });
      }

      const partialState = {
        fabricEntries: nextEntries,
        fabricDeletedIds: Array.from(deletedIds),
      };
      if (refreshBaselineOnNextSync) {
        const nextBaseline = new Map<string, string>();
        Object.values(partialState.fabricEntries).forEach((entry) => {
          if (!entry.labelId) {
            return;
          }
          const signature = buildLabelSignature(entry.label);
          if (signature) {
            nextBaseline.set(entry.labelId, signature);
          }
        });
        lastSyncedFabricLabelSignatures = nextBaseline;
        partialState.fabricDeletedIds = [];
        refreshBaselineOnNextSync = false;
      }
      const pending = buildPendingPayload({
        ...get(),
        ...partialState,
      });
      set({
        ...partialState,
        ...pending,
      });
    });
  },
  addClassificationLabel: (label, meta) => {
    const prevLabels = get().classificationLabels;
    const newKey = getClassificationKey(label);
    const nextLabels = prevLabels.filter((entry) => {
      const entryKey = getClassificationKey(entry.label);
      if (!newKey || !entryKey) {
        return true;
      }
      if (newKey !== entryKey) {
        return true;
      }
      if (label.id && entry.label.id === label.id) {
        return true;
      }
      if (!label.id && meta?.tempId && entry.tempId === meta.tempId) {
        return true;
      }
      return false;
    });
    const existingIndex = nextLabels.findIndex((item) => {
      if (label.id && item.label.id === label.id) {
        return true;
      }
      if (meta?.tempId && item.tempId === meta.tempId) {
        return true;
      }
      return false;
    });
    if (existingIndex >= 0) {
      const existing = nextLabels[existingIndex];
      const preservedId = existing.label.id ?? label.id;
      const preservedTempId = existing.tempId ?? meta?.tempId ?? uuidv4();
      nextLabels[existingIndex] = {
        tempId: preservedTempId,
        label: preservedId ? { ...label, id: preservedId } : label,
        color: meta?.color ?? existing.color,
      };
    } else {
      nextLabels.push({
        tempId: meta?.tempId ?? uuidv4(),
        label: label.id ? label : stripId(label),
        color: meta?.color,
      });
    }
    const classificationDeletedIds = label.id
      ? get().classificationDeletedIds.filter(
          (deletedId) => deletedId !== label.id
        )
      : get().classificationDeletedIds;
    const partialState = {
      classificationLabels: nextLabels,
      classificationDeletedIds,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  removeClassificationLabel: (tempId) => {
    const entry = get().classificationLabels.find(
      (item) => item.tempId === tempId
    );
    if (!entry) {
      return;
    }
    const classificationLabels = get().classificationLabels.filter(
      (item) => item.tempId !== tempId
    );
    const classificationDeletedIds = entry.label.id
      ? [...get().classificationDeletedIds, entry.label.id]
      : get().classificationDeletedIds;
    const partialState = {
      classificationLabels,
      classificationDeletedIds,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  removeClassificationLabelById: (labelId) => {
    const classificationLabels = get().classificationLabels.filter(
      (item) => item.label.id !== labelId
    );
    const classificationDeletedIds = [
      ...get().classificationDeletedIds,
      labelId,
    ];
    const partialState = {
      classificationLabels,
      classificationDeletedIds,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  clearTemporaryClassificationLabels: () => {
    const classificationLabels = get().classificationLabels.filter((item) =>
      Boolean(item.label.id)
    );
    const partialState = {
      classificationLabels,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  commitPendingClassificationDeletes: () => {
    const pendingIds = get().classificationDeletedIds;
    if (!pendingIds.length) {
      return;
    }
    const committedSet = new Set(get().committedClassificationDeletedIds);
    pendingIds.forEach((id) => {
      if (id) {
        committedSet.add(id);
      }
    });
    const partialState = {
      classificationDeletedIds: [],
      committedClassificationDeletedIds: Array.from(committedSet),
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  trimCommittedClassificationDeletes: (existingIds) => {
    set((state) => {
      if (!state.committedClassificationDeletedIds.length) {
        return state;
      }
      const nextCommitted = state.committedClassificationDeletedIds.filter(
        (id) => !existingIds.has(id)
      );
      if (
        nextCommitted.length === state.committedClassificationDeletedIds.length
      ) {
        return state;
      }
      return {
        ...state,
        committedClassificationDeletedIds: nextCommitted,
      };
    });
  },
  trimClassificationDeletes: (existingIds) => {
    set((state) => {
      if (!state.classificationDeletedIds.length) {
        return state;
      }
      const nextDeleted = state.classificationDeletedIds.filter(
        (id) => !existingIds.has(id)
      );
      if (nextDeleted.length === state.classificationDeletedIds.length) {
        return state;
      }
      return {
        ...state,
        classificationDeletedIds: nextDeleted,
      };
    });
  },
  addRecognitionLabel: (label, meta) => {
    if (label.inferenceType !== "RECOGNITION") {
      return;
    }
    const prevLabels = get().recognitionLabels;
    const newKey = getRecognitionKey(label);
    const nextLabels = prevLabels.filter((entry) => {
      const entryKey = getRecognitionKey(entry.label);
      if (!newKey || !entryKey) {
        return true;
      }
      if (newKey !== entryKey) {
        return true;
      }
      if (label.id && entry.label.id === label.id) {
        return true;
      }
      if (!label.id && meta?.tempId && entry.tempId === meta.tempId) {
        return true;
      }
      return false;
    });
    const existingIndex = nextLabels.findIndex((item) => {
      if (label.id && item.label.id === label.id) {
        return true;
      }
      if (meta?.tempId && item.tempId === meta.tempId) {
        return true;
      }
      return false;
    });
    if (existingIndex >= 0) {
      const existing = nextLabels[existingIndex];
      const preservedId = existing.label.id ?? label.id;
      const preservedTempId = existing.tempId ?? meta?.tempId ?? uuidv4();
      nextLabels[existingIndex] = {
        tempId: preservedTempId,
        label: preservedId ? { ...label, id: preservedId } : label,
        color: meta?.color ?? existing.color,
      };
    } else {
      nextLabels.push({
        tempId: meta?.tempId ?? uuidv4(),
        label: label.id ? label : stripId(label),
        color: meta?.color,
      });
    }

    const recognitionDeletedIds = label.id
      ? get().recognitionDeletedIds.filter((deletedId) => deletedId !== label.id)
      : get().recognitionDeletedIds;

    const partialState = {
      recognitionLabels: nextLabels,
      recognitionDeletedIds,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  removeRecognitionLabel: (tempId) => {
    const entry = get().recognitionLabels.find((item) => item.tempId === tempId);
    if (!entry) {
      return;
    }
    const recognitionLabels = get().recognitionLabels.filter(
      (item) => item.tempId !== tempId
    );
    const recognitionDeletedIds = entry.label.id
      ? [...get().recognitionDeletedIds, entry.label.id]
      : get().recognitionDeletedIds;
    const partialState = {
      recognitionLabels,
      recognitionDeletedIds,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  removeRecognitionLabelById: (labelId) => {
    const recognitionLabels = get().recognitionLabels.filter(
      (item) => item.label.id !== labelId
    );
    const recognitionDeletedIds = [...get().recognitionDeletedIds, labelId];
    const partialState = {
      recognitionLabels,
      recognitionDeletedIds,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  clearTemporaryRecognitionLabels: () => {
    const recognitionLabels = get().recognitionLabels.filter((item) =>
      Boolean(item.label.id)
    );
    const partialState = {
      recognitionLabels,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  commitPendingRecognitionDeletes: () => {
    const pendingIds = get().recognitionDeletedIds;
    if (!pendingIds.length) {
      return;
    }
    const committedSet = new Set(get().committedRecognitionDeletedIds);
    pendingIds.forEach((id) => {
      if (id) {
        committedSet.add(id);
      }
    });
    const partialState = {
      recognitionDeletedIds: [],
      committedRecognitionDeletedIds: Array.from(committedSet),
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  trimCommittedRecognitionDeletes: (existingIds) => {
    set((state) => {
      if (!state.committedRecognitionDeletedIds.length) {
        return state;
      }
      const nextCommitted = state.committedRecognitionDeletedIds.filter(
        (id) => !existingIds.has(id)
      );
      if (nextCommitted.length === state.committedRecognitionDeletedIds.length) {
        return state;
      }
      return {
        ...state,
        committedRecognitionDeletedIds: nextCommitted,
      };
    });
  },
  trimRecognitionDeletes: (existingIds) => {
    set((state) => {
      if (!state.recognitionDeletedIds.length) {
        return state;
      }
      const nextDeleted = state.recognitionDeletedIds.filter(
        (id) => !existingIds.has(id)
      );
      if (nextDeleted.length === state.recognitionDeletedIds.length) {
        return state;
      }
      return {
        ...state,
        recognitionDeletedIds: nextDeleted,
      };
    });
  },
  replaceFabricEntriesFromServer: (objects) => {
    const nextEntries: Record<string, FabricLabelEntry> = {};
    objects.forEach((object) => {
      const inlineLabel = object.labelInsertData as
        | LabelInsertWithOptionalId
        | undefined;
      if (!inlineLabel) {
        return;
      }
      const entryKey = object.unique ?? inlineLabel.id ?? object.toString();
      nextEntries[entryKey] = {
        key: entryKey,
        label: inlineLabel,
        labelId: inlineLabel.id,
      };
    });
    const nextBaselineSignatures = new Map<string, string>();
    Object.values(nextEntries).forEach((entry) => {
      if (!entry.labelId) {
        return;
      }
      const signature = buildLabelSignature(entry.label);
      if (signature) {
        nextBaselineSignatures.set(entry.labelId, signature);
      }
    });
    lastSyncedFabricLabelSignatures = nextBaselineSignatures;
    refreshBaselineOnNextSync = true;
    const partialState = {
      fabricEntries: nextEntries,
      fabricDeletedIds: [],
    };
    const pending = {
      ...buildPendingPayload({
        ...get(),
        ...partialState,
      }),
      // 서버 기준으로 리셋된 직후에는 클린 상태를 보장
      updates: [],
      inserts: [],
      deletes: [],
    };
    set({
      ...partialState,
      ...pending,
    });
  },
  updateFabricEntryLabel: (key, label) => {
    if (!key) {
      return;
    }
    const prevEntries = get().fabricEntries;
    const existingEntry = prevEntries[key];
    const nextLabelId = label.id ?? existingEntry?.labelId;
    const nextLabel = nextLabelId ? { ...label, id: nextLabelId } : label;
    const nextEntries = {
      ...prevEntries,
      [key]: {
        key,
        label: nextLabel,
        labelId: nextLabelId,
      },
    };
    const fabricDeletedIds = nextLabelId
      ? get().fabricDeletedIds.filter((id) => id !== nextLabelId)
      : get().fabricDeletedIds;
    const partialState = {
      fabricEntries: nextEntries,
      fabricDeletedIds,
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  removeFabricEntryByKey: (key) => {
    if (!key) {
      return;
    }
    const prevEntries = get().fabricEntries;
    if (!prevEntries[key]) {
      return;
    }
    const nextEntries = { ...prevEntries };
    const removed = nextEntries[key];
    delete nextEntries[key];
    const deletedIds = new Set(get().fabricDeletedIds);
    if (removed?.labelId) {
      deletedIds.add(removed.labelId);
    }
    const partialState = {
      fabricEntries: nextEntries,
      fabricDeletedIds: Array.from(deletedIds),
    };
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  clearPendingChanges: () =>
    set((state) => ({
      ...state,
      inserts: [],
      updates: [],
      deletes: [],
      fabricDeletedIds: [],
    })),
  applyHistorySnapshot: (partialState) => {
    const pending = buildPendingPayload({
      ...get(),
      ...partialState,
    });
    set({
      ...partialState,
      ...pending,
    });
  },
  resetWorkspaceChanges: () => {
    lastSyncedFabricLabelSignatures.clear();
    refreshBaselineOnNextSync = false;
    latestFabricSyncToken = 0;
    set((state) => ({
      labelContextId: state.labelContextId,
      labelDataRevision: state.labelDataRevision,
      fabricEntries: {},
      fabricDeletedIds: [],
      classificationLabels: [],
      classificationDeletedIds: [],
      committedClassificationDeletedIds: [],
      recognitionLabels: [],
      recognitionDeletedIds: [],
      committedRecognitionDeletedIds: [],
      inserts: [],
      updates: [],
      deletes: [],
    }));
  },
  getPayload: () => {
    const { inserts, updates, deletes, labelContextId } = get();
    if (!labelContextId) {
      throw new Error("labelContextId is required");
    }
    return sanitizePendingPayload({
      inserts,
      updates,
      deletes,
    });
  },
  bumpLabelDataRevision: () =>
    set((state) => ({
      labelDataRevision: state.labelDataRevision + 1,
    })),
  reset: () =>
    set(() => {
      lastSyncedFabricLabelSignatures.clear();
      latestFabricSyncToken = 0;
      return {
        labelContextId: null,
        fabricEntries: {},
        fabricDeletedIds: [],
        classificationLabels: [],
        classificationDeletedIds: [],
        committedClassificationDeletedIds: [],
        recognitionLabels: [],
        recognitionDeletedIds: [],
        committedRecognitionDeletedIds: [],
        inserts: [],
        updates: [],
        deletes: [],
        labelDataRevision: 0,
      };
    }),
}));
