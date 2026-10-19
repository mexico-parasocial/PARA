import {Pressable, View} from 'react-native'
import {AtUri} from '@atproto/syntax'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {toCabildeoRouteParams} from '#/lib/cabildeo-client'
import {useOpenLink} from '#/lib/hooks/useOpenLink'
import {type NavigationProp} from '#/lib/routes/types'
import {useMatterRelatedItems} from '#/state/queries/matter-related'
import {atoms as a, useTheme} from '#/alf'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import {Text} from '#/components/Typography'
import {
  type MatterAnchor,
  type RelatedCategory,
  type RelatedItem,
} from '#/features/civicTree/matterRelated'

const SECTIONS: RelatedCategory[] = ['policy', 'data', 'other']

function parseAtUri(uri: string) {
  try {
    return new AtUri(uri)
  } catch {
    return undefined
  }
}

function RelatedRow({
  item,
  onPress,
}: {
  item: RelatedItem
  onPress?: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const origins = item.origins.map(origin =>
    origin.kind === 'personal'
      ? _(msg`Mi árbol · ${origin.name}`)
      : origin.name,
  )
  const body = (
    <View style={[a.flex_1, a.gap_xs]}>
      <Text
        numberOfLines={2}
        style={[a.text_md, a.font_bold, a.leading_snug, t.atoms.text]}>
        {item.title}
      </Text>
      <View style={[a.flex_row, a.align_center, a.gap_xs, a.flex_wrap]}>
        <TreeIcon size="xs" style={t.atoms.text_contrast_medium} />
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {origins.join(' · ')}
        </Text>
      </View>
    </View>
  )
  const style = [
    a.flex_row,
    a.rounded_md,
    a.border,
    a.p_md,
    t.atoms.bg_contrast_25,
    t.atoms.border_contrast_low,
  ]
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={_(msg`Abre este elemento`)}
      onPress={onPress}
      style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  )
}

/**
 * What civic trees have connected to this matter: policies and data that the
 * viewer, or a community, drew a connection to. Sharing a flair is not a
 * connection, so an unconnected item is not listed.
 */
export function MatterRelated({anchor}: {anchor: MatterAnchor}) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const openLink = useOpenLink()
  const {items, isLoading, isError} = useMatterRelatedItems(anchor)

  const sectionTitle = (category: RelatedCategory) =>
    category === 'policy'
      ? _(msg`Policies`)
      : category === 'data'
        ? _(msg`Datos y fuentes`)
        : _(msg`Otros`)

  const open = (item: RelatedItem) => {
    const uri = item.uri ? parseAtUri(item.uri) : undefined
    if (uri?.collection === 'com.para.civic.cabildeo') {
      return () =>
        navigation.navigate('CabildeoDetail', {
          cabildeoUri: toCabildeoRouteParams({uri: item.uri!}).cabildeoUri,
        })
    }
    if (
      uri &&
      item.category === 'policy' &&
      uri.collection === 'com.para.post'
    ) {
      return () => navigation.navigate('PolicyDetails', {policyUri: item.uri})
    }
    if (uri) {
      return () =>
        navigation.navigate('PostThread', {
          name: uri.host,
          rkey: uri.rkey,
          collection: uri.collection,
        })
    }
    if (item.url) {
      const url = item.url
      return () => openLink(url)
    }
    return undefined
  }

  return (
    <View testID="matterRelated">
      <Text style={[a.text_lg, a.font_bold, a.mb_md, t.atoms.text]}>
        <Trans>Relacionados en árboles cívicos</Trans>
      </Text>
      {isLoading && items.length === 0 ? (
        <View
          style={[
            a.rounded_md,
            t.atoms.bg_contrast_25,
            {height: 96, opacity: 0.6},
          ]}
        />
      ) : isError ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {_(msg`No se pudieron cargar los árboles cívicos.`)}
        </Text>
      ) : items.length === 0 ? (
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            Ningún árbol ha conectado policies ni datos con este matter todavía.
            Guarda este matter en tu árbol y conéctalo con lo que lo explica.
          </Trans>
        </Text>
      ) : (
        <View style={[a.gap_lg]}>
          {SECTIONS.map(category => {
            const rows = items.filter(item => item.category === category)
            if (rows.length === 0) return null
            return (
              <View key={category} style={[a.gap_sm]}>
                <Text
                  style={[
                    a.text_sm,
                    a.font_bold,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {sectionTitle(category)} · {rows.length}
                </Text>
                {rows.map(item => (
                  <RelatedRow key={item.key} item={item} onPress={open(item)} />
                ))}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
