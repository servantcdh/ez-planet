import type { UIType } from "@/types/ui-type.interface";

interface LabeledFieldType extends UIType<"sm" | "md" | "lg"> {
  label: React.ReactNode;
  children?: React.ReactNode;
  direction?: "horizontal" | "vertical";
  isMinWidth?: boolean;
  isCombined?: boolean;
  isFull?: boolean;
  isRequired?: boolean;
}

function LabeledField({
  label,
  children,
  size = "md",
  direction = "horizontal",
  isMinWidth = false,
  isCombined = false,
  isFull = false,
  isRequired = false,
}: LabeledFieldType) {
  return (
    <div
      className={`labeled-field labeled-field-${size} ${isCombined ? "labeled-field-combined" : ""} ${isFull ? "full-width" : ""}`}
      data-float={direction}
    >
      <label
        htmlFor=""
        className={`label ${isMinWidth ? "label-min-width" : ""}`}
      >
        {label}
        {isRequired ? <span className="text-red-500 ml-1">*</span> : null}
      </label>
      {children}
    </div>
  );
}

export default LabeledField;
