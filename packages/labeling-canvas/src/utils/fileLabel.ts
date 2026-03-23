import type { IconName } from "@/components/atoms/Icon";

import type { FileValue } from "../types/domain";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "svg",
  "tiff",
]);
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "log",
  "json",
  "xml",
  "yaml",
  "yml",
]);
const TABLE_EXTENSIONS = new Set(["csv", "tsv", "xls", "xlsx"]);
const WORD_EXTENSIONS = new Set(["doc", "docx"]);

export function resolveFileName(value?: FileValue | null): string {
  if (typeof value?.fileName === "string" && value.fileName.length > 0) {
    return value.fileName;
  }
  return "";
}

export function resolveFileIconType(fileName?: string): IconName {
  const extension = (fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "icon-file-image";
  }
  if (extension === "csv") {
    return "icon-file-csv";
  }
  if (TABLE_EXTENSIONS.has(extension)) {
    return "icon-file-table";
  }
  if (TEXT_EXTENSIONS.has(extension)) {
    return "icon-file-text";
  }
  if (WORD_EXTENSIONS.has(extension)) {
    return "icon-file-word";
  }
  if (extension === "pdf") {
    return "icon-file-pdf";
  }
  return "icon-file";
}

export function buildFileDownloadUrl(value?: FileValue | null): string {
  return typeof value?.endpoint === "string" ? value.endpoint : "";
}
