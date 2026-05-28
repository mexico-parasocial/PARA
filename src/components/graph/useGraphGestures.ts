import {useCallback, useEffect, useRef} from 'react'
import {Platform} from 'react-native'

export interface GraphViewport {
  panX: number
  panY: number
  scale: number
}

export interface GraphGestureState {
  isPanning: boolean
  isPinching: boolean
  lastTapTime: number
}

export function useGraphGestures(
  onPan: (dx: number, dy: number) => void,
  onZoom: (delta: number, centerX?: number, centerY?: number) => void,
  onDoubleTap: () => void,
) {
  const viewportRef = useRef<GraphViewport>({panX: 0, panY: 0, scale: 1})
  const gestureRef = useRef<GraphGestureState>({isPanning: false, isPinching: false, lastTapTime: 0})
  const panOffsetRef = useRef({x: 0, y: 0})
  const pinchStartDistRef = useRef(0)
  const pinchStartScaleRef = useRef(1)
  const pinchCenterRef = useRef({x: 0, y: 0})

  const setViewport = useCallback((v: GraphViewport) => {
    viewportRef.current = v
  }, [])

  // Touch handlers for native
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (Platform.OS === 'web') {
      const touches = e.touches
      if (touches.length === 1) {
        gestureRef.current.isPanning = true
        panOffsetRef.current = {
          x: touches[0].clientX - viewportRef.current.panX,
          y: touches[0].clientY - viewportRef.current.panY,
        }
      } else if (touches.length === 2) {
        gestureRef.current.isPinching = true
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy)
        pinchStartScaleRef.current = viewportRef.current.scale
        pinchCenterRef.current = {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2,
        }
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (Platform.OS !== 'web') return
    e.preventDefault()
    
    const touches = e.touches
    if (touches.length === 1 && gestureRef.current.isPanning) {
      const newPanX = touches[0].clientX - panOffsetRef.current.x
      const newPanY = touches[0].clientY - panOffsetRef.current.y
      viewportRef.current.panX = newPanX
      viewportRef.current.panY = newPanY
      onPan(newPanX, newPanY)
    } else if (touches.length === 2 && gestureRef.current.isPinching) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scaleDelta = dist / pinchStartDistRef.current
      const newScale = Math.min(Math.max(pinchStartScaleRef.current * scaleDelta, 0.5), 3)
      viewportRef.current.scale = newScale
      onZoom(newScale - viewportRef.current.scale, pinchCenterRef.current.x, pinchCenterRef.current.y)
    }
  }, [onPan, onZoom])

  const handleTouchEnd = useCallback(() => {
    gestureRef.current.isPanning = false
    gestureRef.current.isPinching = false
  }, [])

  // Mouse wheel zoom for web
  useEffect(() => {
    if (Platform.OS !== 'web') return
    
    // Mouse wheel zoom is handled by the canvas element listener
    return () => {}
  }, [onZoom])

  // Keyboard shortcuts for web
  useEffect(() => {
    if (Platform.OS !== 'web') return
    
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        const newScale = Math.min(viewportRef.current.scale + 0.3, 3)
        viewportRef.current.scale = newScale
        onZoom(0.3)
      } else if (e.key === '-' || e.key === '_') {
        const newScale = Math.max(viewportRef.current.scale - 0.3, 0.5)
        viewportRef.current.scale = newScale
        onZoom(-0.3)
      } else if (e.key === '0') {
        viewportRef.current.scale = 1
        viewportRef.current.panX = 0
        viewportRef.current.panY = 0
        onPan(0, 0)
        onZoom(0)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPan, onZoom])

  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - gestureRef.current.lastTapTime < 300) {
      onDoubleTap()
    }
    gestureRef.current.lastTapTime = now
  }, [onDoubleTap])

  return {
    viewportRef,
    setViewport,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDoubleTap,
  }
}
