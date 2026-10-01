import {type ReactNode, useMemo} from 'react'
import {Gesture, GestureDetector} from 'react-native-gesture-handler'
import {runOnJS, type SharedValue, withTiming} from 'react-native-reanimated'

const SHEET_DISMISS_OFFSET = 100
const SHEET_DISMISS_VELOCITY = 800

type SheetDragOptions = {
  translateY: SharedValue<number>
  dismissing: SharedValue<boolean>
  onDismiss: () => void
}

/** Swipe-down-to-dismiss for the map's bottom sheets (native only). */
export function useSheetDragGesture({
  translateY,
  dismissing,
  onDismiss,
}: SheetDragOptions) {
  return useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onChange(e => {
          'worklet'
          // Track downward travel only; upward drags pin the sheet in place.
          translateY.set(Math.max(0, e.translationY))
        })
        .onEnd(e => {
          'worklet'
          if (
            e.translationY > SHEET_DISMISS_OFFSET ||
            e.velocityY > SHEET_DISMISS_VELOCITY
          ) {
            dismissing.set(true)
            runOnJS(onDismiss)()
          }
        })
        .onFinalize(() => {
          'worklet'
          // Runs on both end and cancellation, so an interrupted drag always
          // settles back home.
          if (!dismissing.get()) {
            translateY.set(withTiming(0, {duration: 200}))
          }
        }),
    [translateY, dismissing, onDismiss],
  )
}

export function SheetDragDetector({
  gesture,
  children,
}: {
  gesture: ReturnType<typeof useSheetDragGesture>
  children: ReactNode
}) {
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>
}
