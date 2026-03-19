import type { ReactNode } from 'react'
import { useLabelingUIMeta } from '../hooks/useLabelingUIMeta'
import { useViewModeStore } from '../store/view-mode.store'
import { useValidationModeStore } from '../store/validation-mode.store'
import {
  LabelingFloatingToolbar,
  type ToolbarItem,
} from './LabelingFloatingToolbar'
import type { ToolbarItemMeta } from '../hooks/labelingUIMeta/types'

interface LabelingToolbarInternalProps {
  children?: ReactNode
}

/**
 * Floating toolbar that renders view-mode-aware tools via useLabelingUIMeta.
 * Tool set, icons, and behavior all come from the UIMeta hooks.
 */
export function LabelingToolbar({ children }: LabelingToolbarInternalProps) {
  const viewMode = useViewModeStore((s) => s.mode)
  const isValidationMode = useValidationModeStore((s) => s.isValidationMode)
  const { toolbar } = useLabelingUIMeta(viewMode, isValidationMode)

  const items = toolbar.map(metaToToolbarItem)

  return (
    <LabelingFloatingToolbar items={items}>
      {children}
    </LabelingFloatingToolbar>
  )
}

function metaToToolbarItem(meta: ToolbarItemMeta): ToolbarItem {
  if (meta.variant === 'divider') {
    return { variant: 'divider' }
  }

  if (meta.variant === 'radio') {
    // Radio items with subButtonItems become button-with-sub for the floating toolbar
    if (meta.subButtonItems?.length) {
      return {
        variant: 'button',
        id: meta.id,
        icon: meta.icon,
        title: meta.title,
        active: meta.checked,
        disabled: meta.disabled,
        onClick: meta.onClick,
        subItems: meta.subButtonItems.map(metaToToolbarItem),
      }
    }
    return {
      variant: 'radio',
      id: meta.id,
      name: meta.name,
      icon: meta.icon,
      title: meta.title,
      checked: meta.checked,
      disabled: meta.disabled,
      onClick: meta.onClick,
    }
  }

  if (meta.variant === 'checkbox') {
    return {
      variant: 'checkbox',
      id: meta.id,
      icon: meta.icon,
      title: meta.title,
      checked: meta.checked,
      disabled: meta.disabled,
      onClick: meta.onClick,
    }
  }

  // button
  return {
    variant: 'button',
    id: meta.id,
    icon: meta.icon,
    title: meta.title,
    tooltip: meta.tooltip,
    disabled: meta.disabled,
    active: meta.active,
    slim: meta.slim,
    onClick: meta.onClick,
    subItems: meta.subItems?.map(metaToToolbarItem),
  }
}
