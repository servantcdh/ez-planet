import { motion } from 'framer-motion'
import type { PlanetConfig } from '../types/public'
import styles from '../styles/cosmos.module.css'

interface ZoomTransitionProps {
  planet: PlanetConfig
}

export function ZoomTransition({ planet }: ZoomTransitionProps) {
  return (
    <motion.div
      className={styles.zoomTransition}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
    >
      <motion.span
        className={styles.zoomPlanetLabel}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          color: planet.color,
          '--planet-color': planet.color,
        } as any}
      >
        {planet.label}
      </motion.span>
    </motion.div>
  )
}
