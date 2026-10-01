import {useEffect, useRef} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {type MapCamera, zoomMapCamera} from '../map'
import {type MapViewportProps} from './MapViewport.types'

export function MapViewport({camera, setCamera, children}: MapViewportProps) {
  const {_} = useLingui()
  const viewport = useRef<HTMLDivElement>(null)
  const current = useRef(camera)
  current.current = camera
  const drag = useRef<
    {x: number; y: number; camera: MapCamera; moved: boolean} | undefined
  >(undefined)
  const touches = useRef(new Map<number, {x: number; y: number}>())
  const pinch = useRef<
    | {distance: number; camera: MapCamera; anchor: {x: number; y: number}}
    | undefined
  >(undefined)

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const bounds = element.getBoundingClientRect()
      setCamera(previous =>
        zoomMapCamera(
          previous,
          previous.scale * Math.exp(-event.deltaY * 0.0015),
          {x: event.clientX - bounds.left, y: event.clientY - bounds.top},
        ),
      )
    }
    element.addEventListener('wheel', wheel, {passive: false})
    return () => element.removeEventListener('wheel', wheel)
  }, [setCamera])

  return (
    <div
      ref={viewport}
      role="region"
      aria-label={_(
        msg`Interactive civic map. Use arrow keys to pan and plus or minus to zoom.`,
      )}
      tabIndex={0}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'grab',
      }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        const directions: Record<string, {x: number; y: number}> = {
          ArrowLeft: {x: 60, y: 0},
          ArrowRight: {x: -60, y: 0},
          ArrowUp: {x: 0, y: 60},
          ArrowDown: {x: 0, y: -60},
        }
        const direction = directions[event.key]
        if (direction) {
          event.preventDefault()
          setCamera(previous => ({
            ...previous,
            x: previous.x + direction.x,
            y: previous.y + direction.y,
          }))
        } else if (['+', '=', '-'].includes(event.key)) {
          event.preventDefault()
          const bounds = event.currentTarget.getBoundingClientRect()
          setCamera(previous =>
            zoomMapCamera(
              previous,
              previous.scale * (event.key === '-' ? 0.8 : 1.25),
              {x: bounds.width / 2, y: bounds.height / 2},
            ),
          )
        }
      }}
      onPointerDown={event => {
        if (event.button !== 0) return
        touches.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        })
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          camera: current.current,
          moved: false,
        }
        if (touches.current.size === 2) {
          const [first, second] = [...touches.current.values()]
          const bounds = event.currentTarget.getBoundingClientRect()
          pinch.current = {
            anchor: {
              x: (first.x + second.x) / 2 - bounds.left,
              y: (first.y + second.y) / 2 - bounds.top,
            },
            distance: Math.hypot(first.x - second.x, first.y - second.y),
            camera: current.current,
          }
        }
      }}
      onPointerMove={event => {
        const start = drag.current
        if (!start || !touches.current.has(event.pointerId)) return
        touches.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        })
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (!start.moved && Math.abs(dx) + Math.abs(dy) < 6) return
        start.moved = true
        event.currentTarget.setPointerCapture(event.pointerId)
        if (pinch.current && touches.current.size === 2) {
          const [first, second] = [...touches.current.values()]
          const bounds = event.currentTarget.getBoundingClientRect()
          const anchor = {
            x: (first.x + second.x) / 2 - bounds.left,
            y: (first.y + second.y) / 2 - bounds.top,
          }
          const next = zoomMapCamera(
            pinch.current.camera,
            (pinch.current.camera.scale *
              Math.hypot(first.x - second.x, first.y - second.y)) /
              Math.max(1, pinch.current.distance),
            pinch.current.anchor,
          )
          setCamera({
            ...next,
            x: next.x + anchor.x - pinch.current.anchor.x,
            y: next.y + anchor.y - pinch.current.anchor.y,
          })
        } else {
          setCamera({
            ...start.camera,
            x: start.camera.x + dx,
            y: start.camera.y + dy,
          })
        }
      }}
      onPointerUp={event => {
        touches.current.delete(event.pointerId)
        pinch.current = undefined
        const remaining = [...touches.current.values()][0]
        if (remaining)
          drag.current = {
            x: remaining.x,
            y: remaining.y,
            camera: current.current,
            moved: true,
          }
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => {
        touches.current.clear()
        drag.current = undefined
        pinch.current = undefined
      }}
      onPointerLeave={() => {
        if (!drag.current?.moved) {
          drag.current = undefined
          touches.current.clear()
        }
      }}
      onClickCapture={event => {
        if (drag.current?.moved) {
          event.stopPropagation()
          event.preventDefault()
        }
        drag.current = undefined
      }}>
      {children}
    </div>
  )
}
