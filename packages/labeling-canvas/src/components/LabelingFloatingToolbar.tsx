import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import styles from '../styles/toolbar.module.css'

// ─── Toolbar Item Types ───

export interface ToolbarButtonItem {
  variant: 'button'
  id?: string
  icon?: ReactNode
  title?: string
  tooltip?: string
  disabled?: boolean
  active?: boolean
  slim?: boolean
  onClick?: () => void
  subItems?: ToolbarItem[]
}

export interface ToolbarRadioItem {
  variant: 'radio'
  id: string
  name: string
  icon?: ReactNode
  title?: string
  disabled?: boolean
  checked?: boolean
  onClick?: () => void
}

export interface ToolbarDividerItem {
  variant: 'divider'
}

export type ToolbarItem = ToolbarButtonItem | ToolbarRadioItem | ToolbarDividerItem

// ─── Component ───

interface LabelingFloatingToolbarProps {
  items: ToolbarItem[]
  show?: boolean
  verticalNav?: boolean
  children?: ReactNode
}

export function LabelingFloatingToolbar({
  items,
  show = true,
  verticalNav = false,
  children,
}: LabelingFloatingToolbarProps) {
  if (!show) return null

  return (
    <div
      className={styles.stickyWrapper}
      data-vertical-nav={verticalNav || undefined}
    >
      <div className={styles.toolbarWrapper}>
        {items.map((item, index) => (
          <ToolbarItemRenderer key={index} item={item} />
        ))}
        {children}
      </div>
    </div>
  )
}

// ─── Item Renderer ───

function ToolbarItemRenderer({ item }: { item: ToolbarItem }) {
  if (item.variant === 'divider') {
    return <div className={styles.divider} />
  }

  if (item.variant === 'radio') {
    return (
      <button
        className={styles.toolButton}
        data-active={item.checked || undefined}
        title={item.title}
        disabled={item.disabled}
        onClick={item.onClick}
      >
        {item.icon}
      </button>
    )
  }

  // button
  if (item.subItems?.length) {
    return <ButtonWithSub item={item} />
  }

  return (
    <button
      className={`${styles.toolButton} ${item.slim ? styles.toolButtonSlim : ''}`}
      data-active={item.active || undefined}
      title={item.tooltip ?? item.title}
      disabled={item.disabled}
      onClick={item.onClick}
    >
      {item.icon}
    </button>
  )
}

// ─── Button with Sub-panel ───

function ButtonWithSub({ item }: { item: ToolbarButtonItem }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [open, handleOutsideClick])

  return (
    <div className={styles.buttonWithSub} ref={ref}>
      <button
        className={`${styles.toolButton} ${item.slim ? styles.toolButtonSlim : ''}`}
        data-active={item.active || undefined}
        title={item.tooltip ?? item.title}
        disabled={item.disabled}
        onClick={() => {
          item.onClick?.()
          setOpen((prev) => !prev)
        }}
      >
        {item.icon}
      </button>
      {open && item.subItems && (
        <div className={styles.subToolbar}>
          {item.subItems.map((sub, i) => (
            <ToolbarItemRenderer key={i} item={sub} />
          ))}
        </div>
      )}
    </div>
  )
}
