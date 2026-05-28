import {useCallback} from 'react'
import {withSpring} from 'react-native-reanimated'
import {useFocusEffect} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {useMinimalShellMode} from '#/state/shell'
import {PostThread} from '#/screens/PostThread'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PostThread'>
const POST_COLLECTIONS = new Set(['app.bsky.feed.post', 'com.para.post'])

export function PostThreadScreen({route}: Props) {
  const {headerMode} = useMinimalShellMode()
  const showHeader = useCallback(() => {
    'worklet'
    headerMode.set(withSpring(0, {overshootClamping: true}))
  }, [headerMode])

  const {name, rkey} = route.params
  const collection = POST_COLLECTIONS.has(route.params.collection || '')
    ? route.params.collection!
    : 'app.bsky.feed.post'
  const uri = makeRecordUri(name, collection, rkey)

  useFocusEffect(
    useCallback(() => {
      showHeader()
    }, [showHeader]),
  )

  return (
    <Layout.Screen testID="postThreadScreen">
      <PostThread uri={uri} />
    </Layout.Screen>
  )
}
