import {ScrollView, TouchableOpacity, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {
  PERSONAL_RELATION_COLORS,
  PERSONAL_RELATION_LABELS,
} from '#/features/civicTree/colors'
import {type PersonalTreeGraph} from '#/features/personalCivicTree/graph'

/*
 * Two legends in one strip, because the graph encodes two things at once:
 * the ring around a node is its collection, the lines between nodes are the
 * relations the user drew. Only relation kinds actually present are shown -
 * a legend for seven kinds when the user has used one is noise.
 */
export function PersonalTreeLegend({
  graph,
  activeGroups,
  onToggleGroup,
}: {
  graph: PersonalTreeGraph
  activeGroups: Set<string>
  onToggleGroup: (groupId: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()

  const usedKinds = Array.from(new Set(graph.edges.map(e => e.kind)))

  return (
    <View style={[a.gap_xs]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[a.gap_xs, a.px_md, a.py_2xs]}>
        {graph.groups.map(group => {
          const active = activeGroups.size === 0 || activeGroups.has(group.id)
          return (
            <TouchableOpacity
              key={group.id}
              accessibilityRole="button"
              accessibilityLabel={group.name}
              accessibilityHint={l`Shows or hides this collection in the tree`}
              accessibilityState={{selected: active}}
              onPress={() => onToggleGroup(group.id)}
              style={[
                a.flex_row,
                a.align_center,
                a.gap_xs,
                a.rounded_full,
                a.px_sm,
                {
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: active ? group.color : t.palette.contrast_100,
                  backgroundColor: active ? group.color + '18' : 'transparent',
                  opacity: active ? 1 : 0.55,
                },
              ]}>
              <View
                style={[
                  a.rounded_full,
                  {
                    width: 9,
                    height: 9,
                    borderWidth: 2,
                    borderColor: group.color,
                  },
                ]}
              />
              <Text
                style={[
                  a.text_xs,
                  {
                    color: active
                      ? t.palette.contrast_800
                      : t.palette.contrast_500,
                  },
                ]}
                numberOfLines={1}>
                {group.name}
              </Text>
              <Text style={[a.text_xs, {color: t.palette.contrast_400}]}>
                {group.itemCount}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {usedKinds.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[a.gap_md, a.px_md, {paddingBottom: 4}]}>
          {usedKinds.map(kind => (
            <View key={kind} style={[a.flex_row, a.align_center, a.gap_xs]}>
              <View
                style={{
                  width: 14,
                  height: 2,
                  backgroundColor:
                    PERSONAL_RELATION_COLORS[kind] ?? t.palette.contrast_400,
                }}
              />
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {PERSONAL_RELATION_LABELS[kind] ?? kind}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  )
}

/**
 * Shown when items exist but none are connected - the state every user is in
 * before they draw their first relation. An empty canvas would read as a bug.
 */
export function PersonalTreeUnconnectedNotice({
  count,
  total,
}: {
  count: number
  total: number
}) {
  const t = useTheme()

  if (count === 0) return null

  const isEverything = count === total

  return (
    <View
      style={[
        a.mx_md,
        a.mb_xs,
        a.px_md,
        a.py_sm,
        a.rounded_md,
        a.flex_row,
        a.align_center,
        a.gap_sm,
        {
          backgroundColor: t.palette.primary_25,
          borderWidth: 1,
          borderColor: t.palette.primary_100,
        },
      ]}>
      <View
        style={[
          a.rounded_full,
          {width: 6, height: 6, backgroundColor: t.palette.primary_500},
        ]}
      />
      <Text style={[a.text_xs, a.flex_1, {color: t.palette.contrast_700}]}>
        {isEverything ? (
          <Trans>
            Nothing is connected yet. Open an item and use Connect to say how it
            relates to another - that is what draws the tree.
          </Trans>
        ) : (
          <Trans>
            {plural(count, {one: '# item is', other: '# items are'})} not
            connected to anything yet.
          </Trans>
        )}
      </Text>
    </View>
  )
}
