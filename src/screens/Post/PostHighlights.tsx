import {useCallback} from 'react'
import {Plural, Trans} from '@lingui/react/macro'
import {useFocusEffect} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {useHighlights} from '#/state/highlights/useHighlights'
import {useSetMinimalShellMode} from '#/state/shell'
import {PostHighlights as PostHighlightsComponent} from '#/view/com/post-thread/PostHighlights'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PostHighlights'>
export const PostHighlightsScreen = ({route}: Props) => {
  const setMinimalShellMode = useSetMinimalShellMode()
  const {name, rkey} = route.params
  const uri = makeRecordUri(name, 'app.bsky.feed.post', rkey)
  const {highlights} = useHighlights(uri)

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <>
            <Layout.Header.TitleText>
              <Trans>Highlights</Trans>
            </Layout.Header.TitleText>
            <Layout.Header.SubtitleText>
              <Plural
                value={highlights.length}
                one="# highlight"
                other="# highlights"
              />
            </Layout.Header.SubtitleText>
          </>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <PostHighlightsComponent uri={uri} />
    </Layout.Screen>
  )
}
