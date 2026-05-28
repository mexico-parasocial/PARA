import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native'

import {
  COMMUNITY_AXES,
  OPEN_QUESTIONS,
  PROPOSED_QUESTIONS,
} from '#/lib/mock-data'
import {CommonNavigatorParams, type NavigationProp} from '#/lib/routes/types'
import {useVoteOnProposedQuestionMutation} from '#/state/mutations/raq'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {Text} from '#/components/Typography'
import {AddRAQDialog} from '../RAQ/components/AddRAQDialog'

export function CommunityRAQScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<RouteProp<CommonNavigatorParams, 'CommunityRAQ'>>()
  const {communityName = 'Community'} = route.params || {}

  const addDialogControl = Dialog.useDialogControl()
  const {mutate: voteOnProposal} = useVoteOnProposedQuestionMutation()

  // Use mock data — first 2 community axes as "official", all proposals, all open questions
  const officialAxes = COMMUNITY_AXES.slice(0, 2)
  const proposals = PROPOSED_QUESTIONS
  const openQuestions = OPEN_QUESTIONS

  const totalVotes = proposals.reduce(
    (sum, p) => sum + p.upvotes + p.downvotes,
    0,
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>{communityName} RAQ</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Button
          label={_(msg`Add`)}
          size="small"
          variant="solid"
          color="primary"
          onPress={() => addDialogControl.open()}>
          <ButtonText>
            <Trans>Add</Trans>
          </ButtonText>
        </Button>
      </Layout.Header.Outer>

      <Layout.Content
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        {/* OFFICIAL AXES */}
        <View style={[styles.card, t.atoms.bg_contrast_25]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            <Trans>Official Appends</Trans>
          </Text>
          <Text style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
            <Trans>Community alignment on official axes.</Trans>
          </Text>

          <View style={[a.mt_md, a.gap_sm]}>
            {officialAxes.map(axis => (
              <View
                key={axis.id}
                style={[
                  styles.axisRow,
                  a.p_md,
                  a.rounded_md,
                  t.atoms.bg,
                  a.border,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                  {axis.name}
                </Text>
                <Text style={[a.text_sm, a.font_bold, {color: axis.color}]}>
                  {axis.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* PROPOSED APPENDS */}
        <View style={[styles.card, t.atoms.bg_contrast_25]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            <Trans>Unofficial Appends (Proposals)</Trans>
          </Text>
          <Text style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Proposed appends for this community. Vote to make them official.
            </Trans>
          </Text>

          <View style={[a.mt_md, a.gap_xs]}>
            {proposals.map(item => (
              <View
                key={item.id}
                style={[
                  a.p_md,
                  a.rounded_md,
                  t.atoms.bg,
                  a.border,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                  {item.text}
                </Text>
                <View style={[a.flex_row, a.align_center, a.mt_sm]}>
                  <RedditVoteButton
                    score={item.upvotes - item.downvotes}
                    currentVote={
                      item.viewerHasUpvoted
                        ? 'upvote'
                        : item.viewerHasDownvoted
                          ? 'downvote'
                          : 'none'
                    }
                    hasBeenToggled={false}
                    onUpvote={() =>
                      voteOnProposal({uri: item.id, direction: 'up'})
                    }
                    onDownvote={() =>
                      voteOnProposal({uri: item.id, direction: 'down'})
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* AXIS INSIGHTS */}
        <View style={[styles.card, t.atoms.bg_contrast_25]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            <Trans>Axis Insights</Trans>
          </Text>
          <Text style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
            <Trans>Key metrics understanding the community's stance.</Trans>
          </Text>

          <View
            style={[
              a.mt_md,
              a.flex_row,
              a.rounded_md,
              a.overflow_hidden,
              a.border,
              t.atoms.border_contrast_low,
              t.atoms.bg,
            ]}>
            {/* Stat 1 */}
            <View style={[a.flex_1, a.align_center, a.py_lg]}>
              <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
                {officialAxes[0]?.name ?? '—'}
              </Text>
              <Text style={[a.text_xs, a.mt_xs, t.atoms.text_contrast_medium]}>
                <Trans>Top Axis</Trans>
              </Text>
            </View>

            {/* Divider */}
            <View
              style={[a.border_l, t.atoms.border_contrast_low, {width: 1}]}
            />

            {/* Stat 2 */}
            <View style={[a.flex_1, a.align_center, a.py_lg]}>
              <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
                {proposals.length}
              </Text>
              <Text style={[a.text_xs, a.mt_xs, t.atoms.text_contrast_medium]}>
                <Trans>Proposals</Trans>
              </Text>
            </View>

            {/* Divider */}
            <View
              style={[a.border_l, t.atoms.border_contrast_low, {width: 1}]}
            />

            {/* Stat 3 */}
            <View style={[a.flex_1, a.align_center, a.py_lg]}>
              <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
                {totalVotes}
              </Text>
              <Text style={[a.text_xs, a.mt_xs, t.atoms.text_contrast_medium]}>
                <Trans>Total Votes</Trans>
              </Text>
            </View>
          </View>
        </View>

        {/* OPEN QUESTIONS */}
        <View style={[styles.card, t.atoms.bg_contrast_25]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            <Trans>Open Questions</Trans>
          </Text>
          <Text style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
            <Trans>Questions related to this axis.</Trans>
          </Text>

          <View style={[a.mt_md, a.gap_xs]}>
            {openQuestions.map(q => (
              <TouchableOpacity
                key={q.id}
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('OpenQuestionThread', {id: q.id})
                }
                style={[
                  a.p_md,
                  a.rounded_md,
                  t.atoms.bg,
                  a.border,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                  {q.text}
                </Text>
                <View style={[a.flex_row, a.align_center, a.mt_sm]}>
                  <Text
                    style={[
                      a.text_xs,
                      t.atoms.text_contrast_medium,
                      {marginRight: 8},
                    ]}>
                    @{q.author.handle} · {q.replyCount} replies
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Layout.Content>

      <AddRAQDialog control={addDialogControl} />
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
