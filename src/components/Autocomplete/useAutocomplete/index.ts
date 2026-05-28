import {useCallback} from 'react'
import {moderateProfile, type ModerationOpts} from '@atproto/api'
import {keepPreviousData, useQuery} from '@tanstack/react-query'

import {isJustAMute, moduiContainsHideableOffense} from '#/lib/moderation'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {STALE} from '#/state/queries'
import {DEFAULT_LOGGED_OUT_PREFERENCES} from '#/state/queries/preferences'
import {useAgent} from '#/state/session'
import {
  type AutocompleteApi,
  type AutocompleteItem,
  type AutocompleteItemType,
  type AutocompleteProfile,
} from '#/components/Autocomplete/types'
import {useEmojiSearch} from './useEmojiSearch'

const DEFAULT_MOD_OPTS = {
  userDid: undefined,
  prefs: DEFAULT_LOGGED_OUT_PREFERENCES.moderationPrefs,
}

export function useAutocomplete({
  type,
  query: q,
  limit,
}: {
  type: AutocompleteItemType
  query: string
  limit?: number
}): AutocompleteApi {
  const agent = useAgent()
  const moderationOpts = useModerationOpts()
  const emojiSearch = useEmojiSearch()

  const query = useQuery({
    staleTime: STALE.MINUTES.ONE,
    queryKey: [
      'autocomplete',
      {
        type,
        query: q,
      },
    ],
    async queryFn() {
      if (type === 'profile') {
        if (!q) return []

        const normalized = q.toLowerCase().trim().replace(/\.$/, '')
        const res = await agent.searchActorsTypeahead({
          q: normalized,
          limit: limit || 8,
        })

        return (res?.data.actors || []).map(profile => ({
          key: profile.did,
          type: 'profile' as const,
          value: '@' + profile.handle,
          profile,
        }))
      } else if (type === 'emoji') {
        return emojiSearch(q, limit || 8)
      }

      return []
    },
    select: useCallback(
      (items: AutocompleteItem[]) => {
        const seen = new Set<string>()
        const results: AutocompleteItem[] = []

        for (const item of items) {
          if (seen.has(item.key)) continue
          seen.add(item.key)

          if (item.type === 'profile') {
            const moderated = moderateProfileItem({
              query: q,
              item,
              moderationOpts: moderationOpts || DEFAULT_MOD_OPTS,
            })
            if (moderated) results.push(moderated)
          } else {
            results.push(item)
          }
        }

        return results
      },
      [q, moderationOpts],
    ),
    placeholderData: keepPreviousData,
  })

  return {
    query: q,
    items: query.data || [],
  }
}

function moderateProfileItem({
  query,
  item,
  moderationOpts,
}: {
  query: string
  item: AutocompleteProfile
  moderationOpts: ModerationOpts
}) {
  const modui = moderateProfile(item.profile, moderationOpts).ui('profileList')
  const isExactMatch = query && item.profile.handle.toLowerCase() === query

  if (
    (isExactMatch && !moduiContainsHideableOffense(modui)) ||
    !modui.filter ||
    isJustAMute(modui)
  ) {
    return item
  }

  return null
}
