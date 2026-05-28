import {useCallback} from 'react'
import {type Emoji} from '@emoji-mart/data'
import Fuse from 'fuse.js'

import {useGetEmojis} from '#/lib/useGetEmojis'
import {type AutocompleteEmoji} from '#/components/Autocomplete/types'

let emojiFuseInstance: Fuse<Emoji> | null = null

export function useEmojiSearch() {
  const getEmojis = useGetEmojis()

  return useCallback(
    async (query: string, limit: number = 8): Promise<AutocompleteEmoji[]> => {
      if (!emojiFuseInstance) {
        const data = await getEmojis()
        emojiFuseInstance = new Fuse(Object.values(data.emojis), {
          keys: ['search'],
          threshold: 0.3,
        })
      }

      const results = emojiFuseInstance.search(query, {limit})
      return results.map(result => ({
        key: result.item.id,
        type: 'emoji' as const,
        value: result.item.skins[0].native,
        emoji: result.item,
      }))
    },
    [getEmojis],
  )
}
