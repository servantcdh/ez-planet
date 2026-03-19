import type { LabelingIconName } from '../../types/public'
import { findIcon } from './iconSets'

export type IconSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<IconSize, number> = {
  xxs: 10,
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
}

interface LabelingIconProps {
  iconType: LabelingIconName
  size?: IconSize
  className?: string
  style?: React.CSSProperties
}

export function LabelingIcon({
  iconType,
  size = 'sm',
  className,
  style,
}: LabelingIconProps) {
  const icon = findIcon(iconType)
  if (!icon) return null

  const px = SIZE_MAP[size]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width={px}
      height={px}
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      className={className}
      style={style}
    >
      {icon.d.map((pathData, i) => (
        <path key={i} d={pathData} />
      ))}
    </svg>
  )
}
