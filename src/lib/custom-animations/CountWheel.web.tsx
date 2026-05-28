import {useEffect, useRef, useState} from 'react'
import {View} from 'react-native'
import {useReducedMotion} from 'react-native-reanimated'

import {decideShouldRoll} from '#/lib/custom-animations/util'
import {s} from '#/lib/styles'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {useFormatPostStatCount} from '#/components/PostControls/util'

const animationConfig = {
  duration: 400,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  fill: 'forwards' as FillMode,
}

const enteringUpKeyframe = [
  {opacity: 0, transform: 'translateY(18px)'},
  {opacity: 1, transform: 'translateY(0)'},
]

const enteringDownKeyframe = [
  {opacity: 0, transform: 'translateY(-18px)'},
  {opacity: 1, transform: 'translateY(0)'},
]

const exitingUpKeyframe = [
  {opacity: 1, transform: 'translateY(0)'},
  {opacity: 0, transform: 'translateY(-18px)'},
]

const exitingDownKeyframe = [
  {opacity: 1, transform: 'translateY(0)'},
  {opacity: 0, transform: 'translateY(18px)'},
]

export function CountWheel({
  likeCount,
  big,
  isLiked,
  hasBeenToggled,
  direction = 'up',
  voteColor,
}: {
  likeCount: number
  big?: boolean
  isLiked: boolean
  hasBeenToggled: boolean
  direction?: 'up' | 'down'
  voteColor?: string
}) {
  const t = useTheme()
  const shouldAnimate = !useReducedMotion() && hasBeenToggled
  const shouldRoll = decideShouldRoll(isLiked, likeCount)

  const countView = useRef<HTMLDivElement>(null)
  const prevCountView = useRef<HTMLDivElement>(null)
  const [prevCount, setPrevCount] = useState(likeCount)
  const prevIsLiked = useRef(isLiked)
  const prevDirection = useRef(direction)
  const formatPostStatCount = useFormatPostStatCount()
  const formattedCount = formatPostStatCount(likeCount)
  const formattedPrevCount = formatPostStatCount(prevCount)

  useEffect(() => {
    // Trigger animation on either vote state change or direction change
    if (
      isLiked === prevIsLiked.current &&
      direction === prevDirection.current
    ) {
      return
    }

    const newPrevCount = isLiked ? likeCount - 1 : likeCount + 1

    if (shouldAnimate && shouldRoll) {
      // When direction is 'down', reverse the animation
      // Downvote: numbers come from top and exit to bottom (falling)
      // Upvote: numbers come from bottom and exit to top (rising)
      countView.current?.animate?.(
        direction === 'down' ? enteringDownKeyframe : enteringUpKeyframe,
        animationConfig,
      )
      prevCountView.current?.animate?.(
        direction === 'down' ? exitingDownKeyframe : exitingUpKeyframe,
        animationConfig,
      )
      setPrevCount(newPrevCount)
    }

    prevIsLiked.current = isLiked
    prevDirection.current = direction
  }, [isLiked, likeCount, shouldAnimate, shouldRoll, direction])

  if (likeCount < 1) {
    return null
  }

  return (
    <View>
      <View
        // @ts-expect-error is div
        ref={countView}>
        <Text
          testID="likeCount"
          style={[
            big ? a.text_md : a.text_sm,
            a.user_select_none,
            voteColor // Add this check first
              ? [a.font_semi_bold, {color: voteColor}]
              : direction === 'down'
                ? [a.font_semi_bold, s.likeColor]
                : {color: t.palette.contrast_500},
          ]}>
          {formattedCount}
        </Text>
      </View>
      {shouldAnimate && (likeCount > 1 || !isLiked) ? (
        <View
          style={{position: 'absolute', opacity: 0}}
          aria-disabled={true}
          // @ts-expect-error is div
          ref={prevCountView}>
          <Text
            style={[
              big ? a.text_md : a.text_sm,
              a.user_select_none,
              voteColor // Add this check first
                ? [a.font_semi_bold, {color: voteColor}]
                : direction === 'down'
                  ? [a.font_semi_bold, s.likeColor]
                  : {color: t.palette.contrast_500},
            ]}>
            {formattedPrevCount}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
