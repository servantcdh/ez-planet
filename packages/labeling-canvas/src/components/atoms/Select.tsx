import { resolveChildSize } from "@/lib/ui/size";
import type { UIType } from "@/types/ui-type.interface";

import Icon from "./Icon";

export interface OptionType {
  value: string | number;
  label: string;
  disabled?: boolean;
}
export interface SelectType
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "style" | "size">,
    UIType<"sm" | "md" | "lg"> {
  id?: string;
  options: OptionType[];
  placeholder?: string;
  isFull?: boolean;
  border?: "default" | "none" | "underline";
  children?: React.ReactNode;
}

function Select({
  id,
  options,
  placeholder,
  size = "md",
  border = "default",
  isFull = false,
  children,
  ...selectProps
}: SelectType) {
  const childSize = resolveChildSize({ parentSize: size });
  const {
    className: selectClassName,
    style: _style,
    ...restSelectProps
  } = selectProps;

  return (
    <div
      className={`form form-select form-${size} ${border === "none" ? "form-borderless" : border === "underline" ? "form-underline" : ""} ${isFull ? "full-width" : ""} ${selectClassName ?? ""}`}
    >
      {children}
      <select
        id={id}
        {...restSelectProps}
        className={`${isFull ? "full-width" : ""}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <Icon iconType="icon-down" size={childSize} />
    </div>
  );
}

export default Select;
