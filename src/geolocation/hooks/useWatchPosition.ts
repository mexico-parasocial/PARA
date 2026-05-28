import {useCallback, useRef} from 'react'
import * as Location from 'expo-location'

import {type AccurateLocation} from '#/geolocation/hooks/useAccurateLocation'

export type WatchPositionOptions = {
  /** Target accuracy in meters (e.g. 10) */
  targetAccuracy: number
  /** Timeout in milliseconds (e.g. 30000) */
  timeout: number
  /** Called when target accuracy is reached */
  onReached: (loc: AccurateLocation) => void
  /** Called when timeout expires without reaching target */
  onTimeout: () => void
}

/**
 * Continuously watch GPS until the target accuracy is reached.
 *
 * Use case: user is at a protest or town hall and needs to "pin"
 * their contribution with high confidence.
 *
 * - Starts `Location.watchPositionAsync` with high accuracy
 * - On each update, checks if `coords.accuracy <= targetAccuracy`
 * - If reached: calls `onReached`, stops watching
 * - If timeout: calls `onTimeout`, stops watching
 *
 * Returns a `stop` function for manual cancellation.
 */
export function useWatchPosition() {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback((options: WatchPositionOptions) => {
    // Clean up any previous watch
    if (subscriptionRef.current) {
      subscriptionRef.current.remove()
      subscriptionRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    Location.requestForegroundPermissionsAsync().then(({granted}) => {
      if (!granted) {
        options.onTimeout()
        return
      }

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 0,
          timeInterval: 1000,
        },
        pos => {
          const accuracy = pos.coords.accuracy
          if (accuracy != null && accuracy <= options.targetAccuracy) {
            // Target reached — clean up and notify
            subscriptionRef.current?.remove()
            subscriptionRef.current = null
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }

            options.onReached({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              positionalAccuracy: accuracy,
              timestamp: pos.timestamp,
            })
          }
        },
      )
        .then(sub => {
          subscriptionRef.current = sub

          timeoutRef.current = setTimeout(() => {
            sub.remove()
            subscriptionRef.current = null
            timeoutRef.current = null
            options.onTimeout()
          }, options.timeout)
        })
        .catch(() => {
          options.onTimeout()
        })
    })
  }, [])

  const stop = useCallback(() => {
    subscriptionRef.current?.remove()
    subscriptionRef.current = null
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return {start, stop}
}
