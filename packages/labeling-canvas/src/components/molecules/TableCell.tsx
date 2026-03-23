import type { HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;
type SpanProps = HTMLAttributes<HTMLSpanElement>;

const mergeClassNames = (base: string, className?: string) =>
  className ? `${base} ${className}` : base;

export function TableCellContent({ className, ...props }: DivProps) {
  return (
    <div
      className={mergeClassNames("table-td__content min-w-0 w-full", className)}
      {...props}
    />
  );
}

export function TableCellText({ className, ...props }: SpanProps) {
  return (
    <span
      className={mergeClassNames(
        "block min-w-0 flex-1 truncate",
        className
      )}
      {...props}
    />
  );
}

export function TableCellUtil({ className, ...props }: DivProps) {
  return (
    <div className={mergeClassNames("table-td__content-util", className)} {...props} />
  );
}

export function TableHeaderContent({ className, ...props }: DivProps) {
  return (
    <div
      className={mergeClassNames("table-th__content min-w-0 w-full", className)}
      {...props}
    />
  );
}

export function TableHeaderText({ className, ...props }: SpanProps) {
  return (
    <span className={mergeClassNames("block min-w-0 truncate", className)} {...props} />
  );
}
