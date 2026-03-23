import { baseBreadcrumbItems } from "./common";
import type { LabelingUIMetaHook } from "./types";

export const useFileLabelingUIMeta: LabelingUIMetaHook = ({
  goToLabelingRoot,
  title,
}) => {
  return {
    toolbar: [],
    breadcrumbItems: [
      ...baseBreadcrumbItems({ goToLabelingRoot }),
      { label: title ?? "File Labeling" },
    ],
  };
};
