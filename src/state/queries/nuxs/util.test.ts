import {type AppBskyActorDefs} from '@atproto/api'

jest.mock('#/state/queries/nuxs/definitions', () => {
  const actual = jest.requireActual('#/state/queries/nuxs/definitions')
  const zod = jest.requireActual('zod')
  return {
    ...actual,
    // give one nux a schema so the `data` parsing path is exercised
    NuxSchemas: {
      ...actual.NuxSchemas,
      [actual.Nux.NeueTypography]: zod.object({completed: zod.boolean()}),
    },
  }
})

import {Nux} from '#/state/queries/nuxs/definitions'
import {parseAppNux} from '#/state/queries/nuxs/util'

function makeNux(data?: string): AppBskyActorDefs.Nux {
  return {
    id: Nux.NeueTypography,
    completed: true,
    ...(data !== undefined ? {data} : {}),
  }
}

describe('parseAppNux', () => {
  it('parses valid JSON data passing the nux schema', () => {
    const result = parseAppNux(makeNux(JSON.stringify({completed: true})))
    expect(result).toEqual({
      id: Nux.NeueTypography,
      completed: true,
      data: {completed: true},
    })
  })

  it('returns undefined for malformed JSON data instead of throwing', () => {
    expect(() => parseAppNux(makeNux('{not json'))).not.toThrow()
    expect(parseAppNux(makeNux('{not json'))).toBeUndefined()
  })

  it('returns undefined for valid JSON that fails the nux schema', () => {
    const result = parseAppNux(makeNux(JSON.stringify({completed: 'yes'})))
    expect(result).toBeUndefined()
  })

  it('strips data for nuxes without a schema', () => {
    const result = parseAppNux({
      id: Nux.ExploreInterestsCard,
      completed: true,
      data: JSON.stringify({anything: true}),
    })
    expect(result).toEqual({
      id: Nux.ExploreInterestsCard,
      completed: true,
      data: undefined,
    })
  })

  it('returns undefined for unknown nux ids', () => {
    expect(parseAppNux({id: 'NotARealNux', completed: true})).toBeUndefined()
  })
})
