import type { UIType } from "@/types/ui-type.interface";

interface SwitchType
  extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "style" | "size" | "type"
    >,
    UIType<"sm" | "md" | "lg"> {
  id: string;
  name: string;
  label?: string;
}

function Switch({ id, name, label, size = "md", ...inputProps }: SwitchType) {
  const { style: _style, ...restInputProps } = inputProps;
  return (
    <div className="form-section">
      <div className={`form form-switch form-${size}`}>
        <input
          type="checkbox"
          name={name}
          id={id}
          {...restInputProps}
        />
        <span className="slider"></span>
        {label && (
          <label className="label whitespace-nowrap" htmlFor={id}>
            {label}
          </label>
        )}
      </div>
    </div>
  );
}

export default Switch;
