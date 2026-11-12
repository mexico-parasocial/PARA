import {describe, expect, it, jest} from '@jest/globals'

import {com} from '#/lexicons'
import {
  communityAct,
  communityDid,
  communitySlug,
  isCommunityUri,
} from '../community-act'

describe('community account URIs', () => {
  const uri = 'at://did:plc:abc123/com.para.community.profile/self'

  it('reads the community DID from its profile record', () => {
    expect(isCommunityUri(uri)).toBe(true)
    expect(communityDid(uri)).toBe('did:plc:abc123')
  })

  it('refuses anything that is not a community profile', () => {
    for (const value of [
      undefined,
      '',
      'agua-limpia',
      'at://did:plc:abc123/com.para.community.board/3kxyz',
      'at://did:plc:abc123/com.para.community.profile/other',
    ]) {
      expect(isCommunityUri(value)).toBe(false)
      expect(() => communityDid(value)).toThrow()
    }
  })
})

it('sends community actions to the signed-in account’s PDS', async () => {
  const call = jest.fn()
  const appviewCall = jest.fn()
  const agent = {
    pdsClient: {call},
    appviewClient: {call: appviewCall},
  } as unknown as Parameters<typeof communityAct>[0]

  await communityAct(
    agent,
    'at://did:plc:abc123/com.para.community.profile/self',
    {action: 'member.join'},
  )

  expect(call).toHaveBeenCalledWith(com.para.community.act, {
    action: 'member.join',
    community: 'did:plc:abc123',
  })
  expect(appviewCall).not.toHaveBeenCalled()
})

describe('communitySlug', () => {
  it('makes a handle slug from a name', () => {
    expect(communitySlug('Agua Limpia')).toBe('agua-limpia')
    expect(communitySlug('  Movilidad  Sostenible — Norte! ')).toBe(
      'movilidad-sostenible-norte',
    )
    expect(communitySlug('Ñandú Año 2026')).toBe('nandu-ano-2026')
  })

  it('keeps to forty characters without a trailing hyphen', () => {
    const slug = communitySlug(`${'a'.repeat(39)} bcd`)
    expect(slug).toBe('a'.repeat(39))
  })

  it('returns null when nothing usable is left', () => {
    expect(communitySlug('¡¿?!')).toBeNull()
    expect(communitySlug('ab')).toBeNull()
  })
})
