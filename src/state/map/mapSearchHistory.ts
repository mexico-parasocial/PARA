/**
 * MMKV-backed storage for the Map screen's recent search history.
 * Only search results are persisted (max 5). All other map state
 * (active layer, discourse filter, zoom, viewport) is intentionally ephemeral.
 */
import {MMKV} from '@bsky.app/react-native-mmkv'

import {type SearchResult} from '#/lib/constants/mapHelpers'

const store = new MMKV({id: 'para_map_search_history'})
const KEY = 'recent_results'
const MAX_ITEMS = 5

function parseStored(raw: string | undefined): SearchResult[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as SearchResult[]
  } catch {
    return []
  }
}

export function getMapSearchHistory(): SearchResult[] {
  return parseStored(store.getString(KEY))
}

export function setMapSearchHistory(items: SearchResult[]): void {
  store.set(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function addMapSearchHistoryItem(item: SearchResult): void {
  const current = getMapSearchHistory()
  const key = getSearchResultKey(item)
  const deduped = current.filter(i => getSearchResultKey(i) !== key)
  const next = [item, ...deduped].slice(0, MAX_ITEMS)
  setMapSearchHistory(next)
}

export function clearMapSearchHistory(): void {
  store.delete(KEY)
}

function getSearchResultKey(result: SearchResult): string {
  if (result.type === 'district') {
    return `district:${result.districtId || result.districtKey || result.name}`
  }
  return `${result.type}:${result.stateName}:${result.name}`
}
