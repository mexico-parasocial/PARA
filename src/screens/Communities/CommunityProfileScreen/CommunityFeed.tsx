import {TouchableOpacity, View} from 'react-native'
import  {type AppBskyFeedDefs} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {type UsePaletteValue} from '#/lib/hooks/usePalette'
import {cleanError} from '#/lib/strings/errors'
import {Post} from '#/view/com/post/Post'
import {PostFeedLoadingPlaceholder} from '#/view/com/util/LoadingPlaceholder'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ListFooter} from '#/components/Lists'
import {styles} from './styles'

export function CommunityFeed({
  posts,
  isLoading,
  isFetched,
  isError,
  error,
  isFetchingNextPage,
  hasNextPage,
  refetchPosts,
  fetchNextPage,
  pal,
}: {
  posts: AppBskyFeedDefs.PostView[]
  isLoading: boolean
  isFetched: boolean
  isError: boolean
  error: Error | null
  isFetchingNextPage: boolean
  hasNextPage: boolean
  refetchPosts: () => Promise<unknown>
  fetchNextPage: () => void
  pal: UsePaletteValue
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View style={styles.feedScroll}>
      {isLoading || !isFetched ? (
        <PostFeedLoadingPlaceholder />
      ) : isError ? (
        <View
          style={[
            styles.feedErrorCard,
            {
              backgroundColor:
                t.scheme === 'dark'
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.03)',
              borderColor: t.palette.negative_200,
            },
          ]}>
          <Text
            style={[styles.feedErrorTitle, {color: t.palette.negative_500}]}>
            Couldn't load posts
          </Text>
          <Text style={[styles.feedErrorBody, pal.textLight]}>
            {error
              ? cleanError(error)
              : 'An unexpected error occurred. Pull to refresh or tap retry.'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void refetchPosts()}
            style={[
              styles.feedRetryButton,
              {backgroundColor: t.palette.primary_500},
            ]}>
            <Text style={styles.feedRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : posts.length < 1 ? (
        <View style={styles.feedEmptyWrap}>
          <Text style={[styles.feedEmptyIcon]}>📭</Text>
          <Text style={[styles.feedEmptyTitle, pal.text]}>No posts yet</Text>
          <Text style={[styles.feedEmptyBody, pal.textLight]}>
            {_(msg`We couldn't find any real posts for this community yet.`)}
          </Text>
        </View>
      ) : (
        <>
          {posts.map((post, index) => (
            <Post
              key={`${post.uri}-${index}`}
              post={post}
              hideTopBorder={index === 0}
            />
          ))}
          <ListFooter
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            error={cleanError(error)}
            onRetry={async () => {
              fetchNextPage()
            }}
          />
        </>
      )}
    </View>
  )
}
