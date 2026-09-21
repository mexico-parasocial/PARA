import {useMemo} from 'react'
import {View} from 'react-native'

import {createEmbedViewRecordFromPost} from '#/state/queries/postgate/util'
import {useResolveLinkQuery} from '#/state/queries/resolve-link'
import {atoms as a, useTheme} from '#/alf'
import {QuoteEmbed} from '#/components/Post/Embed'
import {type app} from '#/lexicons'

export function LazyQuoteEmbed({uri}: {uri: string}) {
  const t = useTheme()
  const {data} = useResolveLinkQuery(uri)

  const view = useMemo(() => {
    if (!data || data.type !== 'record' || data.kind !== 'post') return
    /*
     * `resolve-link.ts` is still legacy-typed by design; the runtime shape is
     * the same well-formed PostView either way.
     */
    return createEmbedViewRecordFromPost(
      data.view as unknown as app.bsky.feed.defs.PostView,
    )
  }, [data])

  return view ? (
    <QuoteEmbed
      embed={{
        type: 'post',
        view,
      }}
    />
  ) : (
    <View
      style={[
        a.w_full,
        a.rounded_md,
        t.atoms.bg_contrast_25,
        {
          height: 68,
        },
      ]}
    />
  )
}
