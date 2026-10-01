import {useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {type GraphData} from '#/features/civicTree/types'
import {buildCommunityCollections} from '../workspace'

export function CommunityCivicTreeCollections({
  data,
  context = data,
  onNodePress,
}: {
  data: GraphData
  context?: GraphData
  onNodePress: (id: string) => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const [openId, setOpenId] = useState<string>()
  const collections = buildCommunityCollections(
    data,
    i18n._.bind(i18n),
    context,
  )
  const opened = collections.find(collection => collection.id === openId)
  return (
    <ScrollView
      style={a.flex_1}
      contentContainerStyle={[a.p_md, a.gap_md, {paddingBottom: 100}]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Community collections are topic groups built from existing
          connections. A card can belong to more than one topic.
        </Trans>
      </Text>
      {opened ? (
        <>
          <Button
            label={l`All collections`}
            size="small"
            variant="ghost"
            color="secondary"
            onPress={() => setOpenId(undefined)}>
            <ButtonText>
              <Trans>All collections</Trans>
            </ButtonText>
          </Button>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            {opened.title}
          </Text>
          {opened.nodes.map(node => (
            <TouchableOpacity
              key={node.id}
              accessibilityRole="button"
              accessibilityLabel={l`Inspect ${node.title}`}
              accessibilityHint={l`Opens this node's details`}
              onPress={() => onNodePress(node.id)}
              style={[
                a.p_md,
                a.rounded_md,
                a.border,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_low,
                a.gap_xs,
              ]}>
              <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                {node.title}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {node.card_type}
              </Text>
              {node.content ? (
                <Text
                  numberOfLines={2}
                  style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  {node.content}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </>
      ) : collections.length ? (
        collections.map(collection => (
          <TouchableOpacity
            key={collection.id}
            accessibilityRole="button"
            accessibilityLabel={l`Open collection ${collection.title}`}
            accessibilityHint={l`Shows the cards connected to this topic`}
            onPress={() => setOpenId(collection.id)}
            style={[
              a.flex_row,
              a.align_center,
              a.gap_md,
              a.p_md,
              a.rounded_md,
              a.border,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <View
              style={[
                a.rounded_md,
                a.align_center,
                a.justify_center,
                {
                  width: 42,
                  height: 42,
                  backgroundColor: collection.color + '20',
                },
              ]}>
              <Text style={[a.text_lg, {color: collection.color}]}>▦</Text>
            </View>
            <View style={[a.flex_1, a.gap_xs]}>
              <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                {collection.title}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {plural(collection.nodes.length, {
                  one: '# card',
                  other: '# cards',
                })}
              </Text>
            </View>
            <Text style={t.atoms.text_contrast_medium}>›</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={[a.p_xl, a.text_center, t.atoms.text_contrast_medium]}>
          <Trans>No cards match these filters.</Trans>
        </Text>
      )}
    </ScrollView>
  )
}
