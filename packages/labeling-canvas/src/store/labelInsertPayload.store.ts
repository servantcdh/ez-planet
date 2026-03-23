import { create } from "zustand";

import type { LabelInsertData } from "@/types/domain";

interface ClassMeta {
  color?: string;
  opacity?: number;
}

interface LabelInsertPayloadState {
  payload: LabelInsertData | null;
  classMeta: ClassMeta | null;
  setPayload: (payload: LabelInsertData | null, classMeta?: ClassMeta | null) => void;
}

export const useLabelInsertPayloadStore = create<LabelInsertPayloadState>(
  (set) => ({
    payload: null,
    classMeta: null,
    setPayload: (payload, classMeta) =>
      set(() => ({
        payload,
        classMeta: classMeta ?? null,
      })),
  })
);
