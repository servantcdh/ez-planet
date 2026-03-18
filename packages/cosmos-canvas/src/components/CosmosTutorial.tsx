import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TutorialStep } from '../types/public'
import styles from '../styles/cosmos.module.css'

type TutorialPhase = 'welcome' | 'stepping' | 'complete'

interface CosmosTutorialProps {
  steps: TutorialStep[]
  onHighlightPlanet: (planetId: string | null) => void
  onStepChange: (stepIdx: number) => void
  onFinish: () => void
  /** Camera flyover function — called with (x, y, zoom, duration) */
  flyTo?: (x: number, y: number, zoom: number, duration: number) => void
}

export function CosmosTutorial({
  steps,
  onHighlightPlanet,
  onStepChange,
  onFinish,
  flyTo: _flyTo,
}: CosmosTutorialProps) {
  const [phase, setPhase] = useState<TutorialPhase>('welcome')
  const [currentStep, setCurrentStep] = useState(0)

  const goToStep = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= steps.length) return
      setCurrentStep(idx)
      onStepChange(idx)
      const step = steps[idx]
      if (step.planetId) {
        onHighlightPlanet(step.planetId)
      }
    },
    [steps, onStepChange, onHighlightPlanet],
  )

  const handleStart = useCallback(() => {
    setPhase('stepping')
    goToStep(0)
  }, [goToStep])

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1)
    } else {
      setPhase('complete')
      onStepChange(-1) // reset
      onHighlightPlanet(null)
      setTimeout(() => onFinish(), 1500)
    }
  }, [currentStep, steps.length, goToStep, onStepChange, onHighlightPlanet, onFinish])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }, [currentStep, goToStep])

  const handleSkip = useCallback(() => {
    onStepChange(-1)
    onHighlightPlanet(null)
    onFinish()
  }, [onStepChange, onHighlightPlanet, onFinish])

  // Keyboard controls
  useEffect(() => {
    if (phase !== 'stepping') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, handleNext, handlePrev, handleSkip])

  const step = steps[currentStep]
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0

  return (
    <AnimatePresence mode="wait">
      {/* Welcome Screen */}
      {phase === 'welcome' && (
        <motion.div
          key="welcome"
          className={styles.tutorialOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className={styles.tutorialWelcome}>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              style={{ fontSize: '4rem', marginBottom: '1rem' }}
            >
              🪐
            </motion.div>
            <h1 className={styles.tutorialWelcomeTitle}>Welcome to the Cosmos</h1>
            <p className={styles.tutorialWelcomeDesc}>
              Explore the universe of your platform. Each planet represents a domain,
              and satellites are the features within.
            </p>
            <div className={styles.tutorialActions}>
              <button
                className={styles.tutorialButton}
                data-variant="ghost"
                onClick={handleSkip}
              >
                SKIP
              </button>
              <button
                className={styles.tutorialButton}
                data-variant="primary"
                onClick={handleStart}
              >
                LET&apos;S GO
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stepping Phase */}
      {phase === 'stepping' && step && (
        <motion.div
          key={`step-${currentStep}`}
          className={styles.tutorialCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {step.chipText && (
            <span
              className={styles.tutorialChip}
              style={{
                background: `${step.chipColor ?? '#3b82f6'}22`,
                color: step.chipColor ?? '#3b82f6',
              }}
            >
              {step.chipText}
            </span>
          )}
          <h3 className={styles.tutorialCardTitle}>{step.title}</h3>
          <p className={styles.tutorialCardDesc}>{step.description}</p>

          {/* Progress bar */}
          <div className={styles.tutorialProgress}>
            <div
              className={styles.tutorialProgressBar}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Footer */}
          <div className={styles.tutorialCardFooter}>
            <span className={styles.tutorialStepCounter}>
              {currentStep + 1} / {steps.length}
            </span>

            <div className={styles.tutorialDots}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={styles.tutorialDot}
                  data-active={i === currentStep || undefined}
                  data-done={i < currentStep || undefined}
                  onClick={() => goToStep(i)}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {currentStep > 0 && (
                <button
                  className={styles.tutorialButton}
                  data-variant="ghost"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={handlePrev}
                >
                  ←
                </button>
              )}
              <button
                className={styles.tutorialButton}
                data-variant="primary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? 'Finish' : '→'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Complete */}
      {phase === 'complete' && (
        <motion.div
          key="complete"
          className={styles.tutorialOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <motion.h1
            className={styles.tutorialWelcomeTitle}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5 }}
          >
            Welcome to the Cosmos
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
