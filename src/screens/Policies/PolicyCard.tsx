import {Pressable, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {splitPolicyText} from '#/lib/policy-display'
import {getPostBadges} from '#/lib/post-flairs'
import {useCommunityBoardQuery} from '#/state/queries/community-boards'
import {usePolicyTallyQuery} from '#/state/queries/policy-tally'
import {atoms as a, useTheme} from '#/alf'
import {PolicyBallotControl} from '#/components/civic/PolicyBallotControl'
import {PolicyConsensusMeter} from '#/components/civic/PolicyConsensus'
import {Text} from '#/components/Typography'
import {type app} from '#/lexicons'

const DEFAULT_ACCENT = '#2563EB'

export type PolicyRecord = {
  text?: string
  createdAt?: string
  flairs?: string[]
  tags?: string[]
  postType?: string
}

export function getPolicyPostParts(post: app.bsky.feed.defs.PostView) {
  const record = post.record as PolicyRecord
  const {title, body} = splitPolicyText(record.text ?? '')
  const badges = getPostBadges({
    flairs: record.flairs,
    tags: record.tags,
    postType: record.postType,
  })
  return {record, title, body, badges}
}

export function formatPolicyDate(value: string | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {day: 'numeric', month: 'short'})
}

/**
 * A policy in the list: what it proposes, how the community stands, and the
 * -3..+3 vote itself. Only the top of the card opens the details, so voting
 * never navigates away.
 */
export function PolicyCard({
  post,
  onPress,
}: {
  post: app.bsky.feed.defs.PostView
  onPress: () => void
}) {
  const t = useTheme()
  const {record, title, body, badges} = getPolicyPostParts(post)
  const {data: tally, isLoading} = usePolicyTallyQuery(post.uri)
  const {data: board} = useCommunityBoardQuery({
    communityId: tally?.community || undefined,
  })
  const accent = badges[0]?.color ?? DEFAULT_ACCENT
  const author = post.author.displayName || `@${post.author.handle}`
  const meta = [board?.board.name, author, formatPolicyDate(record.createdAt)]
    .filter(Boolean)
    .join(' · ')

  return (
    <View
      style={[
        a.flex_row,
        a.rounded_md,
        a.border,
        a.overflow_hidden,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View style={{width: 4, backgroundColor: accent}} />
      <View style={[a.pl_md, a.pt_lg]}>
        <PolicyBallotControl
          policyUri={post.uri}
          variant="vertical"
          showNotice={false}
        />
      </View>
      <View style={[a.flex_1, a.p_lg, a.gap_md]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint="Abre los detalles de la policy"
          onPress={onPress}
          style={[a.gap_xs]}>
          <View style={[a.flex_row, a.align_center, a.gap_sm, a.flex_wrap]}>
            {badges.slice(0, 2).map(badge => (
              <View
                key={badge.key}
                style={[
                  a.rounded_xs,
                  {
                    backgroundColor: badge.bgColor,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  },
                ]}>
                <Text style={[a.text_xs, a.font_bold, {color: badge.color}]}>
                  {badge.label}
                </Text>
              </View>
            ))}
            {tally?.official ? (
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  {color: t.palette.primary_500},
                ]}>
                <Trans>OFICIAL</Trans>
              </Text>
            ) : null}
          </View>
          <Text style={[a.text_lg, a.font_bold, a.leading_snug, t.atoms.text]}>
            {title}
          </Text>
          {body ? (
            <Text
              numberOfLines={2}
              style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
              {body}
            </Text>
          ) : null}
          {meta ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {meta}
            </Text>
          ) : null}
        </Pressable>

        <PolicyConsensusMeter tally={tally} isLoading={isLoading} />
      </View>
    </View>
  )
}
