import { useFocusZone } from "@/features/content-group/hooks/useFocusZone";

interface FloatingCardType {
  service: string;
  bottom?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseDownCapture?: React.MouseEventHandler<HTMLDivElement>;
  onClickCapture?: React.MouseEventHandler<HTMLDivElement>;
  // focus zone integration (optional)
  focusZone?: string;
  focusId?: string;
  focusTakeOverOnMount?: boolean;
  focusAutoFocusOnMount?: boolean;
}

function FloatingCard({
  service,
  bottom,
  className,
  children,
  onClick,
  onMouseDownCapture,
  onClickCapture,
  focusZone,
  focusId,
  focusTakeOverOnMount,
  focusAutoFocusOnMount,
}: FloatingCardType) {
  // Always call hooks in the same order; gate behavior via flags
  const focusEnabled = Boolean(focusZone && focusId);
  const focus = useFocusZone({
    zone: focusZone ?? "__disabled__",
    id: focusId ?? "__disabled__",
    takeOverOnMount: Boolean(focusTakeOverOnMount && focusEnabled),
    autoFocusOnMount: focusEnabled ? focusAutoFocusOnMount !== false : false,
  });

  const mergedClassName = focusEnabled
    ? focus.getContainerClassName(
        `floating-card-wrapper floating-card-wrapper-${service} floating ${className ?? ""}`
      )
    : `floating-card-wrapper floating-card-wrapper-${service} floating ${className ?? ""}`;

  return (
    <div className="sticky-wrapper">
      <div
        className={mergedClassName}
        onClick={(e) => {
          onClick?.(e);
        }}
        onMouseDownCapture={(e) => {
          if (focusEnabled) focus.onClickFocus(e);
          onMouseDownCapture?.(e);
        }}
        onClickCapture={(e) => {
          if (focusEnabled) focus.onClickFocus(e);
          onClickCapture?.(e);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (focusEnabled) focus.onClickFocus(e);
            onClickCapture?.(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        style={{
          transform: `translateY(calc(-100%${bottom ? ` - ${bottom}` : ""}))`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default FloatingCard;
