import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

function OrbitEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isActive = (data?.isActive as boolean) ?? false
  const isDimmed = (data?.isDimmed as boolean) ?? false

  const glowColor = isActive
    ? 'rgba(46, 204, 113, 0.25)'
    : 'rgba(100, 149, 237, 0.15)'
  const strokeColor = isActive
    ? 'rgba(46, 204, 113, 0.7)'
    : isDimmed
      ? 'rgba(100, 149, 237, 0.12)'
      : 'rgba(100, 149, 237, 0.4)'
  const strokeW = isActive ? 3 : 2
  const dash = isActive ? '12 4' : '8 4'

  return (
    <>
      {/* Glow layer */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: glowColor,
          strokeWidth: isActive ? 10 : 6,
          filter: `blur(${isActive ? 5 : 3}px)`,
          transition: 'stroke 0.6s, stroke-width 0.6s',
          ...style,
        }}
      />
      {/* Main orbit line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: strokeW,
          strokeDasharray: dash,
          transition: 'stroke 0.6s, stroke-width 0.6s',
          ...style,
        }}
      />
      {/* Label */}
      {data?.label && (
        <text>
          <textPath
            href={`#${id}`}
            startOffset="50%"
            textAnchor="middle"
            style={{
              fontSize: 9,
              fill: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'monospace',
            }}
          >
            {data.label as string}
          </textPath>
        </text>
      )}
    </>
  )
}

export const OrbitEdge = memo(OrbitEdgeComponent)
