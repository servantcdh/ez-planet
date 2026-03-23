import { type ReactNode, useMemo, useState } from "react";

import Button from "@/components/atoms/Button";
import Icon, { type IconName } from "@/components/atoms/Icon";
import Wrapper from "@/components/atoms/Wrapper";

import Tip from "./Tip";

export interface SchemaDetailItem {
  key: string;
  label: string;
  iconType?: IconName | null;
  properties?: Record<string, unknown> | null;
  propertyLabels?: string[];
  isReadOnly?: boolean;
}

interface SchemaDetailCardProps {
  items: SchemaDetailItem[];
  activeKey?: string | null;
  onActiveKeyChange?: (key: string | null) => void;
  allowToggleOff?: boolean;
  emptyFallback?: ReactNode;
  emptyPropertiesFallback?: ReactNode;
  chipWrapperClassName?: string;
  renderDetailHeader?: (
    item: SchemaDetailItem,
    onClose: (() => void) | null
  ) => ReactNode;
  renderDetailContent?: (item: SchemaDetailItem) => ReactNode;
}

export default function SchemaDetailCard({
  items,
  activeKey,
  onActiveKeyChange,
  allowToggleOff = true,
  emptyFallback,
  emptyPropertiesFallback,
  chipWrapperClassName,
  renderDetailHeader,
  renderDetailContent,
}: SchemaDetailCardProps) {
  const [uncontrolledKey, setUncontrolledKey] = useState<string | null>(null);
  const isControlled = activeKey !== undefined;
  const resolvedActiveKey = isControlled ? activeKey : uncontrolledKey;
  const setActiveKey = isControlled ? onActiveKeyChange : setUncontrolledKey;

  const activeItem = useMemo(
    () => items.find((item) => item.key === resolvedActiveKey),
    [items, resolvedActiveKey]
  );
  const schemaPropertyLabels = activeItem?.propertyLabels ?? [];
  const resolvedEmptyPropertiesFallback = emptyPropertiesFallback ?? (
    <Tip
      iconType="icon-warning"
      title="Notice"
      content="No schema properties available."
      style="accent"
      isClosable={false}
    />
  );

  const isEmpty = items.length === 0;

  return (
    <div className="content-detail-card-wrapper">
      <div className="content-detail-card__content">
        {isEmpty ? (
          (emptyFallback ?? null)
        ) : (
          <Wrapper
            gapSize="0.25rem"
            isWrap
            isFull
            className={chipWrapperClassName}
          >
            {items.map((item) => (
              <Button
                key={item.key}
                title={item.label}
                className={`button-column ${
                  item.key === resolvedActiveKey ? "selected" : ""
                }`}
                style="gray"
                size="sm"
                isReadOnly={item.isReadOnly || !setActiveKey}
                onClick={() => {
                  if (!setActiveKey || item.isReadOnly) return;
                  const shouldClear =
                    allowToggleOff && item.key === resolvedActiveKey;
                  setActiveKey(shouldClear ? null : item.key);
                }}
              >
                {item.iconType ? (
                  <Icon iconType={item.iconType} size="sm" />
                ) : null}
              </Button>
            ))}
          </Wrapper>
        )}
        {activeItem && (
          <div className="content-detail-card__detail">
            {renderDetailHeader
              ? renderDetailHeader(
                  activeItem,
                  setActiveKey ? () => setActiveKey(null) : null
                )
              : null}
            {renderDetailContent ? (
              renderDetailContent(activeItem)
            ) : (
              <Wrapper gapSize="0.25rem" isWrap>
                {schemaPropertyLabels.length > 0
                  ? schemaPropertyLabels.map((label) => (
                      <Button
                        key={`schema-property-${label}`}
                        title={label}
                        className="button-column"
                        style="gray"
                        size="sm"
                        isReadOnly
                      />
                    ))
                  : resolvedEmptyPropertiesFallback}
              </Wrapper>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
