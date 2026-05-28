import {useMemo} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {type HighlightData} from '#/state/highlights/highlightTypes'
import {useHighlights} from '#/state/highlights/useHighlights'
import {useResolveUriQuery} from '#/state/queries/resolve-uri'
import {List} from '#/view/com/util/List'
import {atoms as a, useTheme} from '#/alf'
import {Link} from '#/components/Link'
import {ListMaybePlaceholder} from '#/components/Lists'
import {Text} from '#/components/Typography'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function PostHighlights({uri}: {uri: string}) {
  const t = useTheme()
  const {_} = useLingui()
  const initialNumToRender = useInitialNumToRender()

  const {
    data: resolvedUri,
    error: resolveError,
    isLoading: isLoadingUri,
  } = useResolveUriQuery(uri)
  const subjectUri = resolvedUri?.uri || uri
  const {highlights} = useHighlights(subjectUri)

  const sortedHighlights = useMemo(() => {
    return [...highlights].sort((a, b) => b.createdAt - a.createdAt)
  }, [highlights])

  if (sortedHighlights.length < 1) {
    return (
      <ListMaybePlaceholder
        isLoading={isLoadingUri}
        isError={Boolean(resolveError)}
        emptyType="results"
        emptyTitle={_(msg`No highlights yet`)}
        emptyMessage={_(msg`There are no highlights on this post yet.`)}
        errorMessage={String(resolveError)}
        sideBorders={false}
        topBorder={false}
      />
    )
  }

  return (
    <List
      data={sortedHighlights}
      keyExtractor={(item: HighlightData) => item.id}
      renderItem={({item, index}: {item: HighlightData; index: number}) => (
        <Link
          label={_(msg`View highlight`)}
          to={{screen: 'SeeHighlightDetails', params: {highlightId: item.id}}}
          style={[
            a.px_lg,
            a.py_md,
            index !== 0 && [a.border_t, t.atoms.border_contrast_low],
          ]}>
          <View style={[a.gap_xs]}>
            <View
              style={[a.flex_row, a.align_center, a.justify_between, a.gap_sm]}>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.gap_sm,
                  a.flex_wrap,
                  a.flex_1,
                ]}>
                {item.tag ? (
                  <Text
                    style={[a.text_sm, a.font_semi_bold, {color: item.color}]}>
                    #{item.tag}
                  </Text>
                ) : null}
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {item.isPublic ? _(msg`Public`) : _(msg`Private`)}
                </Text>
              </View>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
            <Text style={[a.text_md]} numberOfLines={3}>
              {item.text}
            </Text>
          </View>
        </Link>
      )}
      initialNumToRender={initialNumToRender}
      windowSize={11}
      sideBorders={false}
    />
  )
}
