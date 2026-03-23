import { Fragment } from "react/jsx-runtime";

import { Icon, Title } from "../atoms";

interface PageBreadcrumbProps {
  showArrow?: boolean;
  className?: string;
  items?: { label: string; onClick?: () => void }[];
  indecator?: React.ReactNode;
}

function PageBreadcrumb({
  showArrow = true,
  className,
  items = [],
  indecator,
}: PageBreadcrumbProps) {
  const lastIndex = items?.length - 1;
  return (
    <div className={`header__title${className ? ` ${className}` : ""}`}>
      {items?.map((item, index) => (
        <Fragment key={`${item.label}_${index}`}>
          {index < lastIndex ? (
            <>
              <div className="header__previous-title">
                <p onClick={item.onClick}>{item.label}</p>
              </div>
              {showArrow && <Icon iconType="icon-right" size="sm" />}
            </>
          ) : (
            <Title title={item.label} />
          )}
        </Fragment>
      ))}
      {indecator && <div className="header__indicator">{indecator}</div>}
    </div>
  );
}

export default PageBreadcrumb;
