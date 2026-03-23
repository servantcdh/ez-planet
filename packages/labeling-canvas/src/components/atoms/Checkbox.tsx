import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { UIType } from "@/types/ui-type.interface";

interface CheckboxType
  extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "style" | "size" | "type"
    >,
    UIType<"sm" | "md" | "lg"> {
  id: string;
  name: string;
  label?: string;
  indeterminate?: boolean;
  stopPropagation?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxType>(function Checkbox(
  {
    id,
    name,
    label,
    size = "md",
    indeterminate,
    stopPropagation = true,
    onClick,
    checked,
    onChange,
    style: _uiStyle,
    ...restInputProps
  },
  ref
) {
  const innerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!innerRef.current) return;
    innerRef.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);

  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);

  return (
    <div className="form-section">
      <div className={`form form-checkbox form-${size}`}>
        <input
          type="checkbox"
          name={name}
          id={id}
          ref={innerRef}
          checked={!!checked}
          onChange={onChange}
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
            onClick?.(e);
          }}
          aria-checked={indeterminate ? "mixed" : undefined}
          style={{ appearance: "auto", pointerEvents: "auto" }}
          {...restInputProps}
        />
        {label && <label htmlFor={id}>{label}</label>}
      </div>
    </div>
  );
});

export default Checkbox;
