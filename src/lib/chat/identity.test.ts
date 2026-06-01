import {describe, expect, it} from '@jest/globals'

import {
  type ChatIdentitySurface,
  getDefaultChatIdentityMode,
} from '#/lib/chat/identity'

describe('getDefaultChatIdentityMode', () => {
  for (const surface of [
    'matrix_community',
    'matrix_chamber',
    'matrix_assembly',
    'matrix_delegate',
  ] satisfies ChatIdentitySurface[]) {
    it(`uses the civic pseudonym for ${surface}`, () => {
      expect(getDefaultChatIdentityMode(surface)).toBe('civic_pseudonym')
    })
  }

  for (const surface of [
    'bsky_dm',
    'para_dm',
    'public_dm',
  ] satisfies ChatIdentitySurface[]) {
    it(`uses the public profile for ${surface}`, () => {
      expect(getDefaultChatIdentityMode(surface)).toBe('public_profile')
    })
  }

  for (const surface of [
    'isolated_post',
    'isolated_testimony',
    'anonymous_disclosure',
  ] satisfies ChatIdentitySurface[]) {
    it(`uses isolated anonymity for ${surface}`, () => {
      expect(getDefaultChatIdentityMode(surface)).toBe('isolated_anonymous')
    })
  }
})
