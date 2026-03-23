import type { IconName } from "@/components/atoms/Icon";

export interface ContentTypeMeta {
  normalized: string | null;
  iconType: IconName | null;
  isCustom: boolean;
}

export function getContentTypeMeta(
  contentType?: string | null
): ContentTypeMeta {
  const trimmed = typeof contentType === "string" ? contentType.trim() : "";

  if (!trimmed) {
    return {
      normalized: null,
      iconType: null,
      isCustom: true,
    };
  }

  const normalized = trimmed.toUpperCase();
  const isCustom = normalized === "CUSTOM";

  if (isCustom) {
    return {
      normalized,
      iconType: null,
      isCustom: true,
    };
  }

  return {
    normalized,
    iconType: `icon-file-${normalized.toLowerCase()}` as IconName,
    isCustom: false,
  };
}
