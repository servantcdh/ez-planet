import type { UIType } from "@/types/ui-type.interface";

interface RadioType
  extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "style" | "size" | "type"
    >,
    UIType<"sm" | "md" | "lg"> {
  id: string;
  name: string;
  label?: string;
}

function Radio({ id, name, label, size = "md", ...inputProps }: RadioType) {
  const { style: _style, ...restInputProps } = inputProps;
  return (
    <div className="form-section">
      <div className={`form form-radio form-${size}`}>
        <input type="radio" name={name} id={id} {...restInputProps} />
        {label && <label htmlFor={id}>{label}</label>}
      </div>
    </div>
  );
}

export default Radio;
