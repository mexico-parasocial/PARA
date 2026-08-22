import {useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {
  buildTopicClusters,
  type TopicGraphData,
  type TopicGraphNode,
  untopicedNodes,
} from '#/features/communityCivicTree/topics'
import {CARD_TYPE_COLORS} from '#/features/civicTree/colors'

/*
 * The two smallest useful things a member can do, surfaced as work rather than
 * as a statistic.
 *
 * Both already existed as numbers: a count of cards attached to nothing, and a
 * set of topics only their author has touched. A count tells you the tree is
 * untidy; it does not tell anyone what to do about it. Named as tasks, they
 * become the lowest-stakes way into a community - a newcomer has no standing to
 * argue a claim yet, but "do you know what this card is about" needs none.
 */
export function CommunityHelpWanted({
  data,
  onNodePress,
}: {
  data: TopicGraphData
  onNodePress: (nodeId: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [open, setOpen] = useState(false)

  const loose = untopicedNodes(data)
  const lonely = buildTopicClusters(data).filter(c => c.isMonologue)

  const total = loose.length + lonely.length
  if (total === 0) return null

  return (
    <View style={[a.mx_md, a.mb_sm]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={l`Ways to help`}
        accessibilityHint={l`Shows cards and topics that need attention`}
        accessibilityState={{expanded: open}}
        onPress={() => setOpen(v => !v)}
        style={[
          a.flex_row,
          a.align_center,
          a.gap_sm,
          a.px_md,
          a.py_sm,
          a.rounded_md,
          {
            backgroundColor: t.palette.contrast_25,
            borderWidth: 1,
            borderColor: t.palette.contrast_100,
          },
        ]}>
        <View
          style={[
            a.rounded_full,
            {width: 6, height: 6, backgroundColor: CARD_TYPE_COLORS.topic},
          ]}
        />
        <Text style={[a.text_xs, a.font_bold, a.flex_1, t.atoms.text]}>
          <Trans>Ways to help</Trans>
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {plural(total, {one: '# thing', other: '# things'})}
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {open ? '▾' : '▸'}
        </Text>
      </TouchableOpacity>

      {open ? (
        <View style={[a.mt_xs, a.gap_sm]}>
          {loose.length > 0 ? (
            <HelpSection
              title={l`Nobody has said what these are about`}
              hint={l`Connect one to a topic, or propose a topic for it`}
              nodes={loose}
              accent={t.palette.contrast_400}
              onNodePress={onNodePress}
            />
          ) : null}

          {lonely.length > 0 ? (
            <HelpSection
              title={l`Topics waiting for a second voice`}
              hint={l`Only the member who raised these has added anything`}
              nodes={lonely.map(c => c.topic)}
              accent={CARD_TYPE_COLORS.topic}
              onNodePress={onNodePress}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function HelpSection({
  title,
  hint,
  nodes,
  accent,
  onNodePress,
}: {
  title: string
  hint: string
  nodes: TopicGraphNode[]
  accent: string
  onNodePress: (nodeId: string) => void
}) {
  const t = useTheme()

  /*
   * Capped: this is an invitation, not a backlog to stare at. A wall of forty
   * unsorted cards reads as neglect and puts people off rather than drawing
   * them in.
   */
  const shown = nodes.slice(0, 6)
  const rest = nodes.length - shown.length

  return (
    <View style={a.gap_2xs}>
      <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>{title}</Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>{hint}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[a.gap_xs, a.pt_2xs]}>
        {shown.map(node => (
          <TouchableOpacity
            key={node.id}
            accessibilityRole="button"
            accessibilityLabel={node.title}
            onPress={() => onNodePress(node.id)}
            style={[
              a.rounded_sm,
              a.px_sm,
              a.py_xs,
              {
                maxWidth: 200,
                borderWidth: 1,
                borderColor: t.palette.contrast_100,
                borderLeftWidth: 2,
                borderLeftColor: accent,
              },
            ]}>
            <Text style={[a.text_xs, t.atoms.text]} numberOfLines={2}>
              {node.title}
            </Text>
          </TouchableOpacity>
        ))}
        {rest > 0 ? (
          <View style={[a.px_sm, a.py_xs, a.justify_center]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {plural(rest, {one: '+# more', other: '+# more'})}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}
