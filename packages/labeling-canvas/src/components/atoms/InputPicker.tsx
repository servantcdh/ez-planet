interface InputPickerType {
  title?: string;
  placeholder?: string;
  className?: string;
  isFull?: boolean;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

function InputPicker({
  title,
  placeholder,
  className,
  isFull,
  size = "md",
  disabled,
  children,
  onClick,
}: InputPickerType) {
  return (
    <div
      className={`form form-input-picker form-${size} ${isFull ? "full-width" : ""}  ${className}`}
    >
      <button
        type="button"
        className="input-picker"
        disabled={disabled}
        onClick={onClick}
      >
        {title ? (
          <span className="input-picker__title">{title}</span>
        ) : placeholder ? (
          <span className="input-picker__placeholder">{placeholder}</span>
        ) : null}
        {children}
      </button>
    </div>
  );
}

export default InputPicker;
