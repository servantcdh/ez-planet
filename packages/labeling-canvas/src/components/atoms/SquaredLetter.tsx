import type { UIType } from "@/types/ui-type.interface";

interface SquaredLetterType
  extends UIType<"xs" | "sm" | "md" | "lg", "gray" | "white"> {
  letter: string;
  isRounded?: boolean;
}

function SquaredLetter({
  letter,
  isRounded = true,
  size = "md",
  style = "gray",
}: SquaredLetterType) {
  return (
    <div
      className={`squared-letter squared-letter-${size} ${isRounded ? "squared-letter-rounded" : ""}`}
      data-style={style}
    >
      {letter}
    </div>
  );
}

export default SquaredLetter;
