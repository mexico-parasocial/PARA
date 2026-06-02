import {useCallback, useEffect, useMemo, useState} from 'react'
import {Platform, Pressable, StyleSheet, View} from 'react-native'
import {Gesture, GestureDetector} from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import {useHaptics} from '#/lib/haptics'
import {useTheme} from '#/alf'
import {
  ArrowBottom_Stroke2_Corner0_Rounded as ArrowDown,
  ArrowTop_Stroke2_Corner0_Rounded as ArrowUp,
} from '#/components/icons/Arrow'

interface VotingButtonProps {
  initialVote?: number
  onVoteChange?: (vote: number) => void
}

type WebEventBoundary = {
  stopPropagation?: () => void
}

// Semantic colors — keep in sync with VotingButtonHorizontal
const AGREE = '#22C55E'
const DISAGREE = '#EF4444'

export function VotingButton({
  initialVote = 0,
  onVoteChange,
}: VotingButtonProps) {
  const t = useTheme()
  const haptics = useHaptics()
  const [currentVote, setCurrentVote] = useState(initialVote)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const isActive = useSharedValue(false)
  const liveVote = useSharedValue(initialVote)

  // Base scales for the arrows (shared values for smooth spring animation)
  const upBaseScale = useSharedValue(initialVote > 0 ? 1.2 : 1)
  const downBaseScale = useSharedValue(initialVote < 0 ? 1.2 : 1)

  // Flash animations for clicks
  const upFlash = useSharedValue(0)
  const downFlash = useSharedValue(0)

  // Update base scales when currentVote changes — preserves original spring behavior
  useEffect(() => {
    upBaseScale.value = withSpring(currentVote > initialVote ? 1.2 : 1)
    downBaseScale.value = withSpring(currentVote < initialVote ? 1.2 : 1)
  }, [currentVote, initialVote, upBaseScale, downBaseScale])

  const triggerHaptic = useCallback(
    (vote: number) => {
      if (vote !== 0) {
        haptics('Light')
      }
    },
    [haptics],
  )

  const pan = Gesture.Pan()
    .onBegin(() => {
      isActive.value = true
      scale.value = withSpring(1.1)
    })
    .onUpdate(event => {
      const clampedTranslation = Math.max(
        -40,
        Math.min(40, event.translationY),
      )
      translateY.value = clampedTranslation

      const dragDistance = -clampedTranslation
      const step = 12
      let delta = 0
      if (Math.abs(dragDistance) > step / 2) {
        delta = Math.round(dragDistance / step)
      }
      delta = Math.max(-1, Math.min(1, delta))

      const newVote = Math.max(-3, Math.min(3, initialVote + delta))
      if (newVote !== liveVote.value) {
        liveVote.value = newVote
        runOnJS(setCurrentVote)(newVote)
      }
    })
    .onFinalize(() => {
      isActive.value = false
      translateY.value = withSpring(0)
      scale.value = withSpring(1)
      const finalVote = liveVote.value
      if (onVoteChange) {
        runOnJS(onVoteChange)(finalVote)
      }
      runOnJS(triggerHaptic)(finalVote)
    })

  const onVoteUp = () => {
    const newVote = Math.min(3, currentVote + 1)
    upFlash.value = withSequence(
      withTiming(1, {duration: 100}),
      withTiming(0, {duration: 200}),
    )
    if (newVote !== currentVote) {
      setCurrentVote(newVote)
      liveVote.value = newVote
      onVoteChange?.(newVote)
      triggerHaptic(newVote)
    }
  }

  const onVoteDown = () => {
    const newVote = Math.max(-3, currentVote - 1)
    downFlash.value = withSequence(
      withTiming(1, {duration: 100}),
      withTiming(0, {duration: 200}),
    )
    if (newVote !== currentVote) {
      setCurrentVote(newVote)
      liveVote.value = newVote
      onVoteChange?.(newVote)
      triggerHaptic(newVote)
    }
  }

  const animatedStyle = useAnimatedStyle(() => {
    const base: {
      transform: {translateY: number}[] | {scale: number}[] | any
      cursor?: 'grabbing' | 'grab'
    } = {
      transform: [{translateY: translateY.value}, {scale: scale.value}],
    }
    if (Platform.OS === 'web') {
      base.cursor = isActive.value ? 'grabbing' : 'grab'
    }
    return base
  })

  const voteTextStyle = useAnimatedStyle(() => {
    const color =
      liveVote.value > 0
        ? AGREE
        : liveVote.value < 0
          ? DISAGREE
          : t.atoms.text.color
    return {
      color: withTiming(color),
      fontWeight: 'bold',
      fontSize: 16,
    }
  })

  const upFlashOpacity = useAnimatedStyle(() => {
    return {
      opacity: upFlash.value,
    }
  })

  const downFlashOpacity = useAnimatedStyle(() => {
    return {
      opacity: downFlash.value,
    }
  })

  const upScale = useDerivedValue(() => {
    return upBaseScale.value + upFlash.value * 0.4
  })

  const downScale = useDerivedValue(() => {
    return downBaseScale.value + downFlash.value * 0.4
  })

  const upArrowStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(liveVote.value > initialVote ? 1 : 0.3),
      transform: [{scale: upScale.value}],
    }
  })

  const downArrowStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(liveVote.value < initialVote ? 1 : 0.3),
      transform: [{scale: downScale.value}],
    }
  })

  const webEventBlockers = useMemo(() => {
    if (Platform.OS !== 'web') return {}
    const stopPropagation = (event: WebEventBoundary) => {
      event.stopPropagation?.()
    }
    return {
      onClickCapture: stopPropagation,
      onMouseDown: stopPropagation,
      onMouseUp: stopPropagation,
      onPointerDown: stopPropagation,
      onPointerUp: stopPropagation,
      onStartShouldSetResponder: () => true,
      onResponderTerminationRequest: () => false,
    }
  }, [])

  return (
    <Pressable
      style={styles.container}
      {...webEventBlockers}
      onPress={e => e.stopPropagation()}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.control,
            animatedStyle,
            {
              backgroundColor: t.palette.contrast_25 + '30',
              borderColor: t.palette.contrast_50 + '40',
            },
            Platform.OS === 'web' && {
              userSelect: 'none',
              touchAction: 'none',
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            onPress={onVoteUp}
            hitSlop={8}
            style={({pressed}) => ({opacity: pressed ? 0.7 : 1})}>
            <View style={styles.arrowContainer}>
              <Animated.View style={upArrowStyle}>
                <ArrowUp
                  size="sm"
                  style={{
                    color:
                      currentVote > initialVote ? AGREE : t.atoms.text.color,
                  }}
                />
              </Animated.View>
              <Animated.View
                style={[styles.flashOverlay, upFlashOpacity]}
                pointerEvents="none">
                <ArrowUp size="sm" style={{color: '#FFFFFF'}} />
              </Animated.View>
            </View>
          </Pressable>

          <View style={styles.textWrapper}>
            <Animated.Text style={[styles.voteText, voteTextStyle]}>
              {currentVote > 0 ? `+${currentVote}` : `${currentVote}`}
            </Animated.Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onVoteDown}
            hitSlop={8}
            style={({pressed}) => ({opacity: pressed ? 0.7 : 1})}>
            <View style={styles.arrowContainer}>
              <Animated.View style={downArrowStyle}>
                <ArrowDown
                  size="sm"
                  style={{
                    color:
                      currentVote < initialVote
                        ? DISAGREE
                        : t.atoms.text.color,
                  }}
                />
              </Animated.View>
              <Animated.View
                style={[styles.flashOverlay, downFlashOpacity]}
                pointerEvents="none">
                <ArrowDown size="sm" style={{color: '#FFFFFF'}} />
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    marginTop: 4,
  },
  control: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  textWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteText: {
    fontSize: 16,
    textAlign: 'center',
    minWidth: 24,
  },
  arrowContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
