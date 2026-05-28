import {type ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'

import {useTheme} from '#/alf'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDown,
  ChevronLeft_Stroke2_Corner0_Rounded as ChevronLeft,
  ChevronRight_Stroke2_Corner0_Rounded as ChevronRight,
  ChevronTop_Stroke2_Corner0_Rounded as ChevronUp,
} from '#/components/icons/Chevron'
import {IS_WEB} from '#/env'

interface WebScrollControlsProps {
  scrollViewRef: React.RefObject<ScrollView | null>
  direction?: 'horizontal' | 'vertical'
  scrollAmount?: number
  iconSize?: number
  style?: StyleProp<ViewStyle>
}

export function WebScrollControls({
  scrollViewRef,
  direction = 'horizontal',
  scrollAmount = 300,
  iconSize = 20,
  style,
}: WebScrollControlsProps) {
  const t = useTheme()

  if (!IS_WEB) return null

  const handleScroll = (dir: 'back' | 'forward') => {
    if (scrollViewRef.current) {
      // @ts-ignore - ScrollView on web has scrollLeft/scrollTop but we use scrollTo for RN compat
      // We can't easily get current position without tracking it or using native methods.
      // For simplicity in this "stateless" control, we can try relative scrolling if supported
      // OR we just assume we want to scroll by +/- amount from *current visual position*.
      // BUT, standard scrollTo requires X/Y.
      // A workaround is to attach this logic to the parent or use a hacky partial scroll.
      // HOWEVER, for a simple implementation without refactoring the parent to track state,
      // we can use the `scrollBy` method if available (it is on web DOM nodes, but this is RNWeb).

      // RNWeb `scrollTo` takes {x, y, animated}.
      // We don't know 'x' without state.

      // Solution: Access the DOM node directly for web-specific logic
      // @ts-ignore
      const node = scrollViewRef.current?.getScrollableNode()
      if (node) {
        if (direction === 'horizontal') {
          node.scrollBy({
            left: dir === 'forward' ? scrollAmount : -scrollAmount,
            behavior: 'smooth',
          })
        } else {
          node.scrollBy({
            top: dir === 'forward' ? scrollAmount : -scrollAmount,
            behavior: 'smooth',
          })
        }
      }
    }
  }

  if (direction === 'horizontal') {
    return (
      <View
        style={[styles.containerHorizontal, style]}
        pointerEvents="box-none">
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.arrowButton,
            t.atoms.bg,
            t.atoms.border_contrast_low,
            t.atoms.shadow_sm,
          ]}
          onPress={() => handleScroll('back')}>
          <ChevronLeft
            width={iconSize}
            height={iconSize}
            style={t.atoms.text}
          />
        </TouchableOpacity>
        <View style={{flex: 1}} pointerEvents="none" />
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.arrowButton,
            t.atoms.bg,
            t.atoms.border_contrast_low,
            t.atoms.shadow_sm,
          ]}
          onPress={() => handleScroll('forward')}>
          <ChevronRight
            width={iconSize}
            height={iconSize}
            style={t.atoms.text}
          />
        </TouchableOpacity>
      </View>
    )
  }

  // Vertical (for ScrollWheel)
  return (
    <View style={[styles.containerVertical, style]} pointerEvents="box-none">
      <TouchableOpacity
        accessibilityRole="button"
        style={[
          styles.arrowButtonVertical,
          t.atoms.bg,
          t.atoms.border_contrast_low,
          {marginBottom: 8},
        ]}
        onPress={() => handleScroll('back')} // Up (negative scroll)
      >
        <ChevronUp width={iconSize} height={iconSize} style={t.atoms.text} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        style={[
          styles.arrowButtonVertical,
          t.atoms.bg,
          t.atoms.border_contrast_low,
          {marginTop: 8},
        ]}
        onPress={() => handleScroll('forward')} // Down (positive scroll)
      >
        <ChevronDown width={iconSize} height={iconSize} style={t.atoms.text} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  containerHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0, // Arrows sit on the edge
    zIndex: 10,
  },
  containerVertical: {
    position: 'absolute',
    right: -40, // Position to the right of the wheel
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    opacity: 0.9,
    marginHorizontal: 0,
  },
  arrowButtonVertical: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    opacity: 0.9,
  },
})
