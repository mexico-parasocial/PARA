import {useEffect, useRef} from 'react'

import {getCurrentState, onAppStateChange} from '#/lib/appState'
import {useAnalytics} from '#/analytics'
import {Features, features} from '#/analytics/features'
import {IS_DEV, IS_TESTFLIGHT} from '#/env'

/**
 * Tracks passive analytics like app foreground/background time.
 */
export function PassiveAnalytics() {
  const ax = useAnalytics()
  const lastActive = useRef(
    getCurrentState() === 'active' ? performance.now() : null,
  )

  useEffect(() => {
    const sub = onAppStateChange(state => {
      if (state === 'active') {
        lastActive.current = performance.now()
        ax.metric('state:foreground', {})
      } else if (lastActive.current !== null) {
        ax.metric('state:background', {
          secondsActive: Math.round(
            (performance.now() - lastActive.current) / 1e3,
          ),
        })
      }

      if (IS_DEV || IS_TESTFLIGHT) {
        const featureState = Object.values(Features).reduce(
          (acc, feature) => {
            acc[feature] = features.evalFeature(feature)
            return acc
          },
          {} as Record<Features, unknown>,
        )
        ax.logger.info('FEATURES', {
          features: featureState,
          definitions: features.getFeatures(),
        })
      }
    })
    return () => sub.remove()
  }, [ax])

  return null
}
