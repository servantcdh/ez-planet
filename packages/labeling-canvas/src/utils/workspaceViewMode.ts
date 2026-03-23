import type { WorkspaceViewMode } from "../store/workspaceViewMode.store";

export function resolveWorkspaceViewModeFromContentType(
  contentType?: string | null
): WorkspaceViewMode | null {
  const normalized = (contentType ?? "").toUpperCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "IMAGE") {
    return "Image";
  }
  if (normalized === "TABLE") {
    return "Number";
  }
  if (normalized === "CUSTOM") {
    return "Text";
  }
  return "File";
}
