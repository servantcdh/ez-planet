import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
} from '@xyflow/react'
import { AnimatePresence } from 'framer-motion'

import type {
  CosmosCanvasProps,
  CosmosView,
  PlanetConfig,
  PlanetStatus,
  StarFieldConfig,
} from '../types/public'
import { PlanetNode } from './PlanetNode'
import { OrbitEdge } from './OrbitEdge'
import { StarField } from './StarField'
import { SidePanel } from './SidePanel'
import { PlanetInterior } from './PlanetInterior'
import { ZoomTransition } from './ZoomTransition'
import { CosmosTutorial } from './CosmosTutorial'
import styles from '../styles/cosmos.module.css'

const defaultNodeTypes: NodeTypes = { planet: PlanetNode as any }
const defaultEdgeTypes: EdgeTypes = { orbit: OrbitEdge as any }

function CosmosCanvasInner({
  planets,
  orbits,
  onPlanetClick,
  onPlanetEnter,
  onPlanetExit,
  onSatelliteClick,
  onPlanetDrag,
  tutorialSteps,
  showTutorial: showTutorialProp,
  onTutorialComplete,
  initialView,
  onViewChange,
  renderPlanetInterior,
  topBar,
  theme,
  starField = true,
  nodeTypes: customNodeTypes,
  edgeTypes: customEdgeTypes,
  className,
  style: rootStyle,
}: CosmosCanvasProps) {
  const [view, setView] = useState<CosmosView>(initialView ?? { mode: 'universe' })
  const [showTutorial, setShowTutorial] = useState(showTutorialProp ?? false)
  const lastClickTime = useRef<number>(0)
  const lastClickNode = useRef<string>('')
  const { setCenter, fitView } = useReactFlow()

  const updateView = useCallback(
    (next: CosmosView) => {
      setView(next)
      onViewChange?.(next)
    },
    [onViewChange],
  )

  const getPlanetById = useCallback(
    (id: string) => planets.find((p) => p.id === id),
    [planets],
  )

  // ─── Nodes & Edges ───
  const initialNodes: Node[] = useMemo(
    () =>
      planets.map((p) => ({
        id: p.id,
        type: 'planet',
        position: { x: p.x, y: p.y },
        data: {
          label: p.label,
          subtitle: p.subtitle,
          color: p.color,
          status: (p.status ?? 'idle') as PlanetStatus,
          isSelected: false,
        },
      })),
    [planets],
  )

  const initialEdges: Edge[] = useMemo(
    () =>
      orbits.map((o, i) => ({
        id: `orbit-${i}`,
        source: o.source,
        target: o.target,
        type: 'orbit',
        data: { label: o.label },
        animated: true,
      })),
    [orbits],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const highlightPlanet = useCallback(
    (planetId: string | null) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isSelected: n.id === planetId },
        })),
      )
    },
    [setNodes],
  )

  // ─── Layout controls ───
  const resetLayout = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const planet = planets.find((p) => p.id === n.id)
        if (!planet) return n
        return { ...n, position: { x: planet.x, y: planet.y } }
      }),
    )
    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 50)
  }, [planets, setNodes, fitView])

  const autoLayout = useCallback(() => {
    const count = nodes.length
    if (count === 0) return
    const cx = 800
    const cy = 400
    const radius = Math.max(200, count * 40)
    setNodes((nds) =>
      nds.map((n, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2
        return {
          ...n,
          position: {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
          },
        }
      }),
    )
    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 50)
  }, [nodes.length, setNodes, fitView])

  // ─── Tutorial step → lifecycle flow visualization ───
  const handleTutorialStepChange = useCallback(
    (stepIdx: number) => {
      if (!tutorialSteps) return
      if (stepIdx < 0) {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, status: 'idle' as PlanetStatus, isSelected: false },
          })),
        )
        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            animated: true,
            data: { ...e.data, isActive: false, isDimmed: false },
          })),
        )
        return
      }

      const completedIds = new Set(tutorialSteps.slice(0, stepIdx).map((s) => s.planetId))
      const currentId = tutorialSteps[stepIdx]?.planetId

      setNodes((nds) =>
        nds.map((n) => {
          let status: PlanetStatus = 'idle'
          if (n.id === currentId) status = 'running'
          else if (completedIds.has(n.id)) status = 'success'
          return {
            ...n,
            data: { ...n.data, status, isSelected: n.id === currentId },
          }
        }),
      )

      const activeSet = new Set([...completedIds, currentId])
      setEdges((eds) =>
        eds.map((e) => {
          const srcDone = completedIds.has(e.source)
          const tgtActive = activeSet.has(e.target)
          const isActive = srcDone && tgtActive
          return {
            ...e,
            animated: isActive,
            data: { ...e.data, isActive, isDimmed: !isActive },
          }
        }),
      )
    },
    [tutorialSteps, setNodes, setEdges],
  )

  // ─── Double-click detection ───
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const now = Date.now()
      const isDoubleClick =
        now - lastClickTime.current < 300 && lastClickNode.current === node.id
      lastClickTime.current = now
      lastClickNode.current = node.id

      const planet = getPlanetById(node.id)

      if (isDoubleClick && planet) {
        handleEnterPlanet(planet)
      } else {
        if (view.mode === 'inspecting' && view.planetId === node.id) {
          updateView({ mode: 'universe' })
          highlightPlanet(null)
          setCenter(800, 400, { zoom: 0.8, duration: 600 })
        } else {
          updateView({ mode: 'inspecting', planetId: node.id })
          highlightPlanet(node.id)
          setCenter(node.position.x + 50, node.position.y + 50, { zoom: 1.5, duration: 600 })
          if (planet) onPlanetClick?.(planet)
        }
      }
    },
    [view, highlightPlanet, getPlanetById, updateView, onPlanetClick, setCenter],
  )

  const handleEnterPlanet = useCallback(
    (planet: PlanetConfig) => {
      updateView({ mode: 'entering', planetId: planet.id })
      highlightPlanet(null)
      onPlanetEnter?.(planet)
      setCenter(planet.x + 50, planet.y + 50, { zoom: 6, duration: 800 })
      setTimeout(() => {
        updateView({ mode: 'planet', planetId: planet.id })
      }, 900)
    },
    [setCenter, highlightPlanet, updateView, onPlanetEnter],
  )

  const handleExitPlanet = useCallback(() => {
    updateView({ mode: 'universe' })
    onPlanetExit?.()
    setTimeout(() => {
      setCenter(800, 400, { zoom: 0.8, duration: 600 })
    }, 100)
  }, [setCenter, updateView, onPlanetExit])

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onPlanetDrag?.(node.id, { x: node.position.x, y: node.position.y })
    },
    [onPlanetDrag],
  )

  const onPaneClick = useCallback(() => {
    if (view.mode === 'inspecting') {
      updateView({ mode: 'universe' })
      highlightPlanet(null)
      setCenter(800, 400, { zoom: 0.8, duration: 600 })
    }
  }, [view, highlightPlanet, updateView, setCenter])

  const flyTo = useCallback(
    (x: number, y: number, zoom: number, duration: number) => {
      setCenter(x, y, { zoom, duration })
    },
    [setCenter],
  )

  // ─── Escape key: back to previous state ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showTutorial) return // tutorial handles its own ESC

      if (view.mode === 'inspecting') {
        updateView({ mode: 'universe' })
        highlightPlanet(null)
        setCenter(800, 400, { zoom: 0.8, duration: 600 })
      } else if (view.mode === 'planet') {
        handleExitPlanet()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, showTutorial, updateView, highlightPlanet, setCenter, handleExitPlanet])

  const activePlanet = view.mode !== 'universe' ? getPlanetById(view.planetId) : undefined
  const isUniverseVisible = view.mode !== 'planet'

  const mergedNodeTypes = useMemo(
    () => ({ ...defaultNodeTypes, ...customNodeTypes }),
    [customNodeTypes],
  )
  const mergedEdgeTypes = useMemo(
    () => ({ ...defaultEdgeTypes, ...customEdgeTypes }),
    [customEdgeTypes],
  )

  // Resolve starfield config
  const showStarField = starField !== false
  const starFieldConfig: StarFieldConfig =
    typeof starField === 'object' ? starField : {}

  // Theme CSS variables
  const themeVars: Record<string, string> = {}
  if (theme?.background) themeVars['--cc-bg'] = theme.background
  if (theme?.textColor) themeVars['--cc-text'] = theme.textColor
  if (theme?.panelBackground) themeVars['--cc-panel-bg'] = theme.panelBackground
  if (theme?.panelBorder) themeVars['--cc-panel-border'] = theme.panelBorder
  if (theme?.controlsBackground) themeVars['--cc-controls-bg'] = theme.controlsBackground
  if (theme?.fontFamily) themeVars['--cc-font-family'] = theme.fontFamily

  return (
    <div
      className={`${styles.root} ${className ?? ''}`}
      style={{ ...themeVars, ...rootStyle } as any}
    >
      {/* Layer 0: Three.js starfield */}
      {showStarField && (
        <div className={styles.layerStarField}>
          <StarField
            config={starFieldConfig}
            background={theme?.background}
          />
        </div>
      )}

      {/* Layer 1: ReactFlow canvas */}
      <div
        className={styles.layerReactFlow}
        data-hidden={!isUniverseVisible || undefined}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          nodeTypes={mergedNodeTypes}
          edgeTypes={mergedEdgeTypes}
          nodesDraggable
          nodeDragThreshold={5}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
          minZoom={0.3}
          maxZoom={8}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={50}
            size={1}
            color="rgba(255, 255, 255, 0.05)"
          />
          <Controls
            style={{ top: 60 }}
            showInteractive={false}
          >
            {/* Reset to original positions */}
            <button
              className="react-flow__controls-button"
              onClick={resetLayout}
              title="Reset layout"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
            {/* Auto circular layout */}
            <button
              className="react-flow__controls-button"
              onClick={autoLayout}
              title="Auto layout"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <circle cx="12" cy="3" r="2"/>
                <circle cx="19.8" cy="8" r="2"/>
                <circle cx="17.6" cy="17" r="2"/>
                <circle cx="6.4" cy="17" r="2"/>
                <circle cx="4.2" cy="8" r="2"/>
                <path d="M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
              </svg>
            </button>
          </Controls>
          <MiniMap
            nodeColor={(n) => (n.data?.color as string) || '#666'}
            maskColor="rgba(10, 10, 26, 0.7)"
            style={{
              background: 'rgba(10, 10, 26, 0.9)',
            }}
          />
        </ReactFlow>
      </div>

      {/* Zoom Transition */}
      <AnimatePresence>
        {view.mode === 'entering' && activePlanet && (
          <ZoomTransition planet={activePlanet} />
        )}
      </AnimatePresence>

      {/* Planet Interior */}
      <AnimatePresence>
        {view.mode === 'planet' && activePlanet && (
          <PlanetInterior
            planet={activePlanet}
            onExit={handleExitPlanet}
            onSatelliteClick={onSatelliteClick}
            renderCustom={renderPlanetInterior}
          />
        )}
      </AnimatePresence>

      {/* Side Panel */}
      <AnimatePresence>
        {view.mode === 'inspecting' && activePlanet && (
          <SidePanel
            planet={activePlanet}
            onClose={() => {
              updateView({ mode: 'universe' })
              highlightPlanet(null)
              setCenter(800, 400, { zoom: 0.8, duration: 600 })
            }}
            onEnterPlanet={() => handleEnterPlanet(activePlanet)}
            onSatelliteClick={onSatelliteClick}
          />
        )}
      </AnimatePresence>

      {/* TopBar Slot */}
      {topBar && !showTutorial && (
        <div className={styles.topBarSlot}>{topBar}</div>
      )}

      {/* Tutorial */}
      <AnimatePresence>
        {showTutorial && tutorialSteps && tutorialSteps.length > 0 && (
          <CosmosTutorial
            steps={tutorialSteps}
            planets={planets}
            onHighlightPlanet={highlightPlanet}
            onStepChange={handleTutorialStepChange}
            onFinish={() => {
              setShowTutorial(false)
              onTutorialComplete?.()
            }}
            flyTo={flyTo}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * CosmosCanvas — ReactFlowProvider wrapper for the cosmic visualization.
 *
 * Renders: StarField + ReactFlow graph + SidePanel + PlanetInterior + Tutorial
 * All data via props, no API dependencies.
 */
export function CosmosCanvas(props: CosmosCanvasProps) {
  return (
    <ReactFlowProvider>
      <CosmosCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
