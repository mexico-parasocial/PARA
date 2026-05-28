import {useCallback} from 'react'
import {type EmojiMartData} from '@emoji-mart/data'

import {getEmojis} from './getEmojis'

let cache: Promise<EmojiMartData> | undefined

export function useGetEmojis() {
  return useCallback(() => {
    cache ??= getEmojis()
    return cache
  }, [])
}
