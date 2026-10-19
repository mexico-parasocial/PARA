import {type CabildeoView} from '#/lib/cabildeo-client'
import {normalizeMexicoStateName} from '#/lib/constants/mexico'
import {USE_MOCK_DATA} from '#/lib/services/config'
import {type MapCivicQuery} from '#/state/queries/map-cabildeos'

// These local reference facts have no verified source/vintage yet. Never show
// seeded officeholders or political indicators as real release data.
export const SHOW_MAP_PREVIEW_FACTS = USE_MOCK_DATA

export type MapPlace =
  | {type: 'state'; stateName: string}
  | {type: 'city'; stateName: string; cityName: string}
  | {type: 'district'; districtKey: string}

export function cabildeosForMapPlace(items: CabildeoView[], place: MapPlace) {
  return items.filter(item => {
    if (place.type === 'district') {
      const legacy = (item as {districtKeys?: string[]}).districtKeys
      return (
        item.districtKey === place.districtKey ||
        Boolean(legacy?.includes(place.districtKey))
      )
    }
    const sameState =
      normalizeMexicoStateName(item.region || '') ===
      normalizeMexicoStateName(place.stateName)
    if (place.type === 'state') return sameState
    return (
      sameState &&
      normalizePlaceName(item.city || '') === normalizePlaceName(place.cityName)
    )
  })
}

function normalizePlaceName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

/** A missing read is unknown; a partial read is a lower bound, never a total. */
export function mapCivicCount(query: MapCivicQuery, count: number): string {
  if (!query.data) return '—'
  return `${query.provenance?.hasMore && count > 0 ? '≥' : ''}${count}`
}
