import {useCallback} from 'react'
import {
  Reanimated3DefaultSpringConfig,
  withSpring,
} from 'react-native-reanimated'
import {useFocusEffect} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {
  HomeHeaderModeProvider,
  useHomeHeaderMode,
} from '#/view/com/util/MainScrollProvider'
import {PostThread} from '#/screens/PostThread'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PostThread'>
const POST_COLLECTIONS = new Set(['app.bsky.feed.post', 'com.para.post'])

export function PostThreadScreen({route}: Props) {
  return (
    <HomeHeaderModeProvider>
      <PostThreadScreenInner route={route} />
    </HomeHeaderModeProvider>
  )
}

function PostThreadScreenInner({route}: {route: Props['route']}) {
  const headerMode = useHomeHeaderMode()
  const showHeader = useCallback(() => {
    'worklet'
    headerMode.set(
      withSpring(0, {
        ...Reanimated3DefaultSpringConfig,
        overshootClamping: true,
      }),
    )
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
