import type { IconName } from "@/components/atoms/Icon";

interface CommonItemType {
  title?: string;
  iconType?: IconName;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export interface ButtonItemType extends CommonItemType {
  variant: "button";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  justify?: "center" | "between" | "start" | "end";
  letter?: string;
  isReadOnly?: boolean;
  isMinWidth?: boolean;
  isFull?: boolean;
  isSlim?: boolean;
  tooltip?: string;
  subButtonItems?: ToolbarItemType[];
}

export interface CheckboxItemType extends CommonItemType {
  variant: "checkbox";
  name: string;
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  subButtonItems?: ToolbarItemType[];
}

export interface RadioItemType extends CommonItemType {
  variant: "radio";
  name: string;
  label?: string;
  value?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface ToolbarDividerItemType extends CommonItemType {
  variant: "toolbarDivider";
}

export type ToolbarItemType =
  | ButtonItemType
  | CheckboxItemType
  | RadioItemType
  | ToolbarDividerItemType;

export interface ToolbarMeta {
  toolbar: ToolbarItemType[];
  breadcrumbItems: { label: string; onClick?: () => void }[];
}
