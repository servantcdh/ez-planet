// TODO: IRIS-1672 버튼 child size 계산이 필요해지면 다시 사용
// import { resolveChildSize } from "@/lib/ui/size";
import type { UIType } from "@/types/ui-type.interface";

// TODO: IRIS-1672 SquaredLetter 재도입 시 import 활성화
// import SquaredLetter from "./SquaredLetter";

interface ButtonType
  extends Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      "style" | "title"
    >,
    UIType<"sm" | "md" | "lg", string> {
  className?: string;
  title?: string | React.ReactNode;
  style?:
    | "primary"
    | "primary-outline"
    | "secondary"
    | "secondary-outline"
    | "accent"
    | "accent-outline"
    | "transparent"
    | "gray"
    | "gray-outline";
  justify?: "center" | "between" | "start" | "end";
  letter?: string;
  isReadOnly?: boolean;
  isMinWidth?: boolean;
  isFull?: boolean;
  isSlim?: boolean;
  tooltip?: string;
  children?: React.ReactNode;
}

function Button({
  className,
  title,
  size = "md",
  style = "primary",
  justify = "center",
  letter,
  disabled,
  isReadOnly,
  isMinWidth,
  isFull,
  isSlim,
  tooltip,
  children,
  onClick,
  ...rest
}: ButtonType) {
  // TODO: IRIS-1672 SquaredLetter를 다시 사용하게 되면 childSize 활용 복구
  // const childSize = resolveChildSize({ parentSize: size });

  return (
    <button
      {...rest}
      type={rest.type ?? "button"}
      className={`button button-${size} button-${justify} ${isMinWidth ? "button-min" : ""} ${className ? className : ""} ${
        isReadOnly ? "button-readonly" : ""
      } ${
        disabled ? "disabled" : ""
      } ${!title ? "button-icon" : ""} ${isFull ? "full-width" : ""} ${isSlim ? "button-slim" : ""}`}
      data-style={style}
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      style={{
        paddingInline: isSlim ? "0.25rem" : "",
        aspectRatio: isSlim ? "auto" : "",
      }}
    >
      {children}
      {title && <span className="button__title">{title}</span>}
      {letter && (
        <span className="button__letter">{letter}</span>
        // <SquaredLetter
        //   letter={letter}
        //   size={childSize}
        //   style={
        //     style === "white" || style === "transparent" ? "gray" : "white"
        //   }
        // />
      )}
    </button>
  );
}

export default Button;
