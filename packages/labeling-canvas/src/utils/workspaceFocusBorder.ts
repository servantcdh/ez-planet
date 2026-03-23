// 작업 영역 클래시피케이션 포커스 테두리 스타일
export const DEFAULT_WORKSPACE_BORDER_WIDTH = 2;
export const DEFAULT_WORKSPACE_BORDER_RADIUS = 0;
export const DEFAULT_WORKSPACE_BORDER_COLOR = "#ff00ff";

// 캔버스 오브젝트 포커스 테두리 스타일
export const IMAGE_SECTION_CANVAS_OBJECT_SELECTED_LAYOUT_STYLE = {
  borderScaleFactor: 2,
  borderColor: "#ff00ff",
  borderDashArray: [8, 4],
};

type WorkspaceBorderOptions = {
  isFocused: boolean;
  color?: string | null;
  borderWidth?: number;
  borderRadius?: number;
  inactiveBorderRadius?: number;
  inactiveBorderColor?: string;
  fallbackColor?: string;
};

export function resolveWorkspaceBorderStyle({
  isFocused,
  color,
  borderWidth = DEFAULT_WORKSPACE_BORDER_WIDTH,
  borderRadius = DEFAULT_WORKSPACE_BORDER_RADIUS,
  inactiveBorderRadius = borderRadius,
  inactiveBorderColor = "transparent",
  fallbackColor = DEFAULT_WORKSPACE_BORDER_COLOR,
}: WorkspaceBorderOptions): { border: string; borderRadius: number } {
  if (isFocused) {
    const resolvedColor =
      typeof color === "string" && color.length > 0 ? color : fallbackColor;
    return {
      border: `${borderWidth}px solid ${resolvedColor}`,
      borderRadius,
    };
  }
  return {
    border: `${borderWidth}px solid ${inactiveBorderColor}`,
    borderRadius: inactiveBorderRadius,
  };
}
