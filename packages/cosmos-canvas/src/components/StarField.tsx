import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import type * as THREE from 'three'
import type { StarFieldConfig } from '../types/public'

interface StarFieldProps {
  config?: StarFieldConfig
  background?: string
}

function Stars({ config }: { config: StarFieldConfig }) {
  const ref = useRef<THREE.Points>(null)
  const count = config.starCount ?? 2000
  const speed = config.rotationSpeed ?? 0.02

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50
    }
    return pos
  }, [count])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta * speed
      ref.current.rotation.y -= delta * (speed * 0.5)
    }
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={config.starColor ?? '#6495ed'}
        size={config.starSize ?? 0.05}
        sizeAttenuation
        depthWrite={false}
        opacity={0.8}
      />
    </Points>
  )
}

function NebulaCloud({ config }: { config: StarFieldConfig }) {
  const ref = useRef<THREE.Points>(null)
  const count = config.nebulaCount ?? 500

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = Math.random() * 8 + 5
      pos[i * 3] = Math.cos(theta) * r + (Math.random() - 0.5) * 3
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4
      pos[i * 3 + 2] = Math.sin(theta) * r + (Math.random() - 0.5) * 3 - 15
    }
    return pos
  }, [count])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.005
    }
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={config.nebulaColor ?? '#9b59b6'}
        size={config.nebulaSize ?? 0.12}
        sizeAttenuation
        depthWrite={false}
        opacity={0.3}
      />
    </Points>
  )
}

export function StarField({ config = {}, background }: StarFieldProps) {
  const bg = background ?? 'radial-gradient(ellipse at center, #0a0a2e 0%, #000008 100%)'

  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 60 }}
      style={{ background: bg, pointerEvents: 'none' }}
      events={() => ({ enabled: false, priority: 0, compute: () => {} } as any)}
    >
      <ambientLight intensity={0.1} />
      <Stars config={config} />
      <NebulaCloud config={config} />
    </Canvas>
  )
}
