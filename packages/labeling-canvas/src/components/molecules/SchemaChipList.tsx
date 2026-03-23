import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { clsx } from "clsx";

import Button from "@/components/atoms/Button";
import Icon, { type IconName } from "@/components/atoms/Icon";
import Wrapper from "@/components/atoms/Wrapper";

export interface SchemaChipListItem {
  key: string;
  label: string;
  iconType?: IconName | null;
  contentType?: string | null;
  isReadOnly?: boolean;
}

export type SchemaChipListDisplayMode = "auto" | "scroll";

interface SchemaChipListSharedProps {
  items: SchemaChipListItem[];
  className?: string;
  gapSize?: string;
  ariaLabelForItem?: (item: SchemaChipListItem) => string;
  moreChipLabel?: (remainingCount: number) => string;
  moreChipAriaLabel?: (remainingCount: number) => string;
  moreChipTooltipContent?: (hiddenItems: SchemaChipListItem[]) => string;
  emptyFallback?: ReactNode;
}

interface SchemaChipListProps extends SchemaChipListSharedProps {
  displayMode?: SchemaChipListDisplayMode;
}

const DEFAULT_MAX_VISIBLE = 8;
const RESERVED_TRAILING_SPACE = 40;

function SchemaChipList(props: SchemaChipListProps) {
  const { displayMode = "auto", ...rest } = props;

  if (displayMode === "scroll") {
    return <SchemaChipListScroll {...rest} />;
  }

  return <SchemaChipListAuto {...rest} />;
}

function SchemaChipListScroll({
  items,
  className,
  gapSize = "0.25rem",
  ariaLabelForItem,
  emptyFallback,
}: SchemaChipListSharedProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const target = scrollRef.current;
      if (!target) {
        return;
      }
      const { deltaX, deltaY } = event;
      const primarilyHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      const shouldHandle = primarilyHorizontal || event.shiftKey;
      if (!shouldHandle) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const scrollDelta = deltaX !== 0 ? deltaX : deltaY;
      target.scrollBy({ left: scrollDelta, behavior: "auto" });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const computeAriaLabelForItem = useCallback(
    (item: SchemaChipListItem) => {
      if (ariaLabelForItem) {
        return ariaLabelForItem(item);
      }
      const parts = [item.contentType, item.label].filter(Boolean);
      return parts.join(" ").trim();
    },
    [ariaLabelForItem]
  );

  if (items.length === 0) {
    return <>{emptyFallback ?? <span>-</span>}</>;
  }

  const containerClass = clsx("schema-chip-scroll", className);

  return (
    <div ref={scrollRef} className={containerClass}>
      <div className="schema-chip-scroll__content" style={{ gap: gapSize }}>
        {items.map((item) => (
          <Button
            key={item.key}
            title={item.label}
            className="button-column"
            style="gray"
            size="sm"
            isReadOnly
            aria-label={computeAriaLabelForItem(item)}
          >
            {item.iconType ? <Icon iconType={item.iconType} size="sm" /> : null}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SchemaChipListAuto({
  items,
  className,
  gapSize = "0.25rem",
  ariaLabelForItem,
  moreChipLabel,
  moreChipAriaLabel,
  moreChipTooltipContent,
  emptyFallback,
}: SchemaChipListSharedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const moreChipRef = useRef<HTMLSpanElement | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(items.length, DEFAULT_MAX_VISIBLE)
  );
  const tooltipId = useId();
  const [isTooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const updateTooltipPosition = useCallback(() => {
    const node = moreChipRef.current;
    if (!node) {
      setTooltipPosition(null);
      return;
    }
    const rect = node.getBoundingClientRect();
    setTooltipPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!isTooltipVisible || typeof window === "undefined") {
      return;
    }
    updateTooltipPosition();
    const handler = () => updateTooltipPosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [isTooltipVisible, updateTooltipPosition]);

  useEffect(() => {
    setVisibleCount((prev) =>
      Math.min(prev || DEFAULT_MAX_VISIBLE, items.length)
    );
  }, [items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => {
        window.removeEventListener("resize", updateWidth);
      };
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const computeAriaLabelForItem = useCallback(
    (item: SchemaChipListItem) => {
      if (ariaLabelForItem) {
        return ariaLabelForItem(item);
      }
      const parts = [item.contentType, item.label].filter(Boolean);
      return parts.join(" ").trim();
    },
    [ariaLabelForItem]
  );

  const resolveMoreChipLabelMemo = useCallback(
    (remainingCount: number) => {
      if (moreChipLabel) {
        return moreChipLabel(remainingCount);
      }
      return `+${remainingCount}`;
    },
    [moreChipLabel]
  );

  const resolveMoreChipAriaLabelMemo = useCallback(
    (remainingCount: number) => {
      if (moreChipAriaLabel) {
        return moreChipAriaLabel(remainingCount);
      }
      return `${remainingCount} more schema${remainingCount > 1 ? "s" : ""}`;
    },
    [moreChipAriaLabel]
  );

  const resolveMoreChipTooltipMemo = useCallback(
    (hiddenItems: SchemaChipListItem[]) => {
      if (hiddenItems.length === 0) {
        return "";
      }
      if (moreChipTooltipContent) {
        return moreChipTooltipContent(hiddenItems);
      }
      return hiddenItems
        .map((item) =>
          [item.contentType, item.label].filter(Boolean).join(" - ").trim()
        )
        .join("\n");
    },
    [moreChipTooltipContent]
  );

  useLayoutEffect(() => {
    if (items.length === 0 || !containerWidth) {
      setVisibleCount(0);
      return;
    }

    const measureContainer = measureRef.current;
    if (!measureContainer) {
      return;
    }

    const wrapper = measureContainer.firstElementChild as HTMLElement | null;
    if (!wrapper) {
      return;
    }

    const chipButtons = Array.from(
      wrapper.querySelectorAll<HTMLButtonElement>(
        "button[data-chip-kind='item']"
      )
    );
    if (chipButtons.length === 0) {
      setVisibleCount(0);
      return;
    }

    const moreButton = wrapper.querySelector<HTMLButtonElement>(
      "button[data-chip-kind='more']"
    );

    const styles = window.getComputedStyle(wrapper);
    const gapValue =
      parseFloat(styles.columnGap || styles.gap || styles.rowGap || "0") || 0;

    const readMoreWidth = (remaining: number) => {
      if (!moreButton) {
        return 0;
      }
      const nextLabel = resolveMoreChipLabelMemo(remaining);
      if (moreButton.dataset.label !== nextLabel) {
        moreButton.dataset.label = nextLabel;
        moreButton.textContent = nextLabel;
      }
      const rect = moreButton.getBoundingClientRect();
      return rect.width;
    };

    const chipWidths = chipButtons.map(
      (button) => button.getBoundingClientRect().width
    );

    const availableWidth = Math.max(
      containerWidth - RESERVED_TRAILING_SPACE,
      0
    );

    if (availableWidth <= 0) {
      setVisibleCount((prev) =>
        prev === 1 ? prev : Math.min(1, chipWidths.length)
      );
      return;
    }

    let usedWidth = 0;
    let nextVisible = chipWidths.length;

    for (let index = 0; index < chipWidths.length; index += 1) {
      const chipWidth = chipWidths[index];
      const extraGap = index === 0 ? 0 : gapValue;
      const tentativeWidth = usedWidth + extraGap + chipWidth;
      const remaining = chipWidths.length - (index + 1);
      const reserveForMore =
        remaining > 0 ? gapValue + readMoreWidth(remaining) : 0;

      if (tentativeWidth + reserveForMore > availableWidth) {
        nextVisible = index;
        break;
      }

      usedWidth = tentativeWidth;
    }

    if (nextVisible === 0 && chipWidths.length > 0) {
      nextVisible = 1;
    }

    const bounded = Math.min(nextVisible, chipWidths.length);
    setVisibleCount((prev) => (prev === bounded ? prev : bounded));
  }, [containerWidth, items, resolveMoreChipLabelMemo, gapSize]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );
  const hiddenItems = useMemo(
    () => (visibleCount < items.length ? items.slice(visibleCount) : []),
    [items, visibleCount]
  );
  const hiddenCount = hiddenItems.length;
  const moreChipTooltip = resolveMoreChipTooltipMemo(hiddenItems);

  if (items.length === 0) {
    return <>{emptyFallback ?? <span>-</span>}</>;
  }

  const tooltipOverlay =
    typeof document !== "undefined" &&
    isTooltipVisible &&
    tooltipPosition &&
    moreChipTooltip
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="schema-chip-list__tooltip"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            {moreChipTooltip}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={clsx("schema-chip-list", className)}>
      <Wrapper gapSize={gapSize} isWrap>
        {visibleItems.map((item) => (
          <Button
            key={item.key}
            title={item.label}
            className="button-column"
            style="gray"
            size="sm"
            isReadOnly
            aria-label={computeAriaLabelForItem(item)}
          >
            {item.iconType ? <Icon iconType={item.iconType} size="sm" /> : null}
          </Button>
        ))}
        {hiddenCount > 0 ? (
          <span
            key="schema-chip-more"
            ref={moreChipRef}
            onMouseEnter={() => {
              setTooltipVisible(true);
              updateTooltipPosition();
            }}
            onMouseLeave={() => setTooltipVisible(false)}
            onFocus={() => {
              setTooltipVisible(true);
              updateTooltipPosition();
            }}
            onBlur={() => setTooltipVisible(false)}
            className="schema-chip-list__more-chip"
          >
            <Button
              title={resolveMoreChipLabelMemo(hiddenCount)}
              className="button-column"
              style="gray"
              size="sm"
              isReadOnly
              aria-label={resolveMoreChipAriaLabelMemo(hiddenCount)}
              aria-describedby={
                moreChipTooltip && isTooltipVisible ? tooltipId : undefined
              }
            />
          </span>
        ) : null}
      </Wrapper>
      {tooltipOverlay}
      <div
        ref={measureRef}
        className="schema-chip-list__measure-container"
        aria-hidden
      >
        <Wrapper gapSize={gapSize} isWrap>
          {items.map((item, index) => (
            <Button
              key={`measure-${item.key || index}`}
              data-chip-kind="item"
              title={item.label}
              className="button-column"
              style="gray"
              size="sm"
              isReadOnly
            >
              {item.iconType ? (
                <Icon iconType={item.iconType} size="sm" />
              ) : null}
            </Button>
          ))}
          <Button
            data-chip-kind="more"
            title={resolveMoreChipLabelMemo(items.length)}
            className="button-column"
            style="gray"
            size="sm"
            isReadOnly
            data-label={resolveMoreChipLabelMemo(items.length)}
          />
        </Wrapper>
      </div>
    </div>
  );
}

export default SchemaChipList;
