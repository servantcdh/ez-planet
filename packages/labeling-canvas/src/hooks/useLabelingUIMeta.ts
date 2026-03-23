import type { ChangeEvent } from "react";

import { useRouter } from "@tanstack/react-router";

import { LABELING_ROUTE_PATH } from "@/constants/routes";
import type { DirtyGuard } from "@/hooks/useDirtyGuard";
import type { SearchSchema } from "@/types/search";
import type { ToolbarMeta } from "@/types/toolbar";

import { useWorkspaceNavigationActiveStore } from "../store/workspaceLayout.store";
import { useWorkspaceValidationModeStore } from "../store/workspaceValidationMode.store";
import type { WorkspaceViewMode } from "../store/workspaceViewMode.store";
import {
  formatShortcutTitle,
  LABELING_SHORTCUTS,
} from "../utils/labelingShortcuts";
import { useFileLabelingUIMeta } from "./labelingUIMeta/file";
import { useImageLabelingUIMeta } from "./labelingUIMeta/image";
import { useNumberLabelingUIMeta } from "./labelingUIMeta/number";
import { useRecordLabelingUIMeta } from "./labelingUIMeta/record";
import { useTextLabelingUIMeta } from "./labelingUIMeta/text";
import type { LabelingUIMetaContext } from "./labelingUIMeta/types";
import { useValidationLabelingUIMeta } from "./labelingUIMeta/validation";

type Mode = WorkspaceViewMode;

type UIMeta = ToolbarMeta;

export function useLabelingUIMeta(
  mode: Mode,
  input?: {
    labelingId?: string | null;
    title?: string | null;
    dirtyGuard?: DirtyGuard;
  }
): UIMeta {
  const router = useRouter();
  const active = useWorkspaceNavigationActiveStore((state) => state.active);
  const setActive = useWorkspaceNavigationActiveStore(
    (state) => state.setActive
  );
  const labelingId = input?.labelingId ?? null;
  const title = input?.title ?? undefined;
  const goToLabelingRoot = () =>
    router.navigate({
      to: LABELING_ROUTE_PATH,
      params: {},
      search: (prev: SearchSchema) => prev ?? {},
    } as never);
  const context: LabelingUIMetaContext = {
    goToLabelingRoot,
    labelingId,
    title,
    isDirty: input?.dirtyGuard?.isDirty ?? false,
  };

  const recordMeta = useRecordLabelingUIMeta(context);
  const imageMeta = useImageLabelingUIMeta(context);
  const textMeta = useTextLabelingUIMeta(context);
  const numberMeta = useNumberLabelingUIMeta(context);
  const fileMeta = useFileLabelingUIMeta(context);
  const validationMeta = useValidationLabelingUIMeta(mode, context);
  const isValidationMode = useWorkspaceValidationModeStore(
    (state) => state.isValidationMode
  );
  const isFileMode = mode === "File";

  const byMode: Record<Mode, UIMeta> = {
    Record: recordMeta,
    Image: imageMeta,
    Text: textMeta,
    Number: numberMeta,
    File: fileMeta,
  };

  const meta = byMode[mode] ?? {
    toolbar: [{ variant: "button", iconType: "icon-plus" }],
    breadcrumbItems: [{ label: "None" }],
  };
  const resolvedMeta = isValidationMode && !isFileMode
    ? { ...meta, toolbar: validationMeta.toolbar }
    : meta;

  return {
    ...resolvedMeta,
    toolbar: [
      ...resolvedMeta.toolbar,
      {
        variant: "checkbox",
        iconType: "icon-helm",
        id: "navigationToggle",
        name: "",
        title: formatShortcutTitle(
          "Toggle navigation",
          LABELING_SHORTCUTS.common.navigationToggle
        ),
        disabled: false,
        checked: active,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          setActive(event.target.checked);
        },
      },
    ],
  };
}
