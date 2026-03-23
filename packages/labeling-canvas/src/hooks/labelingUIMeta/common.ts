import type { LabelingUIMetaContext } from "./types";

export const baseBreadcrumbItems = ({
  goToLabelingRoot,
}: Pick<LabelingUIMetaContext, "goToLabelingRoot">) => [
  {
    label: "Labeling",
    onClick: goToLabelingRoot,
  },
];
