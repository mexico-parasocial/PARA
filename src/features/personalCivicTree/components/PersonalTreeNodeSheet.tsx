import {ScrollView, TouchableOpacity, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {
  PERSONAL_RELATION_COLORS,
  PERSONAL_RELATION_DIRECTED,
  PERSONAL_RELATION_LABELS,
} from '#/features/civicTree/colors'
import {
  type PersonalTreeGraph,
  relationsForNode,
} from '#/features/personalCivicTree/graph'

/*
 * The panel that answers "what is this and what did I say about it". The graph
 * shows that an item is connected; only this shows what the connection means,
 * including the note the user left when they drew it.
 */
export function PersonalTreeNodeSheet({
  graph,
  nodeId,
  onClose,
  onOpenCollection,
}: {
  graph: PersonalTreeGraph
  nodeId: string
  onClose: () => void
  onOpenCollection: (collectionId: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()

  const node = graph.nodes.find(n => n.id === nodeId)
  if (!node) return null

  const relations = relationsForNode(graph, nodeId)
  const {item} = node.metadata

  return (
    <View
      style={[
        a.mx_md,
        a.mb_md,
        a.rounded_md,
        a.overflow_hidden,
        t.atoms.bg,
        {borderWidth: 1, borderColor: t.palette.contrast_100},
      ]}>
      <View
        style={[
          a.flex_row,
          a.align_start,
          a.gap_sm,
          a.px_md,
          a.pt_md,
          a.pb_sm,
        ]}>
        <View
          style={[
            a.rounded_full,
            a.mt_2xs,
            {
              width: 12,
              height: 12,
              backgroundColor: node.color,
              borderWidth: 2,
              borderColor: node.borderColor,
            },
          ]}
        />
        <View style={[a.flex_1, a.gap_2xs]}>
          <Text
            style={[a.text_md, a.font_bold, t.atoms.text]}
            numberOfLines={3}>
            {node.title}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={node.metadata.collectionName}
            accessibilityHint={l`Opens this collection`}
            onPress={() => onOpenCollection(node.metadata.collectionId)}>
            <Text style={[a.text_xs, {color: node.borderColor}]}>
              {node.metadata.collectionName} · {node.metadata.kind}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={l`Close`}
          onPress={onClose}
          hitSlop={10}>
          <Text style={[a.text_md, t.atoms.text_contrast_medium]}>✕</Text>
        </TouchableOpacity>
      </View>

      {item.description ? (
        <Text
          style={[a.text_sm, a.px_md, a.pb_sm, t.atoms.text_contrast_medium]}
          numberOfLines={4}>
          {item.description}
        </Text>
      ) : null}

      <View
        style={[
          a.px_md,
          a.py_sm,
          {borderTopWidth: 1, borderTopColor: t.palette.contrast_50},
        ]}>
        <Text
          style={[
            a.text_xs,
            a.font_bold,
            a.mb_xs,
            t.atoms.text_contrast_medium,
          ]}>
          <Trans>Connections</Trans>
        </Text>

        {relations.length === 0 ? (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>
              Not connected to anything yet. Open its collection to connect it.
            </Trans>
          </Text>
        ) : (
          <ScrollView style={{maxHeight: 168}} nestedScrollEnabled>
            {relations.map(({edge, otherTitle, outgoing}) => {
              const color =
                PERSONAL_RELATION_COLORS[edge.kind] ?? t.palette.contrast_400
              const label = PERSONAL_RELATION_LABELS[edge.kind] ?? edge.kind
              const directed = PERSONAL_RELATION_DIRECTED[edge.kind]

              /*
               * An incoming directed relation has to be read backwards, so
               * name the other item first rather than pretending this node is
               * the subject.
               */
              return (
                <View key={edge.id} style={[a.py_xs, a.gap_2xs]}>
                  <View style={[a.flex_row, a.align_center, a.gap_xs]}>
                    <View
                      style={{width: 12, height: 2, backgroundColor: color}}
                    />
                    <Text style={[a.text_xs, {color}]}>
                      {directed && !outgoing
                        ? l`${otherTitle} ${label} this`
                        : label}
                    </Text>
                  </View>
                  {directed && !outgoing ? null : (
                    <Text
                      style={[a.text_sm, a.pl_md, t.atoms.text]}
                      numberOfLines={2}>
                      {otherTitle}
                    </Text>
                  )}
                  {edge.note ? (
                    <Text
                      style={[
                        a.text_xs,
                        a.pl_md,
                        a.italic,
                        t.atoms.text_contrast_medium,
                      ]}
                      numberOfLines={2}>
                      {edge.note}
                    </Text>
                  ) : null}
                </View>
              )
            })}
          </ScrollView>
        )}
      </View>
    </View>
  )
}
