import { Tabs } from "@/components";
import type { PolicyDetail } from "@/features/policy/types/domain";

import WorkspaceAttributeEditPanel from "./WorkspaceAttributeEditPanel";

interface WorkspaceAttributeFormSectionProps {
  policies: PolicyDetail[];
}

function WorkspaceAttributeFormSection({
  policies,
}: WorkspaceAttributeFormSectionProps) {
  return (
    <section className="content-sub-section content-sub-section--attribute show">
      <div className="content-sub-section__title">
        <Tabs
          titles={[
            {
              name: "Attributes",
            },
          ]}
          isSwitch
          size="sm"
        />
      </div>
      <div className="content-sub-section__content">
        <WorkspaceAttributeEditPanel policies={policies} />
      </div>
    </section>
  );
}

export default WorkspaceAttributeFormSection;
