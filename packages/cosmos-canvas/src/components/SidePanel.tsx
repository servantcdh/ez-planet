import { motion } from 'framer-motion'
import type { PlanetConfig, CosmosNavigateEvent } from '../types/public'
import styles from '../styles/cosmos.module.css'

interface SidePanelProps {
  planet: PlanetConfig
  onClose: () => void
  onEnterPlanet: () => void
  onSatelliteClick?: (event: CosmosNavigateEvent) => void
}

export function SidePanel({
  planet,
  onClose,
  onEnterPlanet,
  onSatelliteClick,
}: SidePanelProps) {
  return (
    <motion.div
      className={styles.sidePanel}
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        borderLeftColor: `${planet.color}22`,
      }}
    >
      {/* Header */}
      <div className={styles.sidePanelHeader}>
        <div className={styles.sidePanelTitle}>
          <div
            className={styles.sidePanelPlanetIcon}
            style={{
              background: `radial-gradient(circle at 35% 35%, ${planet.color}cc, ${planet.color}44)`,
              boxShadow: `0 0 15px ${planet.color}44`,
            }}
          >
            {planet.icon ?? planet.label[0]}
          </div>
          <div>
            <div className={styles.sidePanelName}>{planet.label}</div>
            <div className={styles.sidePanelSubtitle}>{planet.subtitle}</div>
          </div>
        </div>
        <button className={styles.sidePanelClose} onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Satellite List */}
      <div className={styles.sidePanelContent}>
        <div className={styles.satelliteList}>
          {planet.satellites.map((sat) => (
            <div
              key={sat.id}
              className={styles.satelliteItem}
              onClick={() =>
                onSatelliteClick?.({
                  planetId: planet.id,
                  satelliteId: sat.id,
                  satellite: sat,
                })
              }
            >
              <div className={styles.satelliteIcon}>{sat.icon ?? '●'}</div>
              <div className={styles.satelliteInfo}>
                <div className={styles.satelliteName}>{sat.label}</div>
                {sat.summary && (
                  <div className={styles.satelliteSummary}>
                    {sat.summary.total != null && `${sat.summary.total} total`}
                    {sat.summary.running != null && ` · ${sat.summary.running} running`}
                    {sat.summary.failed != null && sat.summary.failed > 0 && ` · ${sat.summary.failed} failed`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.sidePanelFooter}>
        <button
          className={styles.enterButton}
          style={{ borderColor: `${planet.color}44` }}
          onClick={onEnterPlanet}
        >
          Enter {planet.label}
        </button>
      </div>
    </motion.div>
  )
}
