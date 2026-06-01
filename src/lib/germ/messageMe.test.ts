import {describe, expect, it} from '@jest/globals'

import {
  buildAnonymousGermContactButton,
  buildGermProfileMessageButton,
} from '#/lib/germ/messageMe'

describe('buildGermProfileMessageButton', () => {
  it('completes the Germ fragment with profile DID and viewer DID', () => {
    const button = buildGermProfileMessageButton({
      declaration: {
        messageMe: {
          messageMeUrl: 'https://germ.example/message#',
          showButtonTo: 'everyone',
        },
      },
      profileDid: 'did:plc:profile',
      viewerDid: 'did:plc:viewer',
    })

    expect(button?.url).toBe(
      'https://germ.example/message#did:plc:profile+did:plc:viewer',
    )
  })

  it('does not build a button when Germ visibility is none', () => {
    const button = buildGermProfileMessageButton({
      declaration: {
        messageMe: {
          messageMeUrl: 'https://germ.example/message#',
          showButtonTo: 'none',
        },
      },
      profileDid: 'did:plc:profile',
      viewerDid: 'did:plc:viewer',
    })

    expect(button).toBeNull()
  })

  it('does not build a followers-only button when the viewer is not allowed', () => {
    const button = buildGermProfileMessageButton({
      declaration: {
        messageMe: {
          messageMeUrl: 'https://germ.example/message#',
          showButtonTo: 'usersIFollow',
        },
      },
      profileDid: 'did:plc:profile',
      viewerDid: 'did:plc:viewer',
      viewerFollowsProfile: false,
    })

    expect(button).toBeNull()
  })
})

describe('buildAnonymousGermContactButton', () => {
  it('does not build private contact for isolated posts with dmPolicy off', () => {
    const button = buildAnonymousGermContactButton({dmEnabled: false})

    expect(button).toBeNull()
  })

  it('uses the opaque Germ contact URL when private replies are enabled', () => {
    const button = buildAnonymousGermContactButton({
      dmEnabled: true,
      provider: 'germ',
      label: 'Private reply via Germ DM',
      contactUrl: 'https://landing.ger.mx/card/opaque',
    })

    expect(button).toEqual({
      label: 'Message on Germ',
      provider: 'germ',
      url: 'https://landing.ger.mx/card/opaque',
    })
  })
})
