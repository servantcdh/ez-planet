import { create } from 'zustand'
import type { LabelInsertData, LabelUpdateData, LabelDeleteData } from '../types/public'

interface ClassificationLabelEntry {
  tempId: string
  labelId: string | null
  policyId: string
  classIndex: number
  className: string
  labelValue: unknown
  attributeValues?: Record<string, unknown>
  color?: string
  opacity?: number
}

interface LabelBatchState {
  // Classification labels
  classificationLabels: ClassificationLabelEntry[]
  classificationDeletedIds: string[]

  // Pending API payload
  inserts: LabelInsertData[]
  updates: LabelUpdateData[]
  deletes: LabelDeleteData[]

  labelDataRevision: number

  // Methods
  addClassificationLabel: (label: ClassificationLabelEntry) => void
  removeClassificationLabel: (tempId: string) => void
  removeClassificationLabelById: (labelId: string) => void
  clearTemporaryClassificationLabels: () => void

  clearPendingChanges: () => void
  hasPendingChanges: () => boolean
  bumpLabelDataRevision: () => void
  reset: () => void
}

export const useLabelBatchStore = create<LabelBatchState>((set, get) => ({
  classificationLabels: [],
  classificationDeletedIds: [],
  inserts: [],
  updates: [],
  deletes: [],
  labelDataRevision: 0,

  addClassificationLabel(label) {
    set((s) => ({
      classificationLabels: [...s.classificationLabels, label],
    }))
  },

  removeClassificationLabel(tempId) {
    set((s) => ({
      classificationLabels: s.classificationLabels.filter((l) => l.tempId !== tempId),
    }))
  },

  removeClassificationLabelById(labelId) {
    set((s) => ({
      classificationLabels: s.classificationLabels.filter((l) => l.labelId !== labelId),
      classificationDeletedIds: [...s.classificationDeletedIds, labelId],
    }))
  },

  clearTemporaryClassificationLabels() {
    set((s) => ({
      classificationLabels: s.classificationLabels.filter((l) => l.labelId !== null),
    }))
  },

  clearPendingChanges() {
    set({ inserts: [], updates: [], deletes: [] })
  },

  hasPendingChanges() {
    const s = get()
    return s.inserts.length > 0 || s.updates.length > 0 || s.deletes.length > 0 || s.classificationLabels.some((l) => l.labelId === null) || s.classificationDeletedIds.length > 0
  },

  bumpLabelDataRevision() {
    set((s) => ({ labelDataRevision: s.labelDataRevision + 1 }))
  },

  reset() {
    set({
      classificationLabels: [],
      classificationDeletedIds: [],
      inserts: [],
      updates: [],
      deletes: [],
      labelDataRevision: 0,
    })
  },
}))
