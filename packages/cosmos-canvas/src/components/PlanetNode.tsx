import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import type { PlanetStatus } from '../types/public'

interface PlanetNodeData {
  label: string
  subtitle: string
  color: string
  status: PlanetStatus
  isSelected: boolean
}

function PlanetNodeComponent({ data }: NodeProps) {
  const { label, subtitle, color, status, isSelected } = data as unknown as PlanetNodeData

  const glowIntensity = isSelected ? 35 : status === 'running' ? 30 : status === 'error' ? 20 : 15
  const pulseScale = status === 'running' ? [1, 1.08, 1] : [1, 1.02, 1]
  const size = isSelected ? 110 : 100

  return (
    <div style={{ position: 'relative', cursor: 'pointer' }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, border: 'none', width: 8, height: 8, opacity: 0.6 }}
      />

      {/* Selection orbit ring */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 360 }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            scale: { duration: 0.3 },
          }}
          style={{
            position: 'absolute',
            top: -12,
            left: -12,
            width: size + 24,
            height: size + 24,
            borderRadius: '50%',
            border: `1.5px dashed ${color}88`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Planet body */}
      <motion.div
        animate={{ scale: pulseScale }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{
          boxShadow: `0 0 ${glowIntensity + 15}px ${color}aa, inset 0 0 25px rgba(255,255,255,0.15)`,
        }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}44)`,
          boxShadow: `0 0 ${glowIntensity}px ${color}88, inset 0 0 20px rgba(255,255,255,0.1)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${isSelected ? `${color}aa` : `${color}66`}`,
          transition: 'width 0.3s, height 0.3s, border-color 0.3s',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {label}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>
          {subtitle}
        </span>
      </motion.div>

      {/* Status indicator */}
      {status !== 'idle' && status !== 'disabled' && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background:
              status === 'running' ? '#2ecc71' : status === 'error' ? '#e74c3c' : '#27ae60',
            border: '2px solid rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* Double-click hint */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.5, y: 0 }}
          style={{
            position: 'absolute',
            bottom: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: '#fff',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            letterSpacing: 0.5,
          }}
        >
          double-click to enter
        </motion.div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, border: 'none', width: 8, height: 8, opacity: 0.6 }}
      />
    </div>
  )
}

export const PlanetNode = memo(PlanetNodeComponent)
