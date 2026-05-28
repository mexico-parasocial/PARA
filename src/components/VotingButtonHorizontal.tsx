import {useMemo, useState} from 'react'
import {Platform, Pressable, StyleSheet, View} from 'react-native'
import {Gesture, GestureDetector} from 'react-native-gesture-handler'
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'

interface VotingButtonHorizontalProps {
  initialVote?: number
  onVoteChange?: (vote: number) => void
}

type WebEventBoundary = {
  stopPropagation?: () => void
}

// Semantic colors
const DISAGREE = '#EF4444'
const AGREE = '#22C55E'

export function VotingButtonHorizontal({
  initialVote = 0,
  onVoteChange,
}: VotingButtonHorizontalProps) {
  const t = useTheme()
  const [currentVote, setCurrentVote] = useState(initialVote)
  const translationX = useSharedValue(0)
  const committedVote = useSharedValue(initialVote)
  const liveVote = useSharedValue(initialVote)
  const scale = useSharedValue(1)
  const isActive = useSharedValue(false)

  const pan = Gesture.Pan()
    .onBegin(() => {
      isActive.value = true
      scale.value = withSpring(1.04)
    })
    .onUpdate(event => {
      // Constraint clamp
      const clampedTranslation = Math.max(-80, Math.min(80, event.translationX))

      translationX.value = clampedTranslation

      // One-point additive logic
      const step = 35
      let delta = 0
      if (Math.abs(clampedTranslation) > step / 2) {
        delta = Math.round(clampedTranslation / step)
      }
      delta = Math.max(-1, Math.min(1, delta))

      const newVote = Math.max(-3, Math.min(3, initialVote + delta))
      liveVote.value = newVote

      if (newVote !== currentVote) {
        runOnJS(setCurrentVote)(newVote)
      }
    })
    .onFinalize(() => {
      isActive.value = false
      translationX.value = withSpring(0)
      scale.value = withSpring(1)
      committedVote.value = liveVote.value

      if (onVoteChange) {
        runOnJS(onVoteChange)(liveVote.value)
      }
    })

  const controlStyle = useAnimatedStyle(() => {
    const relativeImpact = currentVote - initialVote
    const bg = interpolateColor(
      relativeImpact,
      [-1, 0, 1],
      [DISAGREE + '28', t.palette.contrast_50, AGREE + '28'],
    )
    const border = interpolateColor(
      relativeImpact,
      [-1, 0, 1],
      [DISAGREE + '50', t.palette.contrast_100, AGREE + '50'],
    )
    return {
      transform: [{translateX: translationX.value}, {scale: scale.value}],
      backgroundColor: bg,
      borderColor: border,
    }
  })

  const trackStyle = useAnimatedStyle(() => {
    const relativeImpact = currentVote - initialVote
    const backgroundColor = interpolateColor(
      relativeImpact,
      [-1, 0, 1],
      [DISAGREE + '16', t.palette.contrast_25, AGREE + '16'],
    )
    return {backgroundColor}
  })

  const voteTextStyle = useAnimatedStyle(() => {
    const color =
      currentVote > 0
        ? AGREE
        : currentVote < 0
          ? DISAGREE
          : t.atoms.text_contrast_medium.color
    return {
      color: withTiming(color),
    }
  })

  const labelStyle = useAnimatedStyle(() => {
    const isNeutral = currentVote === 0
    return {
      opacity: withTiming(isNeutral ? 0.6 : 0),
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

  // Compute tick marks colors
  const tickColor = t.palette.contrast_100

  return (
    <Pressable
      style={styles.wrapper}
      {...webEventBlockers}
      onPress={e => {
        if (e && e.stopPropagation) {
          e.stopPropagation()
        }
      }}>
      {/* Track */}
      <Animated.View
        style={[
          styles.track,
          trackStyle,
          {borderColor: t.palette.contrast_100},
        ]}>
        {/* Tick marks on track (showing full -3 to 3 range again) */}
        <View style={styles.tickContainer}>
          {[-3, -2, -1, 0, 1, 2, 3].map(tick => (
            <View
              key={tick}
              style={[
                styles.tick,
                tick === 0 && styles.tickCenter,
                {
                  backgroundColor:
                    tick === 0 ? t.palette.contrast_200 : tickColor,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* Draggable thumb */}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.control,
            controlStyle,
            Platform.OS === 'web' && {
              cursor: isActive.value ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
            },
          ]}>
          <View style={styles.textWrapper}>
            <Animated.Text style={[styles.voteText, voteTextStyle]}>
              {currentVote > 0 ? `+${currentVote}` : `${currentVote}`}
            </Animated.Text>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Neutral hint (fades out when voted) */}
      <Animated.View
        style={[styles.neutralHint, labelStyle]}
        pointerEvents="none">
        <Text style={[styles.neutralLabel, t.atoms.text_contrast_low]}>
          NEUTRAL
        </Text>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: 260,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    width: '100%',
    height: 6,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tickContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: -6,
    bottom: -6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tick: {
    width: 1,
    height: 8,
    borderRadius: 1,
  },
  tickCenter: {
    height: 12,
    width: 2,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  textWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 28,
  },
  neutralHint: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  neutralLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
})
