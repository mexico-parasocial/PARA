import {useMemo} from 'react'

import {FeedTuner, FeedViewPostsSlice} from '#/lib/api/feed-manip'
import {type FeedDescriptor} from '../queries/post-feed'
import {usePreferencesQuery} from '../queries/preferences'
import {useSession} from '../session'
import {useBaseFilter} from '../shell/base-filter'
import {useLanguagePrefs} from './languages'

export function useFeedTuners(
  feedDesc: FeedDescriptor,
  opts?: {applyBaseCommunityFilters?: boolean},
) {
  const langPrefs = useLanguagePrefs()
  const {data: preferences} = usePreferencesQuery()
  const {currentAccount} = useSession()
  const {activeFilters} = useBaseFilter() // Use activeFilters from card selections

  return useMemo(() => {
    if (feedDesc.startsWith('author')) {
      if (feedDesc.endsWith('|posts_with_replies')) {
        // TODO: Do this on the server instead.
        return [FeedTuner.removeReposts]
      }
    }
    if (feedDesc.startsWith('feedgen')) {
      return [
        FeedTuner.preferredLangOnly(langPrefs.contentLanguages),
        FeedTuner.removeMutedThreads,
      ]
    }
    if (feedDesc === 'following' || feedDesc.startsWith('list')) {
      const feedTuners = [FeedTuner.removeOrphans]

      if (preferences?.feedViewPrefs.hideReposts) {
        feedTuners.push(FeedTuner.removeReposts)
      }
      if (preferences?.feedViewPrefs.hideReplies) {
        feedTuners.push(FeedTuner.removeReplies)
      } else {
        feedTuners.push(
          FeedTuner.followedRepliesOnly({
            userDid: currentAccount?.did || '',
          }),
        )
      }
      if (preferences?.feedViewPrefs.hideQuotePosts) {
        feedTuners.push(FeedTuner.removeQuotePosts)
      }
      feedTuners.push(FeedTuner.dedupThreads)
      feedTuners.push(FeedTuner.removeMutedThreads)

      // Base community filters should only affect the Base feed.
      // When no filters are selected, show ALL posts (no filtering).
      const allFilters = opts?.applyBaseCommunityFilters ? activeFilters : []

      if (allFilters.length > 0) {
        feedTuners.push((tuner, slices) => {
          const normalizedFilters = new Set(
            allFilters.map(filter => normalizeCommunityFilter(filter)),
          )

          try {
            return slices
              .map(slice => {
                const filteredItems = slice.items.filter(item => {
                  const postFilters = getPostCommunityFilters(item.post.record)
                  // Post has no community metadata → include it (show all indiscriminately)
                  if (postFilters.length === 0) {
                    return true
                  }
                  // Post has metadata → only include if it matches selected filters
                  return postFilters.some(filter =>
                    normalizedFilters.has(filter),
                  )
                })

                if (filteredItems.length === 0) return null

                // Return new slice with filtered items
                // We need to preserve the FeedViewPostsSlice class instance structure if possible,
                // or ensure what we return satisfies the type.
                // Creating a new object with the same prototype is safer than returning a plain object.
                const newSlice = Object.create(Object.getPrototypeOf(slice))
                Object.assign(newSlice, slice)
                newSlice.items = filteredItems
                return newSlice
              })
              .filter((slice): slice is FeedViewPostsSlice => slice !== null)
          } catch (e) {
            console.error('Error filtering feed:', e)
            return slices
          }
        })
      }

      return feedTuners
    }
    return []
  }, [
    feedDesc,
    currentAccount,
    preferences,
    langPrefs,
    activeFilters,
    opts?.applyBaseCommunityFilters,
  ])
}

function getPostCommunityFilters(record: Record<string, unknown>) {
  const values = [
    pickString(record.party),
    pickString(record.community),
    pickString(record.category),
    ...pickStringArray(record.communities),
    ...pickStringArray(record.tags),
  ]

  return Array.from(
    new Set(values.map(normalizeCommunityFilter).filter(Boolean)),
  )
}

function normalizeCommunityFilter(value: string) {
  return value.trim().replace(/^p\//i, '').toLowerCase()
}

function pickString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function pickStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}
