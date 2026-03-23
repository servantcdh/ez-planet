import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  useWorkspaceLayoutStore,
  useWorkspaceNavigationActiveStore,
} from "@/store/workspaceLayout.store";
import type { ButtonItemType, ToolbarItemType } from "@/types/toolbar";

import { Checkbox, Icon } from "../atoms";
import Button from "../atoms/Button";

interface WorkspaceFloatingToolbarType {
  toolbarContents: ToolbarItemType[];
  show?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function WorkspaceFloatingToolbar({
  toolbarContents,
  show = true,
  className,
  children,
}: WorkspaceFloatingToolbarType) {
  const direction = useWorkspaceLayoutStore((state) => state.direction);
  const navigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.active
  );
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  useEffect(() => {
    const container = document.querySelector(".content-main-section__content");
    if (container instanceof HTMLElement) {
      setPortalContainer(container);
    }
  }, []);

  if (!show) return null;

  const isVerticalWithNav = direction === "vertical" && navigationActive;
  const isHorizontalWithNav = direction === "horizontal" && navigationActive;

  const toolbarContent = (
    <div
      className={`sticky-wrapper sticky-wrapper--workspace ${isVerticalWithNav ? "sticky-wrapper--vertical" : ""} ${isHorizontalWithNav ? "sticky-wrapper--horizontal" : ""}`}
    >
      <div
        className={`floating-toolbar-wrapper floating-toolbar-wrapper--workspace floating ${className}`}
      >
        {toolbarContents.map((item, index) => {
          if (item.variant === "button") {
            const {
              iconType,
              title,
              tooltip,
              variant: _variant,
              subButtonItems,
              isSlim,
              ...btnProps
            } = item;
            const key = `${title ?? "button"}_${index}`;
            const renderButton = (buttonKey?: string) => (
              <Button
                key={buttonKey}
                tooltip={tooltip}
                size="md"
                {...(title ? { title } : { style: "transparent" })}
                isSlim={isSlim}
                {...btnProps}
              >
                {iconType && (
                  <Icon iconType={iconType} size={isSlim ? "xxs" : "sm"} />
                )}
              </Button>
            );
            return subButtonItems ? (
              <div key={key} className="button-with-sub">
                {renderButton()}
                <div className="floating-sub-toolbar-wrapper">
                  {subButtonItems.map((subButtonItem, index) => {
                    if (subButtonItem.variant === "button") {
                      const {
                        iconType,
                        title,
                        tooltip,
                        variant: _variant,
                        subButtonItems: _subButtons,
                        ...subBtnProps
                      } = subButtonItem;
                      return (
                        <Button
                          key={`${title ?? "button"}_${index}`}
                          tooltip={tooltip}
                          size="md"
                          {...(title ? { title } : { style: "transparent" })}
                          {...subBtnProps}
                        >
                          {iconType && <Icon iconType={iconType} size="sm" />}
                        </Button>
                      );
                    }
                    if (subButtonItem.variant === "checkbox") {
                      const {
                        id,
                        title,
                        iconType: _iconType,
                        variant: _variant,
                        ...checkboxProps
                      } = subButtonItem;
                      return (
                        <Checkbox
                          key={`${name}_${index}`}
                          id={id ?? `checkbox-${index}`}
                          title={title}
                          {...checkboxProps}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ) : (
              renderButton(key)
            );
          }
          if (item.variant === "checkbox") {
            const {
              iconType,
              title,
              variant: _variant,
              id,
              subButtonItems,
              ...checkboxProps
            } = item;
            const key = `${id ?? "checkbox"}_${index}`;
            const renderCheckbox = (key?: string) => (
              <div
                key={key}
                className={`button button-icon button-md ${checkboxProps.disabled ? "disabled" : ""}`}
                data-style="transparent"
                title={title}
              >
                <input
                  type="checkbox"
                  id={id}
                  title={title}
                  onChange={() => {}}
                  {...checkboxProps}
                />
                {iconType && (
                  <label htmlFor={id}>
                    <Icon iconType={iconType} size="sm" />
                  </label>
                )}
              </div>
            );
            return subButtonItems ? (
              <div key={key} className="button-with-sub">
                {renderCheckbox()}
                <div className="floating-sub-toolbar-wrapper">
                  {subButtonItems.map((subButtonItem, index) => {
                    if (subButtonItem.variant === "button") {
                      const {
                        iconType,
                        title,
                        variant: _variant,
                        subButtonItems: _subButtons,
                        ...subBtnProps
                      } = subButtonItem;
                      return (
                        <Button
                          key={`${title ?? "button"}_${index}`}
                          size="md"
                          tooltip={title}
                          {...(title ? { title } : { style: "transparent" })}
                          {...subBtnProps}
                        >
                          {iconType && <Icon iconType={iconType} size="sm" />}
                        </Button>
                      );
                    }
                    if (subButtonItem.variant === "checkbox") {
                      const {
                        id,
                        title,
                        iconType: _iconType,
                        variant: _variant,
                        ...checkboxProps
                      } = subButtonItem;
                      return (
                        <Checkbox
                          key={`${name}_${index}`}
                          id={id ?? `checkbox-${index}`}
                          title={title}
                          onChange={() => {}}
                          {...checkboxProps}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ) : (
              renderCheckbox(key)
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
                onMouseDown={(e) => {
                  (item as unknown as ButtonItemType)?.onClick?.(
                    e as unknown as React.MouseEvent<HTMLButtonElement>
                  );
                }}
              >
                <input
                  type="radio"
                  id={id}
                  title={title}
                  onChange={() => {}}
                  {...radioProps}
                />
                {iconType && (
                  <label htmlFor={id}>
                    <Icon iconType={iconType} size="sm" />
                  </label>
                )}
              </div>
            );
          }
          if (item.variant === "toolbarDivider") {
            return (
              <div
                key={`toolbarDivider-${index}`}
                className="toolbar-divider"
              />
            );
          }
          return null;
        })}
        {children}
      </div>
    </div>
  );

  if (portalContainer) {
    return createPortal(toolbarContent, portalContainer);
  }

  return toolbarContent;
}

export default WorkspaceFloatingToolbar;
