import type { UIType } from "@/types/ui-type.interface";

interface InputType
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style" | "size">,
    UIType<"sm" | "md" | "lg"> {
  inputRef?: React.RefObject<HTMLInputElement>;
  id?: string;
  defaultValue?: string;
  isFull?: boolean;
  border?: "default" | "none" | "underline";
  children?: React.ReactNode;
  onPressReturn?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function Input({
  inputRef,
  id,
  defaultValue,
  size = "md",
  isFull,
  border = "default",
  children,
  onPressReturn,
  ...inputProps
}: InputType) {
  const {
    className: inputClassName,
    style: _style,
    ...restInputProps
  } = inputProps;

  return (
    <div
      className={`form form-input form-${size} ${border === "none" ? "form-borderless" : border === "underline" ? "form-underline" : ""} ${isFull ? "full-width" : ""} ${inputClassName ?? ""}`}
    >
      {children}
      <input
        ref={inputRef}
        id={id}
        {...restInputProps}
        className={`${restInputProps.type === "number" ? "no-spinner" : ""} ${isFull ? "full-width" : ""}`}
        {...(restInputProps &&
        (restInputProps as unknown as { value?: unknown }).value !== undefined
          ? {}
          : { defaultValue })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onPressReturn?.(e);
          }
          if (inputProps.onKeyDown) {
            inputProps.onKeyDown(e);
          }
        }}
      />
    </div>
  );
}

export default Input;
