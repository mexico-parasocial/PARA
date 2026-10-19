import {type CabildeoView} from '#/lib/cabildeo-client'
import {type MapCivicQuery} from '#/state/queries/map-cabildeos'
import {cabildeosForMapPlace, mapCivicCount} from '../mapData'

const items = [
  {uri: 'state', region: 'Jalisco'},
  {uri: 'district', region: 'Jalisco', districtKey: 'jalisco:3'},
  {uri: 'other-district', region: 'Jalisco', districtKey: 'jalisco:4'},
  {uri: 'city', region: 'Jalisco', city: 'Guadalajara'},
  {uri: 'same-name-other-state', region: 'Chiapas', city: 'Guadalajara'},
  {uri: 'legacy', districtKeys: ['jalisco:3']},
] as unknown as CabildeoView[]

it('does not assign statewide or neighboring-district content to a district', () => {
  expect(
    cabildeosForMapPlace(items, {
      type: 'district',
      districtKey: 'jalisco:3',
    }).map(item => item.uri),
  ).toEqual(['district', 'legacy'])
})

it('requires both explicit city and matching state', () => {
  expect(
    cabildeosForMapPlace(items, {
      type: 'city',
      cityName: ' GUADALAJÁRA ',
      stateName: 'Jalisco',
    }).map(item => item.uri),
  ).toEqual(['city'])
})

it('includes explicitly regional discussions in the state overview', () => {
  expect(
    cabildeosForMapPlace(items, {type: 'state', stateName: 'Jalisco'}).map(
      item => item.uri,
    ),
  ).toEqual(['state', 'district', 'other-district', 'city'])
})

it('displays unknown rather than zero before a successful read', () => {
  expect(mapCivicCount({data: undefined} as MapCivicQuery, 0)).toBe('—')
  expect(mapCivicCount({data: []} as unknown as MapCivicQuery, 0)).toBe('0')
})

it('shows positive partial counts as lower bounds', () => {
  const query = {data: items, provenance: {hasMore: true}} as MapCivicQuery
  expect(mapCivicCount(query, 3)).toBe('≥3')
  expect(mapCivicCount(query, 0)).toBe('0')
})
