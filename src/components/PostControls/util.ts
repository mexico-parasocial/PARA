import {useCallback} from 'react'
import {type AppBskyFeedDefs} from '@atproto/api'
import {useLingui} from '@lingui/react'

type ParaSummaryPost = Pick<
  AppBskyFeedDefs.PostView,
  'likeCount' | 'replyCount' | 'quoteCount' | 'bookmarkCount'
>

export function getParaPostSummaryMetrics(
  post: ParaSummaryPost,
  highlightsCount: number,
) {
  return {
    votes: post.likeCount ?? 0,
    comments: post.replyCount ?? 0,
    highlights: highlightsCount,
    quotes: post.quoteCount ?? 0,
    saves: post.bookmarkCount ?? 0,
  }
}

/**
 * This matches `formatCount` from `view/com/util/numeric/format.ts`, but has
 * additional truncation logic for large numbers. `roundingMode` should always
 * match the original impl, regardless of if we add more formatting here.
 */
export function useFormatPostStatCount() {
  const {i18n} = useLingui()

  return useCallback(
    (postStatCount: number) => {
      const isOver10k = postStatCount >= 10_000
      return i18n.number(postStatCount, {
        notation: 'compact',
        maximumFractionDigits: isOver10k ? 0 : 1,
        roundingMode: 'trunc',
      })
    },
    [i18n],
  )
}
