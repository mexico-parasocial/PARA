import {type ReactNode} from 'react'
import {type SharedValue} from 'react-native-reanimated'

type SheetDragOptions = {
  translateY: SharedValue<number>
  dismissing: SharedValue<boolean>
  onDismiss: () => void
}

// react-native-gesture-handler is disabled in the web build. Web sheets are
// dismissed with their close button instead of a swipe.
export function useSheetDragGesture(_options: SheetDragOptions) {
  return null
}

export function SheetDragDetector({
  children,
}: {
  gesture: ReturnType<typeof useSheetDragGesture>
  children: ReactNode
}) {
  return <>{children}</>
}
