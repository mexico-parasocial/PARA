import {clear, createStore, del, get, set} from 'idb-keyval'

import {type DB} from '#/storage/archive/db/types'

export function create({id}: {id: string}): DB {
  const store = createStore(id, id)

  return {
    get(key: string): Promise<string | undefined> {
      return get(key, store) ?? undefined
    },
    set(key: string, value: string): Promise<void> {
      return set(key, value, store)
    },
    delete(key: string): Promise<void> {
      return del(key, store)
    },
    clear(): Promise<void> {
      return clear(store)
    },
  }
}
