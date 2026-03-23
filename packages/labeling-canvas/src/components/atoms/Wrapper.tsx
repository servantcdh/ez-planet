import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

interface WrapperType {
  direction?: "horizontal" | "vertical";
  gapSize?: string;
  justify?: "center" | "between" | "start" | "end";
  align?: "center" | "start" | "end";
  children: ReactNode;
  className?: string;
  isFull?: boolean;
  isWrap?: boolean;
  isBordered?: boolean;
  isRounded?: boolean;
  isGrid?: boolean;
  rows?: string[];
  columns?: string[];
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  draggable?: boolean;
  onDragStart?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDrop?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: ReactDragEvent<HTMLDivElement>) => void;
}

function Wrapper({
  direction = "horizontal",
  gapSize = "0rem",
  justify = "start",
  align = "start",
  children,
  className,
  isFull,
  isWrap,
  isBordered,
  isRounded,
  isGrid,
  rows = ["1"],
  columns = ["1"],
  onClick,
  style,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: WrapperType) {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    onClick(event as unknown as ReactMouseEvent<HTMLDivElement>);
  };

  return (
    <div
      className={`common-wrapper common-wrapper-${direction} common-wrapper-justify-${justify} common-wrapper-align-${align} ${isWrap ? "flex-wrap" : ""} ${isBordered ? "common-wrapper-bordered" : ""} ${isRounded ? "common-wrapper-rounded" : ""} ${isGrid ? "common-wrapper-grid" : ""} ${isFull ? "full-width" : ""} ${className ? className : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        gap: gapSize,
        ...(isGrid && {
          gridTemplateRows: rows
            .map((row) => (row === "auto" ? "auto" : `${row}fr`))
            .join(" "),
          gridTemplateColumns: columns
            .map((column) => (column === "auto" ? "auto" : `${column}fr`))
            .join(" "),
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Wrapper;
