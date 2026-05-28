import {describe, expect, it} from '@jest/globals'

import {formatUserDisplayName} from '#/lib/strings/profile-names'

describe('formatUserDisplayName', () => {
  it('prefixes individual profiles with i/', () => {
    expect(
      formatUserDisplayName({
        displayName: 'Alice',
        handle: 'alice.test',
        isFigure: false,
      }),
    ).toBe('i/Alice')
  })

  it('prefixes figure profiles with f/', () => {
    expect(
      formatUserDisplayName({
        displayName: 'Mayor Garcia',
        handle: 'garcia.test',
        isFigure: true,
      }),
    ).toBe('f/Mayor Garcia')
  })

  it('prefixes geographic group profiles with g/', () => {
    expect(
      formatUserDisplayName({
        displayName: 'Jalisco',
        handle: 'jalisco.test',
        isFigure: false,
        isGroup: true,
      }),
    ).toBe('g/Jalisco')
  })

  it('falls back to the sanitized handle when there is no display name', () => {
    expect(
      formatUserDisplayName({
        handle: 'alice.test',
        isFigure: false,
      }),
    ).toBe('i/alice.test')
  })

  it('prefixes anonymous profiles with a/ and takes precedence over figure', () => {
    expect(
      formatUserDisplayName({
        displayName: 'Ciudadano #A7B2',
        handle: 'alice.test',
        isFigure: true,
        isAnonymous: true,
      }),
    ).toBe('a/Ciudadano #A7B2')
  })
})
