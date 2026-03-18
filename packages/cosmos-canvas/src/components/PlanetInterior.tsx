import { type ReactNode, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlanetConfig, CosmosNavigateEvent } from '../types/public'
import styles from '../styles/cosmos.module.css'

interface PlanetInteriorProps {
  planet: PlanetConfig
  onExit: () => void
  onSatelliteClick?: (event: CosmosNavigateEvent) => void
  renderCustom?: (planet: PlanetConfig, onExit: () => void) => ReactNode
}

export function PlanetInterior({
  planet,
  onExit,
  onSatelliteClick,
  renderCustom,
}: PlanetInteriorProps) {
  const [activeSatId, setActiveSatId] = useState<string | null>(null)

  // If host provides custom renderer, use it
  if (renderCustom) {
    return (
      <motion.div
        className={styles.planetInterior}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {renderCustom(planet, onExit)}
      </motion.div>
    )
  }

  const sats = planet.satellites
  const orbitRadius = Math.max(180, sats.length * 35)

  const handleSatClick = useCallback(
    (satId: string) => {
      setActiveSatId(satId)
      const sat = sats.find((s) => s.id === satId)
      onSatelliteClick?.({
        planetId: planet.id,
        satelliteId: satId,
        satellite: sat,
      })
    },
    [planet.id, sats, onSatelliteClick],
  )

  return (
    <motion.div
      className={styles.planetInterior}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back button */}
      <button className={styles.interiorBackButton} onClick={onExit}>
        ← Back to Universe
      </button>

      <div className={styles.interiorCenter}>
        {/* Orbit rings */}
        {[1, 2, 3].map((ring) => (
          <div
            key={ring}
            className={styles.orbitRing}
            style={{
              width: orbitRadius * ring * 0.7,
              height: orbitRadius * ring * 0.7,
              top: `calc(50% - ${(orbitRadius * ring * 0.7) / 2}px)`,
              left: `calc(50% - ${(orbitRadius * ring * 0.7) / 2}px)`,
            }}
          />
        ))}

        {/* Central planet */}
        <div
          className={styles.interiorPlanet}
          style={{
            background: `radial-gradient(circle at 35% 35%, ${planet.color}cc, ${planet.color}44)`,
            boxShadow: `0 0 60px ${planet.color}66, 0 0 120px ${planet.color}22`,
          }}
        >
          <span className={styles.interiorPlanetLabel}>{planet.label}</span>
          <span className={styles.interiorPlanetSubtitle}>{planet.subtitle}</span>
        </div>

        {/* Satellites arranged in circle */}
        <AnimatePresence>
          {sats.map((sat, idx) => {
            const angle = (idx / sats.length) * Math.PI * 2 - Math.PI / 2
            const x = Math.cos(angle) * orbitRadius
            const y = Math.sin(angle) * orbitRadius

            return (
              <motion.div
                key={sat.id}
                className={styles.satelliteNode}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  damping: 15,
                  stiffness: 200,
                  delay: idx * 0.08,
                }}
                style={{
                  left: `calc(50% + ${x}px - 32px)`,
                  top: `calc(50% + ${y}px - 40px)`,
                }}
                onClick={() => handleSatClick(sat.id)}
              >
                <div
                  className={styles.satelliteNodeIcon}
                  style={{
                    borderColor:
                      activeSatId === sat.id
                        ? `${planet.color}88`
                        : 'rgba(255,255,255,0.15)',
                    boxShadow:
                      activeSatId === sat.id
                        ? `0 0 20px ${planet.color}44`
                        : 'none',
                  }}
                >
                  {sat.icon ?? '●'}
                  {sat.summary?.running != null && sat.summary.running > 0 && (
                    <span className={styles.satelliteNodeBadge}>
                      {sat.summary.running}
                    </span>
                  )}
                </div>
                <span className={styles.satelliteNodeLabel}>{sat.label}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
