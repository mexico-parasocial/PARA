import {memo, type ReactNode} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type OpenQuestion as OpenQuestionData} from '#/lib/mock-data'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {
  LINEAR_AVI_WIDTH,
  OUTER_SPACE,
  REPLY_LINE_WIDTH,
} from '#/screens/PostThread/const'
import {atoms as a, useTheme} from '#/alf'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import * as Skele from '#/components/Skeleton'
import {SubtleHover} from '#/components/SubtleHover'
import {Text} from '#/components/Typography'

// ─── Data Types ──────────────────────────────────────────────────────────────

export interface OpenQuestionReplyData {
  id: string
  text: string
  author: {
    handle: string
    displayName?: string
    avatar: string
  }
  votes: number
  viewerVote?: -1 | 0 | 1
  timestamp?: string
  replies?: OpenQuestionReplyData[]
}

// Flat list item types for virtualized rendering
export type OQThreadItem =
  | {type: 'anchor'; question: OpenQuestionData}
  | {
      type: 'reply'
      reply: OpenQuestionReplyData
      depth: number
      showParentLine: boolean
      showChildLine: boolean
      isFirst: boolean
    }
  | {type: 'skeleton-anchor'}
  | {type: 'skeleton-reply'; index: number}

/**
 * Flatten the nested reply tree into a flat list for the virtualized List,
 * computing thread-line visibility at each level.
 */
export function flattenReplies(
  replies: OpenQuestionReplyData[],
  depth = 1,
): Extract<OQThreadItem, {type: 'reply'}>[] {
  const result: Extract<OQThreadItem, {type: 'reply'}>[] = []

  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i]
    const hasChildren = Boolean(reply.replies?.length)

    result.push({
      type: 'reply',
      reply,
      depth,
      showParentLine: depth > 1,
      showChildLine: hasChildren,
      isFirst: depth === 1 && i === 0,
    })

    if (reply.replies?.length) {
      result.push(...flattenReplies(reply.replies, depth + 1))
    }
  }

  return result
}

// ─── Anchor (root question) ───────────────────────────────────────────────────

export const OpenQuestionAnchor = memo(function OpenQuestionAnchor({
  question,
}: {
  question: OpenQuestionData
}) {
  const t = useTheme()

  return (
    <View
      testID={`openQuestionAnchor-${question.id}`}
      style={[
        {
          paddingHorizontal: OUTER_SPACE,
        },
        a.pt_lg,
      ]}>
      {/* Author row — mirrors ThreadItemAnchorInner */}
      <View style={[a.flex_row, a.gap_md, a.pb_md]}>
        <View collapsable={false}>
          <UserAvatar
            size={LINEAR_AVI_WIDTH}
            type="user"
            avatar={question.author.avatar || undefined}
          />
        </View>

        <View style={[a.flex_1, a.justify_center]}>
          <View style={[a.flex_row, a.align_center, a.gap_xs, a.flex_wrap]}>
            <Text
              style={[a.text_lg, a.font_semi_bold, a.leading_snug]}
              numberOfLines={1}>
              {question.author.handle}
            </Text>
          </View>
          <Text
            style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            @{question.author.handle}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={[a.pb_sm]}>
        {/* "Open Question" flair — below content like ThreadItemAnchor PostFlairStrip */}
        <View
          style={[
            a.self_start,
            a.rounded_xs,
            a.px_sm,
            a.py_2xs,
            a.mb_sm,
            {backgroundColor: t.palette.primary_500 + '22'},
          ]}>
          <Text
            style={[
              a.text_xs,
              a.font_bold,
              a.leading_tight,
              {color: t.palette.primary_500},
            ]}>
            <Trans>Open Question</Trans>
          </Text>
        </View>

        {/* Question text — large, matching ThreadItemAnchor richText style */}
        <Text style={[a.flex_1, a.text_xl, a.leading_snug, a.pb_md]}>
          {question.text}
        </Text>

        {/* Timestamp + stats row — mirrors ExpandedPostDetails */}
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.gap_sm,
            a.pt_xs,
            a.pb_xs,
            a.mb_xs,
          ]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {question.timestamp}
          </Text>
        </View>

        {/* Stats row — mirrors ThreadItemAnchor engagement metrics */}
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.gap_lg,
            a.border_t,
            a.border_b,
            a.py_md,
            t.atoms.border_contrast_low,
          ]}>
          <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
            <Text style={[a.text_md, a.font_semi_bold, t.atoms.text]}>
              {question.replyCount}
            </Text>{' '}
            <Trans>replies</Trans>
          </Text>
        </View>

        {/* Controls — mirrors ThreadItemAnchor PostControls area */}
        <View style={[a.pt_sm, a.pb_2xs, {marginLeft: -5}]}>
          <RedditVoteButton
            score={question.replyCount * 2}
            currentVote="none"
            hasBeenToggled={false}
            onUpvote={() => {}}
            onDownvote={() => {}}
          />
        </View>
      </View>
    </View>
  )
})

// ─── Reply (linear, depth=1) ──────────────────────────────────────────────────

export const OpenQuestionReply = memo(function OpenQuestionReply({
  reply,
  depth,
  showParentLine: _showParentLine,
  showChildLine,
  isFirst,
  onVote,
  onReply,
}: {
  reply: OpenQuestionReplyData
  depth: number
  showParentLine: boolean
  showChildLine: boolean
  isFirst?: boolean
  onVote?: (reply: OpenQuestionReplyData, value: -1 | 0 | 1) => void
  onReply?: (reply: OpenQuestionReplyData) => void
}) {
  const t = useTheme()
  if (depth > 1) {
    return (
      <OpenQuestionNestedReply
        reply={reply}
        depth={depth}
        showChildLine={showChildLine}
        onVote={onVote}
        onReply={onReply}
      />
    )
  }

  return (
    <SubtleHoverWrapper>
      <View
        style={[
          isFirst && [a.border_t, t.atoms.border_contrast_low],
          !showChildLine && {paddingBottom: OUTER_SPACE / 2},
          {paddingHorizontal: OUTER_SPACE},
        ]}>
        {/* Parent reply line spacer — mirrors ThreadItemPostParentReplyLine */}
        <View style={[a.flex_row, {height: 12}]}>
          <View style={{width: LINEAR_AVI_WIDTH}} />
        </View>

        <View style={[a.flex_row, a.gap_md]}>
          {/* Avatar + child thread line */}
          <View>
            <UserAvatar
              size={LINEAR_AVI_WIDTH}
              type="user"
              avatar={reply.author.avatar || undefined}
            />
            {showChildLine && (
              <View
                style={[
                  a.mx_auto,
                  a.mt_xs,
                  a.flex_1,
                  {
                    width: REPLY_LINE_WIDTH,
                    backgroundColor: t.atoms.border_contrast_low.borderColor,
                  },
                ]}
              />
            )}
          </View>

          {/* Content — mirrors ThreadItemPostInner layout */}
          <View style={[a.flex_1]}>
            {/* Meta row */}
            <View style={[a.flex_row, a.align_center, a.pb_xs, a.gap_xs]}>
              <Text style={[a.text_md, a.font_semi_bold, a.leading_snug]}>
                {reply.author.displayName || reply.author.handle}
              </Text>
              <Text
                style={[
                  a.text_md,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                @{reply.author.handle}
              </Text>
              {reply.timestamp ? (
                <>
                  <Text
                    style={[
                      a.text_md,
                      a.leading_snug,
                      t.atoms.text_contrast_medium,
                    ]}>
                    ·
                  </Text>
                  <Text
                    style={[
                      a.text_md,
                      a.leading_snug,
                      t.atoms.text_contrast_medium,
                    ]}>
                    {reply.timestamp}
                  </Text>
                </>
              ) : null}
            </View>

            {/* Reply text */}
            <Text style={[a.flex_1, a.text_md, a.leading_snug, a.pb_xs]}>
              {reply.text}
            </Text>

            {/* Controls — mirrors PostControls row */}
            <View style={[a.flex_row, a.align_center, a.gap_md, a.pb_sm]}>
              <RedditVoteButton
                score={reply.votes}
                currentVote={toVoteState(reply.viewerVote)}
                hasBeenToggled={false}
                onUpvote={() => onVote?.(reply, reply.viewerVote === 1 ? 0 : 1)}
                onDownvote={() =>
                  onVote?.(reply, reply.viewerVote === -1 ? 0 : -1)
                }
              />
              <ReplyButton onPress={() => onReply?.(reply)} />
            </View>
          </View>
        </View>
      </View>
    </SubtleHoverWrapper>
  )
})

// ─── Nested Reply (depth > 1, tree view) ─────────────────────────────────────

const OpenQuestionNestedReply = memo(function OpenQuestionNestedReply({
  reply,
  depth,
  showChildLine,
  onVote,
  onReply,
}: {
  reply: OpenQuestionReplyData
  depth: number
  showChildLine: boolean
  onVote?: (reply: OpenQuestionReplyData, value: -1 | 0 | 1) => void
  onReply?: (reply: OpenQuestionReplyData) => void
}) {
  const t = useTheme()

  return (
    <SubtleHoverWrapper>
      <View
        style={[
          a.flex_row,
          depth === 1 && [a.border_t, t.atoms.border_contrast_low],
        ]}>
        {/* Indent lines — mirrors ThreadItemTreePost indent lines */}
        {Array.from(Array(Math.max(0, depth - 1))).map((_, n) => (
          <View
            key={`${reply.id}-indent-${n}`}
            style={[
              t.atoms.border_contrast_low,
              {
                borderRightWidth: REPLY_LINE_WIDTH,
                width: OUTER_SPACE + LINEAR_AVI_WIDTH / 2,
                left: 1,
              },
            ]}
          />
        ))}

        {/* Content area — mirrors ThreadItemTreePostInnerWrapper */}
        <View
          style={[
            a.flex_1,
            {
              paddingHorizontal: OUTER_SPACE,
              paddingTop: OUTER_SPACE / 2,
            },
            depth === 1 && {paddingTop: OUTER_SPACE / 1.5},
          ]}>
          {/* Corner line for nested replies */}
          {depth > 1 && (
            <View
              style={[
                a.absolute,
                t.atoms.border_contrast_low,
                {
                  left: -1,
                  top: 0,
                  height:
                    LINEAR_AVI_WIDTH / 2 +
                    REPLY_LINE_WIDTH / 2 +
                    OUTER_SPACE / 2,
                  width: OUTER_SPACE,
                  borderLeftWidth: REPLY_LINE_WIDTH,
                  borderBottomWidth: REPLY_LINE_WIDTH,
                  borderBottomLeftRadius: a.rounded_sm.borderRadius,
                },
              ]}
            />
          )}

          <View style={[a.flex_1]}>
            {/* Avatar + author row */}
            <View style={[a.flex_row, a.align_center, a.gap_xs, a.pb_xs]}>
              <UserAvatar
                size={24}
                type="user"
                avatar={reply.author.avatar || undefined}
              />
              <Text style={[a.text_md, a.font_semi_bold]}>
                {reply.author.displayName || reply.author.handle}
              </Text>
              <Text
                style={[
                  a.text_sm,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                @{reply.author.handle}
              </Text>
            </View>

            {/* Content with child reply line */}
            <View style={[a.flex_row]}>
              <View style={[a.relative, a.pt_2xs, {width: 24 + a.gap_xs.gap}]}>
                {showChildLine && (
                  <View
                    style={[
                      a.flex_1,
                      t.atoms.border_contrast_low,
                      {
                        borderRightWidth: REPLY_LINE_WIDTH,
                        width: '50%',
                        left: -1,
                      },
                    ]}
                  />
                )}
              </View>

              <View style={[a.flex_1, a.pl_2xs]}>
                <Text style={[a.flex_1, a.text_md, a.leading_snug, a.pb_xs]}>
                  {reply.text}
                </Text>

                <View style={[a.flex_row, a.align_center, a.gap_md, a.pb_sm]}>
                  <RedditVoteButton
                    score={reply.votes}
                    currentVote={toVoteState(reply.viewerVote)}
                    hasBeenToggled={false}
                    onUpvote={() =>
                      onVote?.(reply, reply.viewerVote === 1 ? 0 : 1)
                    }
                    onDownvote={() =>
                      onVote?.(reply, reply.viewerVote === -1 ? 0 : -1)
                    }
                  />
                  <ReplyButton onPress={() => onReply?.(reply)} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SubtleHoverWrapper>
  )
})

// ─── Skeleton States ──────────────────────────────────────────────────────────

export function OpenQuestionAnchorSkeleton() {
  return (
    <View style={[a.p_lg, a.gap_md]}>
      <Skele.Row style={[a.align_center, a.gap_md]}>
        <Skele.Circle size={LINEAR_AVI_WIDTH} />
        <Skele.Col>
          <Skele.Text style={[a.text_lg, {width: '25%'}]} />
          <Skele.Text blend style={[a.text_md, {width: '40%'}]} />
        </Skele.Col>
      </Skele.Row>

      <View>
        <Skele.Text style={[a.text_xl, {width: '100%'}]} />
        <Skele.Text style={[a.text_xl, {width: '80%'}]} />
        <Skele.Text style={[a.text_xl, {width: '50%'}]} />
      </View>

      <Skele.Text style={[a.text_sm, {width: '30%'}]} />
    </View>
  )
}

export function OpenQuestionReplySkeleton({index}: {index: number}) {
  const even = index % 2 === 0
  return (
    <View
      style={[
        {paddingHorizontal: OUTER_SPACE, paddingVertical: OUTER_SPACE / 1.5},
        a.gap_md,
      ]}>
      <Skele.Row style={[a.align_start, a.gap_md]}>
        <Skele.Circle size={LINEAR_AVI_WIDTH} />
        <Skele.Col style={[a.gap_xs]}>
          <Skele.Row style={[a.gap_sm]}>
            <Skele.Text style={[a.text_md, {width: '20%'}]} />
            <Skele.Text blend style={[a.text_md, {width: '30%'}]} />
          </Skele.Row>
          <Skele.Col>
            {even ? (
              <>
                <Skele.Text blend style={[a.text_md, {width: '100%'}]} />
                <Skele.Text blend style={[a.text_md, {width: '60%'}]} />
              </>
            ) : (
              <Skele.Text blend style={[a.text_md, {width: '70%'}]} />
            )}
          </Skele.Col>
        </Skele.Col>
      </Skele.Row>
    </View>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ReplyButton({onPress}: {onPress?: () => void}) {
  const {_} = useLingui()
  const t = useTheme()
  const {
    state: hovered,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={_(msg`Reply`)}
      accessibilityHint={_(msg`Reply to this answer`)}
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
      onPress={onPress}
      style={[
        a.px_xs,
        a.py_2xs,
        a.rounded_xs,
        hovered && {backgroundColor: t.atoms.bg_contrast_25.backgroundColor},
      ]}>
      <Text style={[t.atoms.text_contrast_medium, a.text_sm, a.font_semi_bold]}>
        <Trans>Reply</Trans>
      </Text>
    </Pressable>
  )
}

function toVoteState(value?: -1 | 0 | 1) {
  if (value === 1) return 'upvote'
  if (value === -1) return 'downvote'
  return 'none'
}

function SubtleHoverWrapper({children}: {children: ReactNode}) {
  const {
    state: hover,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()
  return (
    <View
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
      style={a.pointer}>
      <SubtleHover hover={hover} />
      {children}
    </View>
  )
}
