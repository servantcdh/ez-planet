/**
 * Stub ContentBody template component.
 */
import React, { type ReactNode } from "react";

export interface ContentBodyProps {
  columns?: string[];
  className?: string;
  children?: ReactNode;
}

export default function ContentBody({
  children,
  className,
}: ContentBodyProps) {
  return React.createElement("div", { className }, children);
}
