import {type ComponentRef, useMemo, useRef} from 'react'
import {PanResponder, View} from 'react-native'

import {atoms as a} from '#/alf'
import {type MapCamera, zoomMapCamera} from '../map'
import {type MapViewportProps} from './MapViewport.types'

type Pinch = {
  distance: number
  camera: MapCamera
  anchor: {x: number; y: number}
}

export function MapViewport({camera, setCamera, children}: MapViewportProps) {
  const viewport = useRef<ComponentRef<typeof View>>(null)
  const origin = useRef({x: 0, y: 0})
  const current = useRef(camera)
  current.current = camera
  const pan = useRef({camera, dx: 0, dy: 0})
  const pinch = useRef<Pinch | undefined>(undefined)
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, gesture) =>
          event.nativeEvent.touches.length > 1 ||
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6,
        onPanResponderGrant: (_event, gesture) => {
          pan.current = {
            camera: current.current,
            dx: gesture.dx,
            dy: gesture.dy,
          }
          pinch.current = undefined
        },
        onPanResponderMove: (event, gesture) => {
          const [first, second] = event.nativeEvent.touches
          if (!first) return
          if (second) {
            const distance = Math.hypot(
              second.pageX - first.pageX,
              second.pageY - first.pageY,
            )
            const anchor = {
              x: (first.pageX + second.pageX) / 2 - origin.current.x,
              y: (first.pageY + second.pageY) / 2 - origin.current.y,
            }
            if (!pinch.current)
              pinch.current = {
                distance: Math.max(1, distance),
                camera: current.current,
                anchor,
              }
            const start = pinch.current
            const next = zoomMapCamera(
              start.camera,
              (start.camera.scale * distance) / start.distance,
              start.anchor,
            )
            setCamera({
              ...next,
              x: next.x + anchor.x - start.anchor.x,
              y: next.y + anchor.y - start.anchor.y,
            })
          } else {
            if (pinch.current) {
              pan.current = {
                camera: current.current,
                dx: gesture.dx,
                dy: gesture.dy,
              }
              pinch.current = undefined
            }
            const start = pan.current
            setCamera({
              ...start.camera,
              x: start.camera.x + gesture.dx - start.dx,
              y: start.camera.y + gesture.dy - start.dy,
            })
          }
        },
        onPanResponderRelease: () => {
          pinch.current = undefined
        },
        onPanResponderTerminate: () => {
          pinch.current = undefined
        },
      }),
    [setCamera],
  )
  return (
    <View
      ref={viewport}
      onLayout={() =>
        viewport.current?.measureInWindow((x, y) => {
          origin.current = {x, y}
        })
      }
      style={[a.absolute, a.inset_0]}
      {...responder.panHandlers}>
      {children}
    </View>
  )
}
