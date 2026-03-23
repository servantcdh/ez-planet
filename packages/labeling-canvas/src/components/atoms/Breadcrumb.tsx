import React from "react";

import Icon from "./Icon";

interface BreadcrumbProps {
  menus: string[];
}

function Breadcrumb({ menus }: BreadcrumbProps) {
  return (
    <div className="breadcrumb-wrapper">
      {menus.map((menu, index) => (
        <React.Fragment key={`${menu}_${index}`}>
          {index > 0 && <Icon iconType="icon-right" size="xs" />}
          <p>{menu}</p>
        </React.Fragment>
      ))}
    </div>
  );
}

export default Breadcrumb;
