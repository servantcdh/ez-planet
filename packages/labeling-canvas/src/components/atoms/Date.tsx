import type { UIType } from "@/types/ui-type.interface";

interface DateType
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style" | "size">,
    UIType<"sm" | "md" | "lg"> {
  dateRef?: React.RefObject<HTMLInputElement>;
  id?: string;
  defaultValue?: string;
  isFull?: boolean;
  border?: "default" | "none" | "underline";
  children?: React.ReactNode;
  maxDate?: string;
  minDate?: string;
}

function Date({
  dateRef,
  id,
  defaultValue,
  size = "md",
  isFull,
  border = "default",
  children,
  maxDate,
  minDate,
  ...dateProps
}: DateType) {
  const {
    className: dateClassName,
    style: _style,
    ...restDateProps
  } = dateProps;

  return (
    <div
      className={`form form-date form-${size} ${border === "none" ? "form-borderless" : border === "underline" ? "form-underline" : ""} ${isFull ? "full-width" : ""} ${dateClassName ?? ""}`}
    >
      {children}
      <input
        ref={dateRef}
        id={id}
        type="date"
        {...restDateProps}
        className={`${isFull ? "full-width" : ""}`}
        {...(restDateProps &&
        (restDateProps as unknown as { value?: unknown }).value !== undefined
          ? {}
          : { defaultValue })}
        {...(maxDate ? { max: maxDate } : {})}
        {...(minDate ? { min: minDate } : {})}
      />
    </div>
  );
}

export default Date;
