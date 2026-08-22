import {ScrollView, TouchableOpacity, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {
  buildTopicClusters,
  type TopicCluster,
  type TopicGraphData,
  untopicedNodes,
} from '#/features/communityCivicTree/topics'
import {CARD_TYPE_COLORS} from '#/features/civicTree/colors'

/*
 * What the community is working on, ordered by how many members are working on
 * it. Deliberately not ordered by activity: twenty cards from one member is a
 * monologue, and ranking it first would reward volume over convergence, which
 * is the opposite of what a shared tree is for.
 *
 * A topic nobody else has joined is shown too, marked rather than hidden - an
 * unanswered topic is an invitation, and burying it guarantees it stays one.
 */
export function CommunityTopicRail({
  data,
  onTopicPress,
  onAddTopic,
}: {
  data: TopicGraphData
  onTopicPress: (nodeId: string) => void
  onAddTopic?: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()

  const clusters = buildTopicClusters(data)
  const loose = untopicedNodes(data)

  if (clusters.length === 0) {
    return (
      <View style={[a.mx_md, a.mb_sm]}>
        <View
          style={[
            a.px_md,
            a.py_sm,
            a.rounded_md,
            a.flex_row,
            a.align_center,
            a.gap_sm,
            {
              backgroundColor: t.palette.contrast_25,
              borderWidth: 1,
              borderColor: t.palette.contrast_100,
            },
          ]}>
          <Text style={[a.text_xs, a.flex_1, t.atoms.text_contrast_medium]}>
            <Trans>
              No topics yet. A topic names what the cards below are about, and
              is how the tree gets a shape everyone can add to.
            </Trans>
          </Text>
          {onAddTopic ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={l`Propose a topic`}
              onPress={onAddTopic}>
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  {color: t.palette.primary_500},
                ]}>
                <Trans>Propose one</Trans>
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    )
  }

  return (
    <View style={[a.mb_sm, a.gap_xs]}>
      <View style={[a.flex_row, a.align_center, a.px_md]}>
        <Text
          style={[
            a.text_xs,
            a.font_bold,
            a.flex_1,
            t.atoms.text_contrast_medium,
          ]}>
          <Trans>Being worked on together</Trans>
        </Text>
        {loose.length > 0 ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {plural(loose.length, {
              one: '# card without a topic',
              other: '# cards without a topic',
            })}
          </Text>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[a.gap_sm, a.px_md, a.pb_2xs]}>
        {clusters.map(cluster => (
          <TopicCard
            key={cluster.topic.id}
            cluster={cluster}
            onPress={() => onTopicPress(cluster.topic.id)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function TopicCard({
  cluster,
  onPress,
}: {
  cluster: TopicCluster
  onPress: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {topic, attached, contributorCount, isMonologue, flairId} = cluster

  const accent = CARD_TYPE_COLORS.topic

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={topic.title}
      accessibilityHint={
        isMonologue
          ? l`Nobody has joined this topic yet`
          : l`${contributorCount} members are working on this topic`
      }
      onPress={onPress}
      style={[
        a.rounded_md,
        a.px_md,
        a.py_sm,
        a.gap_2xs,
        {
          width: 184,
          borderWidth: 1,
          borderColor: isMonologue ? t.palette.contrast_100 : accent,
          backgroundColor: isMonologue ? 'transparent' : accent + '12',
        },
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_xs]}>
        <View
          style={[
            a.rounded_full,
            {width: 7, height: 7, backgroundColor: accent},
          ]}
        />
        {flairId ? (
          <Text style={[a.text_xs, {color: accent}]}>
            <Trans>Shared</Trans>
          </Text>
        ) : null}
      </View>

      <Text style={[a.text_sm, a.font_bold, t.atoms.text]} numberOfLines={2}>
        {topic.title}
      </Text>

      {isMonologue ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>No one has joined yet</Trans>
        </Text>
      ) : (
        <Text style={[a.text_xs, {color: accent}]}>
          {plural(contributorCount, {
            one: '# member',
            other: '# members',
          })}
          {' · '}
          {plural(attached.length, {one: '# card', other: '# cards'})}
        </Text>
      )}
    </TouchableOpacity>
  )
}
