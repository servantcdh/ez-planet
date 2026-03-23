import { Button, Icon } from "@/components";

import type { IconName } from "../atoms/Icon";

interface TipType {
  title: string;
  iconType?: IconName;
  content: React.ReactNode;
  isClosable?: boolean;
  style?: "primary" | "secondary" | "accent";
  className?: string;
  onClose?: () => void;
}

function Tip({
  title,
  iconType = "icon-information-white",
  content,
  isClosable = true,
  style = "secondary",
  className,
  onClose,
}: TipType) {
  return (
    <div className={`tip-wrapper ${className}`} data-style={style}>
      <div className="tip__title">
        <div className="title">
          <Icon iconType={iconType} size="sm" />
          <p>{title}</p>
        </div>
        {isClosable && (
          <Button style="transparent" size="sm" onClick={onClose}>
            <Icon iconType="icon-cancel" size="xs" />
          </Button>
        )}
      </div>
      <div className="tip__content">
        <div className="content">{content}</div>
      </div>
    </div>
  );
}

export default Tip;
