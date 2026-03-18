import type { ReactNode } from 'react'

// ─── Planet & Orbit ───

export interface PlanetConfig {
  id: string
  name: string
  description: string
  color: string
  icon?: ReactNode
  position: { x: number; y: number }
  satellites?: Satellite[]
  status?: 'idle' | 'running' | 'error' | 'disabled'
  meta?: Record<string, unknown>
}

export interface Satellite {
  id: string
  name: string
  description?: string
  icon?: ReactNode
  route?: string
  meta?: Record<string, unknown>
}

export interface OrbitConfig {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
}

// ─── View State ───

export type CosmosView =
  | { mode: 'universe' }
  | { mode: 'inspecting'; planetId: string }
  | { mode: 'entering'; planetId: string }
  | { mode: 'planet'; planetId: string }

// ─── Tutorial ───

export interface TutorialStep {
  phase: string
  title: string
  description: string
  highlightPlanetId?: string
  position?: { x: number; y: number }
}

// ─── Theme ───

export interface CosmosTheme {
  background: string
  starColor: string
  nebulaColor: string
  textColor: string
  panelBackground: string
  panelBorder: string
  fontFamily: string
}

// ─── Events ───

export interface CosmosNavigateEvent {
  planetId: string
  satelliteId?: string
}

// ─── Component Props ───

export interface CosmosWorkspaceProps {
  planets: PlanetConfig[]
  orbits: OrbitConfig[]
  onNavigate: (event: CosmosNavigateEvent) => void

  // Tutorial
  tutorialSteps?: TutorialStep[]
  showTutorial?: boolean
  onTutorialComplete?: () => void

  // View control
  initialView?: CosmosView
  onViewChange?: (view: CosmosView) => void

  // Customization
  theme?: Partial<CosmosTheme>
  topBar?: ReactNode

  // Layout
  className?: string
  style?: React.CSSProperties
}
