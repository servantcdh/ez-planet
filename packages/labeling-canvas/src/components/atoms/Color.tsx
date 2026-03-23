import type { UIType } from "@/types/ui-type.interface";

interface ColorType
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

function Color({
  inputRef,
  id,
  defaultValue,
  size = "md",
  isFull,
  border = "default",
  children,
  onPressReturn,
  ...inputProps
}: ColorType) {
  const {
    className: inputClassName,
    style: _style,
    ...restInputProps
  } = inputProps;

  return (
    <div
      className={`form form-color form-${size} ${border === "none" ? "form-borderless" : ""} ${isFull ? "full-width" : ""} ${inputClassName ?? ""}`}
    >
      {children}
      <input
        ref={inputRef}
        id={id}
        type="color"
        {...restInputProps}
        className={`${isFull ? "full-width" : ""}`}
        {...(restInputProps &&
        (restInputProps as unknown as { value?: unknown }).value !== undefined
          ? {}
          : { defaultValue })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onPressReturn?.(e);
          }
        }}
      />
    </div>
  );
}

export default Color;
