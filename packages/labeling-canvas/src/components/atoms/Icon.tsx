import type { UIType } from "@/types/ui-type.interface";

import iconSets from "./iconSets";

export type IconName = (typeof iconSets)[number]["type"];

interface IconType extends UIType<"xxs" | "xs" | "sm" | "md" | "lg"> {
  iconType: IconName;
  className?: string;
  style?: string;
  fill?: string;
}

function Icon({ iconType, size = "md", className, style, fill }: IconType) {
  const sizeMap = {
    xxs: { width: "0.625rem", height: "0.625rem" },
    xs: { width: "0.75rem", height: "0.75rem" },
    sm: { width: "0.875rem", height: "0.875rem" },
    md: { width: "1rem", height: "1rem" },
    lg: { width: "1.25rem", height: "1.25rem" },
  };

  const iconSet = iconSets.find((iconSet) => {
    return iconType === iconSet.type;
  });

  return (
    <svg
      className={`icon icon-${size} icon-${style} ${iconType} ${className}`}
      {...sizeMap[size]}
      fillRule="evenodd"
      clipRule="evenodd"
      fill={fill ? fill : "currentColor"}
      viewBox={iconSet?.viewBox}
    >
      {iconSet?.d.map((dValue: string, idx: number) => (
        <path key={`svg_${idx}`} d={dValue} />
      ))}
    </svg>
  );
}

export default Icon;
