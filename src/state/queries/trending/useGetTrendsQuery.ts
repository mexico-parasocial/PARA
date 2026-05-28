import {useCallback, useMemo} from 'react'
import {type AppBskyUnspeccedGetTrends, hasMutedWord} from '@atproto/api'
import {useQuery} from '@tanstack/react-query'

import {
  aggregateUserInterests,
  createBskyTopicsHeader,
} from '#/lib/api/feed/utils'
import {getContentLanguages} from '#/state/preferences/languages'
import {STALE} from '#/state/queries'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useAgent} from '#/state/session'

export const DEFAULT_LIMIT = 5

export const createGetTrendsQueryKey = () => ['trends']

export function useGetTrendsQuery() {
  const agent = useAgent()
  const {data: preferences} = usePreferencesQuery()
  const mutedWords = useMemo(() => {
    return preferences?.moderationPrefs?.mutedWords || []
  }, [preferences?.moderationPrefs])

  return useQuery({
    enabled: !!preferences,
    staleTime: STALE.MINUTES.THREE,
    queryKey: createGetTrendsQueryKey(),
    queryFn: async () => {
      try {
        const contentLangs = getContentLanguages().join(',')
        const {data} = await agent.app.bsky.unspecced.getTrends(
          {
            limit: DEFAULT_LIMIT,
          },
          {
            headers: {
              ...createBskyTopicsHeader(aggregateUserInterests(preferences)),
              'Accept-Language': contentLangs,
            },
          },
        )
        return data
      } catch (e) {
        // Fallback for when PDS doesn't support trends (e.g. local dev)
        console.warn('Failed to fetch trends, using mock data', e)
        return {
          trends: [
            {
              topic: 'para',
              displayName: 'Para App',
              description: 'The future of social networking',
              link: '/search?q=para',
              startedAt: new Date().toISOString(),
              postCount: 1337,
              actors: [],
            },
            {
              topic: 'dev-mode',
              displayName: 'Dev Mode',
              description: 'Running on localhost',
              link: '/search?q=dev-mode',
              startedAt: new Date().toISOString(),
              postCount: 42,
              actors: [],
            },
            {
              topic: 'para-network',
              displayName: 'PARA Network',
              description: 'Civic social networking on AT Protocol',
              link: '/search?q=para-network',
              startedAt: new Date().toISOString(),
              postCount: 5000,
              actors: [],
            },
            {
              topic: 'atproto',
              displayName: 'AT Protocol',
              description: 'The underlying protocol',
              link: '/search?q=atproto',
              startedAt: new Date().toISOString(),
              postCount: 123,
              actors: [],
            },
            {
              topic: 'javascript',
              displayName: 'JavaScript',
              description: 'Language of the web',
              link: '/search?q=javascript',
              startedAt: new Date().toISOString(),
              postCount: 9999,
              actors: [],
            },
          ],
        }
      }
    },
    select: useCallback(
      (data: AppBskyUnspeccedGetTrends.OutputSchema) => {
        return {
          trends: (data.trends ?? []).filter(t => {
            return !hasMutedWord({
              mutedWords,
              text: t.topic + ' ' + t.displayName + ' ' + t.category,
            })
          }),
        }
      },
      [mutedWords],
    ),
  })
}
