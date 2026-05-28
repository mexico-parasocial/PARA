import {useCallback, useMemo, useRef} from 'react'
import {PanResponder} from 'react-native'

export interface NativeGraphGestureConfig {
  panX: number
  panY: number
  scale: number
  onPanChange: (x: number, y: number) => void
  onScaleChange: (scale: number) => void
  onRefresh?: () => void
}

interface PinchState {
  isPinching: boolean
  startDist: number
  startScale: number
  startPanX: number
  startPanY: number
}

/**
 * Hook that builds a PanResponder supporting both single-finger pan
 * and two-finger pinch-to-zoom on iOS/Android.
 *
 * This is intentionally separate from useGraphGestures (which only
 * handles web touch events) so each platform keeps its own gesture
 * implementation without name collisions.
 */
export function useNativeGraphGestures({
  panX,
  panY,
  scale,
  onPanChange,
  onScaleChange,
  onRefresh,
}: NativeGraphGestureConfig) {
  const panOffsetRef = useRef({x: panX, y: panY})
  const hasTriggeredRefreshRef = useRef(false)
  const pinchRef = useRef<PinchState>({
    isPinching: false,
    startDist: 0,
    startScale: 1,
    startPanX: 0,
    startPanY: 0,
  })

  // Keep refs in sync with props so PanResponder callbacks see latest values
  const stateRef = useRef({panX, panY, scale})
  stateRef.current = {panX, panY, scale}

  const getTouchDistance = useCallback((touches: Array<{pageX: number; pageY: number}>) => {
    if (touches.length < 2) return 0
    const dx = touches[0].pageX - touches[1].pageX
    const dy = touches[0].pageY - touches[1].pageY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2
        },
        onPanResponderGrant: () => {
          hasTriggeredRefreshRef.current = false
          // If we were pinching and lost a finger, reset pinch state
          pinchRef.current.isPinching = false
        },
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches

          // ─── Pinch-to-zoom (2+ fingers) ────────────────────────────────
          if (touches.length >= 2) {
            const currentDist = getTouchDistance(touches)

            if (!pinchRef.current.isPinching) {
              // Start of pinch gesture
              pinchRef.current = {
                isPinching: true,
                startDist: currentDist,
                startScale: stateRef.current.scale,
                startPanX: stateRef.current.panX,
                startPanY: stateRef.current.panY,
              }
            } else if (currentDist > 0) {
              // Continuing pinch
              const ratio = currentDist / pinchRef.current.startDist
              const newScale = Math.min(
                Math.max(pinchRef.current.startScale * ratio, 0.5),
                3,
              )
              onScaleChange(newScale)
            }
            return
          }

          // ─── Single-finger pan ──────────────────────────────────────────
          if (pinchRef.current.isPinching) {
            // Just released second finger — reset so pan doesn't jump
            pinchRef.current.isPinching = false
            panOffsetRef.current.x = stateRef.current.panX
            panOffsetRef.current.y = stateRef.current.panY
          }

          const isHorizontal =
            Math.abs(gestureState.dx) >= Math.abs(gestureState.dy)
          const isFastDownwardPull =
            gestureState.dy > 60 && gestureState.vy > 0.3

          if (
            !isHorizontal &&
            isFastDownwardPull &&
            onRefresh &&
            !hasTriggeredRefreshRef.current
          ) {
            hasTriggeredRefreshRef.current = true
            onRefresh()
            return
          }

          if (!hasTriggeredRefreshRef.current) {
            const newPanX = panOffsetRef.current.x + gestureState.dx
            const newPanY = panOffsetRef.current.y + gestureState.dy
            onPanChange(newPanX, newPanY)
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          pinchRef.current.isPinching = false

          if (!hasTriggeredRefreshRef.current) {
            panOffsetRef.current.x = panOffsetRef.current.x + gestureState.dx
            panOffsetRef.current.y = panOffsetRef.current.y + gestureState.dy
          }
        },
        onPanResponderTerminate: () => {
          pinchRef.current.isPinching = false
        },
      }),
    [onRefresh, onPanChange, onScaleChange, getTouchDistance],
  )

  return {panResponder, panOffsetRef}
}
