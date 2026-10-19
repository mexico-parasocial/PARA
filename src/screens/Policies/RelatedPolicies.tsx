import {Pressable, ScrollView, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {type MatterRef} from '#/lib/matter-filter'
import {getSignalColor, parseSignalAverage} from '#/lib/policy-display'
import {usePolicyTallyQuery} from '#/state/queries/policy-tally'
import {useParaSearchPostsQuery} from '#/state/queries/search-posts'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {type app} from '#/lexicons'
import {getPolicyPostParts} from './PolicyCard'

const LIMIT = 6

function RelatedCard({
  post,
  color,
  onPress,
}: {
  post: app.bsky.feed.defs.PostView
  color: string
  onPress: () => void
}) {
  const t = useTheme()
  const {title} = getPolicyPostParts(post)
  const {data: tally} = usePolicyTallyQuery(post.uri)
  const average = tally ? parseSignalAverage(tally.signalAverage) : 0
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Abre esta policy"
      onPress={onPress}
      style={[
        a.flex_row,
        a.rounded_md,
        a.border,
        a.overflow_hidden,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
        {width: 240},
      ]}>
      <View style={{width: 4, backgroundColor: color}} />
      <View style={[a.flex_1, a.p_md, a.gap_sm, a.justify_between]}>
        <Text
          numberOfLines={3}
          style={[a.text_md, a.font_bold, a.leading_snug, t.atoms.text]}>
          {title}
        </Text>
        {tally && tally.voteCount > 0 ? (
          <Text
            style={[a.text_sm, a.font_bold, {color: getSignalColor(average)}]}>
            <Trans>
              Promedio {average > 0 ? '+' : ''}
              {average.toFixed(1)} · {tally.voteCount}{' '}
              {tally.voteCount === 1 ? 'voto' : 'votos'}
            </Trans>
          </Text>
        ) : (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>Nadie ha votado todavía</Trans>
          </Text>
        )}
      </View>
    </Pressable>
  )
}

/** The other policies filed under the same matter, so a reader can keep going. */
export function RelatedPolicies({
  matter,
  excludeUri,
  onOpen,
}: {
  matter: MatterRef
  excludeUri: string
  onOpen: (uri: string) => void
}) {
  const t = useTheme()
  const {data} = useParaSearchPostsQuery({
    // The AppView refuses an empty `q`; a blank term lists every match.
    query: ' ',
    sort: 'latest',
    postType: 'policy',
    flairs: [matter.tag],
  })
  const posts = (data?.pages.flatMap(page => page.posts) ?? [])
    .filter(post => post.uri !== excludeUri)
    .slice(0, LIMIT)
  if (posts.length === 0) return null

  return (
    <View>
      <Text style={[a.text_lg, a.font_bold, a.mb_md, t.atoms.text]}>
        <Trans>Más en {matter.label}</Trans>
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{marginHorizontal: -16}}
        contentContainerStyle={[a.gap_md, {paddingHorizontal: 16}]}>
        {posts.map(post => (
          <RelatedCard
            key={post.uri}
            post={post}
            color={matter.color}
            onPress={() => onOpen(post.uri)}
          />
        ))}
      </ScrollView>
    </View>
  )
}
