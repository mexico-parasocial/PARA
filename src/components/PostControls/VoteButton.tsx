import {memo} from 'react'
import {Platform, type StyleProp, View, type ViewStyle} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {CountWheel} from '#/lib/custom-animations/CountWheel'
import {useHaptics} from '#/lib/haptics'
import {atoms as a, useTheme} from '#/alf'
import {
  Upvote_Filled_Corner0_Rounded as UpArrowFilled,
  Upvote_Stroke2_Corner0_Rounded as UpArrow,
} from '#/components/icons/ArrowTriangle'
import {PostControlButton, PostControlButtonIcon} from './PostControlButton'

type VoteState = 'upvote' | 'downvote' | 'none'

type Props = {
  score: number
  currentVote: VoteState
  big?: boolean
  hasBeenToggled: boolean
  onUpvote: () => void
  onDownvote: () => void
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}

export const RedditVoteButton = memo(function RedditVoteButton({
  score,
  currentVote,
  big,
  hasBeenToggled,
  onUpvote,
  onDownvote,
  style,
  disabled,
}: Props) {
  const {_} = useLingui()
  const playHaptic = useHaptics()
  const t = useTheme()

  const handleUpvote = () => {
    playHaptic('Light')
    onUpvote()
  }

  const handleDownvote = () => {
    playHaptic('Light')
    onDownvote()
  }

  const isUpvoted = currentVote === 'upvote'
  const isDownvoted = currentVote === 'downvote'

  return (
    <View style={[a.flex_row, a.align_center, style, {marginLeft: -7}]}>
      {/* Upvote button */}
      <PostControlButton
        testID="upvoteBtn"
        disabled={disabled}
        big={big}
        onPress={handleUpvote}
        active={isUpvoted}
        activeColor={isUpvoted ? '#5B2FA1' : undefined}
        label={_(
          msg({
            message: `Upvote (${plural(score, {
              one: '# upvote',
              other: '# upvotes',
            })})`,
            comment:
              'Accessibility label for the upvote button, verb form followed by number of upvotes and noun form',
          }),
        )}>
        <PostControlButtonIcon
          icon={isUpvoted ? UpArrowFilled : UpArrow}
          style={[
            hasBeenToggled &&
              isUpvoted && {
                transform: [{translateY: -1.6}],
              },
          ]}
        />
      </PostControlButton>

      {/* CountWheel for animated score */}
      <View
        style={{
          marginLeft: Platform.OS === 'web' ? 4 : -1,
          marginRight: Platform.OS === 'web' ? 3 : -1,
          width:
            Platform.OS === 'web'
              ? 28
              : String(score).length > 2
                ? undefined
                : 20,
          minWidth: Platform.OS === 'web' ? undefined : 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <CountWheel
          likeCount={score}
          big={big}
          isLiked={isUpvoted || isDownvoted}
          hasBeenToggled={hasBeenToggled}
          direction={isDownvoted ? 'down' : 'up'}
          voteColor={
            isUpvoted
              ? '#5B2FA1'
              : isDownvoted
                ? t.palette.negative_400
                : undefined
          }
        />
      </View>

      {/* Downvote button */}
      <PostControlButton
        testID="downvoteBtn"
        disabled={disabled}
        big={big}
        onPress={handleDownvote}
        active={isDownvoted}
        activeColor={isDownvoted ? t.palette.negative_400 : undefined}
        label={_(
          msg({
            message: `Downvote (${plural(Math.abs(score), {
              one: '# downvote',
              other: '# downvotes',
            })})`,
            comment:
              'Accessibility label for the downvote button, verb form followed by number of downvotes and noun form',
          }),
        )}>
        {/* Rotate a wrapper, not the icon: react-native-svg applies style
            transforms around the SVG origin, which spins the arrow out of
            view on native. */}
        <View style={{transform: [{rotate: '180deg'}]}}>
          <PostControlButtonIcon
            icon={isDownvoted ? UpArrowFilled : UpArrow}
            style={[
              hasBeenToggled &&
                isDownvoted && {
                  transform: [{translateY: -1.6}],
                },
            ]}
          />
        </View>
      </PostControlButton>
    </View>
  )
})
