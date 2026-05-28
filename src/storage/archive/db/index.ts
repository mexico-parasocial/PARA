import {MMKV} from '@bsky.app/react-native-mmkv'

import {type DB} from '#/storage/archive/db/types'

export function create({id}: {id: string}): DB {
  const store = new MMKV({id})

  return {
    get(key: string): string | undefined {
      return store.getString(key)
    },
    set(key: string, value: string): void {
      store.set(key, value)
    },
    delete(key: string): void {
      store.delete(key)
    },
    clear(): void {
      store.clearAll()
    },
  }
}
