import type { ToolbarItemType } from "@/types/toolbar";

import { Icon } from "../atoms";
import Button from "../atoms/Button";

interface FloatingToolbarType {
  toolbarContents: ToolbarItemType[];
  bottom?: string;
  show?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function FloatingToolbar({
  toolbarContents,
  bottom,
  show = true,
  className,
  children,
}: FloatingToolbarType) {
  if (!show) return null;
  return (
    <div className="sticky-wrapper">
      <div
        className={`floating-toolbar-wrapper floating ${className}`}
        style={{
          transform: `translateY(calc(-100%${bottom ? ` - ${bottom}` : ""}))`,
        }}
      >
        {toolbarContents.map((item, index) => {
          if (item.variant === "button") {
            const { iconType, title, variant: _variant, ...btnProps } = item;
            return (
              <Button
                key={`${title ?? "button"}_${index}`}
                size="md"
                {...(title ? { title } : { style: "transparent" })}
                {...btnProps}
              >
                {iconType && <Icon iconType={iconType} size="sm" />}
              </Button>
            );
          }
          if (item.variant === "checkbox") {
            const {
              iconType,
              title,
              variant: _variant,
              id,
              ...checkboxProps
            } = item;
            return (
              <div
                key={`${id}_${index}`}
                className={`button button-icon button-md ${checkboxProps.disabled ? "disabled" : ""}`}
                data-style="transparent"
                title={title}
              >
                <input type="checkbox" id={id} title={title} {...checkboxProps} />
                {iconType && (
                  <label htmlFor={id}>
                    <Icon iconType={iconType} size="sm" />
                  </label>
                )}
              </div>
            );
          }
          if (item.variant === "radio") {
            const {
              iconType,
              title,
              variant: _variant,
              id,
              ...radioProps
            } = item;
            return (
              <div
                key={`${id}_${index}`}
                className={`button button-icon button-md ${radioProps.disabled ? "disabled" : ""}`}
                data-style="transparent"
                title={title}
              >
                <input type="radio" id={id} title={title} {...radioProps} />
                {iconType && (
                  <label htmlFor={id}>
                    <Icon iconType={iconType} size="sm" />
                  </label>
                )}
              </div>
            );
          }
          return null;
        })}
        {children}
      </div>
    </div>
  );
}

export default FloatingToolbar;
