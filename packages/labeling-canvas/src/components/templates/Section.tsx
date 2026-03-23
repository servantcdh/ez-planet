/**
 * Stub Section template component.
 */
import React, { type ReactNode } from "react";

export interface SectionProps {
  title?: string;
  className?: string;
  children?: ReactNode;
}

export default function Section({
  title,
  children,
  className,
}: SectionProps) {
  return React.createElement(
    "section",
    { className },
    title ? React.createElement("h2", null, title) : null,
    children,
  );
}
