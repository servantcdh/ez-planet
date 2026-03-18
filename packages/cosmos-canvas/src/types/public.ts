import type { ReactNode } from 'react'

// ─── Planet & Orbit ───

export type PlanetStatus = 'idle' | 'running' | 'error' | 'success' | 'disabled'

export interface Satellite {
  id: string
  label: string
  route?: string
  icon?: string | ReactNode
  summary?: {
    total?: number
    running?: number
    failed?: number
  }
  quickActions?: Array<{
    label: string
    action: string
  }>
  meta?: Record<string, unknown>
}

export interface PlanetConfig {
  id: string
  label: string
  subtitle: string
  color: string
  x: number
  y: number
  satellites: Satellite[]
  status?: PlanetStatus
  icon?: ReactNode
  meta?: Record<string, unknown>
}

export interface OrbitConfig {
  source: string
  target: string
  label?: string
}

// ─── View State ───

export type CosmosView =
  | { mode: 'universe' }
  | { mode: 'inspecting'; planetId: string }
  | { mode: 'entering'; planetId: string }
  | { mode: 'planet'; planetId: string }

// ─── Tutorial ───

export interface TutorialStep {
  planetId: string
  title: string
  description: string
  chipText?: string
  chipColor?: string
}

// ─── Theme ───

export interface CosmosTheme {
  background: string
  starColor: string
  nebulaColor: string
  textColor: string
  panelBackground: string
  panelBorder: string
  controlsBackground: string
  fontFamily: string
}

// ─── Events ───

export interface CosmosNavigateEvent {
  planetId: string
  satelliteId?: string
  satellite?: Satellite
}

// ─── Star Field Config ───

export interface StarFieldConfig {
  starCount?: number
  nebulaCount?: number
  starColor?: string
  nebulaColor?: string
  starSize?: number
  nebulaSize?: number
  rotationSpeed?: number
}

// ─── Component Props ───

export interface CosmosCanvasProps {
  planets: PlanetConfig[]
  orbits: OrbitConfig[]

  // Events
  onPlanetClick?: (planet: PlanetConfig) => void
  onPlanetEnter?: (planet: PlanetConfig) => void
  onPlanetExit?: () => void
  onSatelliteClick?: (event: CosmosNavigateEvent) => void

  // Tutorial
  tutorialSteps?: TutorialStep[]
  showTutorial?: boolean
  onTutorialComplete?: () => void

  // View control
  initialView?: CosmosView
  onViewChange?: (view: CosmosView) => void

  // Planet interior
  renderPlanetInterior?: (planet: PlanetConfig, onExit: () => void) => ReactNode

  // Customization
  topBar?: ReactNode
  theme?: Partial<CosmosTheme>
  starField?: boolean | StarFieldConfig

  // Custom node/edge types
  nodeTypes?: Record<string, React.ComponentType<any>>
  edgeTypes?: Record<string, React.ComponentType<any>>

  // Layout
  className?: string
  style?: React.CSSProperties
}

// Legacy compat alias
export type CosmosWorkspaceProps = CosmosCanvasProps
