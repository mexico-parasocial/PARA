import {type Client} from '@atproto/lex'

import {updateParaIdentity} from '#/lib/api/para-identity'
import {type ParaIdentityRecord} from '#/lib/api/para-lexicons'
import {isFlagOn} from '#/features/publicPassport/sections'
import {com} from '#/lexicons'

function fakeClient(stored: Partial<ParaIdentityRecord> | null) {
  const writes: Record<string, unknown>[] = []
  const client = {
    call: jest.fn((method: unknown, params: {record?: unknown}) => {
      if (method === com.atproto.repo.getRecord) {
        if (!stored) return Promise.reject(new Error('RecordNotFound'))
        return Promise.resolve({value: stored})
      }
      writes.push(params.record as Record<string, unknown>)
      return Promise.resolve({})
    }),
  }
  return {client: client as unknown as Client, writes}
}

describe('updateParaIdentity', () => {
  it('keeps flags the patch does not mention', async () => {
    const {client, writes} = fakeClient({
      createdAt: '2026-10-01T00:00:00.000Z',
      isVerifiedPublicFigure: false,
      publicVotes: true,
      publicPolicies: true,
      party: 'morena',
    })
    await updateParaIdentity(client, 'did:plc:me', {publicRaq: true})
    expect(writes[0]).toMatchObject({
      createdAt: '2026-10-01T00:00:00.000Z',
      publicVotes: true,
      publicPolicies: true,
      publicRaq: true,
      party: 'morena',
    })
  })

  it('creates a record when none exists', async () => {
    const {client, writes} = fakeClient(null)
    await updateParaIdentity(client, 'did:plc:me', {publicQuestions: true})
    expect(writes[0]).toMatchObject({
      isVerifiedPublicFigure: false,
      publicQuestions: true,
    })
  })
})

describe('isFlagOn', () => {
  const base = {createdAt: 'x', isVerifiedPublicFigure: false}

  it('defaults to off', () => {
    expect(isFlagOn(null, 'publicPolicies')).toBe(false)
    expect(isFlagOn(base, 'publicPolicies')).toBe(false)
  })

  it('reads the stored flag', () => {
    expect(isFlagOn({...base, publicPolicies: true}, 'publicPolicies')).toBe(
      true,
    )
  })

  it('forces votes, RAQ and highlights on for public figures only', () => {
    const figure = {...base, isVerifiedPublicFigure: true}
    expect(isFlagOn(figure, 'publicVotes')).toBe(true)
    expect(isFlagOn(figure, 'publicRaq')).toBe(true)
    expect(isFlagOn(figure, 'publicHighlights')).toBe(true)
    expect(isFlagOn(figure, 'publicQuestions')).toBe(false)
  })
})
