import type { ReactNode } from 'react'

export interface ToolbarRadioItemMeta {
  variant: 'radio'
  id: string
  name: string
  icon: ReactNode
  title: string
  checked: boolean
  disabled?: boolean
  isSlim?: boolean
  onClick: () => void
  subButtonItems?: ToolbarItemMeta[]
}

export interface ToolbarButtonItemMeta {
  variant: 'button'
  id?: string
  icon: ReactNode
  title: string
  tooltip?: string
  disabled?: boolean
  active?: boolean
  slim?: boolean
  onClick: () => void
  subItems?: ToolbarItemMeta[]
}

export interface ToolbarCheckboxItemMeta {
  variant: 'checkbox'
  id: string
  icon?: ReactNode
  title: string
  checked: boolean
  disabled?: boolean
  onClick: () => void
}

export interface ToolbarDividerItemMeta {
  variant: 'divider'
}

export type ToolbarItemMeta =
  | ToolbarRadioItemMeta
  | ToolbarButtonItemMeta
  | ToolbarCheckboxItemMeta
  | ToolbarDividerItemMeta

export interface LabelingUIMetaResult {
  toolbar: ToolbarItemMeta[]
}
