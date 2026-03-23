import type { UIType } from "@/types/ui-type.interface";

interface ProgressType extends UIType<"sm" | "md" | "lg", "primary" | "secondary" | "accent"> {
  totalValue: number;
  currentValue: number;
  isShowValue?: boolean;
  isShowPercent?: boolean;
  direction?: "vertical" | "horizontal";
  justify?: "start" | "end";
}

function Progress({
  totalValue,
  currentValue,
  isShowValue,
  isShowPercent,
  style = "primary",
  direction = "horizontal",
  justify = "start",
}: ProgressType) {
  return (
    <div className="progress-wrapper" data-style={style} data-float={direction}>
      <div className={`progress-bar progress-bar-${justify}`}>
        <div
          className="progress"
          style={{ width: `${(currentValue / totalValue) * 100}%` }}
        />
      </div>
      {isShowValue && (
        <div className="progress-value">
          <p>
            {currentValue} / {totalValue}
          </p>
        </div>
      )}
      {isShowPercent && (
        <div className="progress-percent">
          <p>{((currentValue / totalValue) * 100).toFixed(2)}%</p>
        </div>
      )}
    </div>
  );
}

export default Progress;
