export interface UIType<
  TSize extends string = "xs" | "sm" | "md" | "lg" | "xl",
  TStyle extends string = string,
> {
  size?: TSize;
  style?: TStyle;
}
