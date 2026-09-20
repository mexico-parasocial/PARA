import {
  chatErrorCode,
  connectionErrorCopy,
  sendErrorCopy,
} from '#/features/encryptedChat/errors'

describe('chatErrorCode', () => {
  it('passes through the adapter’s own codes', () => {
    for (const code of [
      'CHAT_LOGIN_REQUIRED',
      'CHAT_LOGIN_CANCELLED',
      'ENCRYPTED_ROOM_REQUIRED',
      'CHAT_SESSION_MISMATCH',
      'CHAT_ALREADY_OPEN',
      'CHAT_ENGINE_NOT_NATIVE',
      'INVALID_MESSAGE',
    ]) {
      expect(chatErrorCode(new Error(code))).toBe(code)
    }
  })

  it('does not leak SDK error text to the UI', () => {
    // Rust SDK and filesystem errors can name internal paths, store ids and
    // user ids. None of that belongs on screen.
    const leaky = [
      new Error(
        'failed to open sqlite store at /var/mobile/.../matrix-lab/9f3a: disk I/O error',
      ),
      new Error('M_FORBIDDEN: @alice:matrix.para.social is not in the room'),
      new Error('Network request failed'),
      new Error(''),
    ]
    for (const err of leaky) {
      expect(chatErrorCode(err)).toBe('CHAT_UNAVAILABLE')
    }
  })

  it('handles values that are not Errors at all', () => {
    for (const thrown of [undefined, null, 'CHAT_CLOSED', {code: 'nope'}, 42]) {
      expect(chatErrorCode(thrown)).toBe('CHAT_UNAVAILABLE')
    }
  })

  it('rejects codes outside the expected shape', () => {
    // Lowercase, spaces or excessive length mean it is prose, not a code.
    expect(chatErrorCode(new Error('chat_closed'))).toBe('CHAT_UNAVAILABLE')
    expect(chatErrorCode(new Error('CHAT CLOSED'))).toBe('CHAT_UNAVAILABLE')
    expect(chatErrorCode(new Error('A'.repeat(41)))).toBe('CHAT_UNAVAILABLE')
  })
})

describe('error copy', () => {
  it('explains the fail-closed case rather than blaming the network', () => {
    const copy = connectionErrorCopy('ENCRYPTED_ROOM_REQUIRED')
    expect(copy).toContain('cifrada')
    expect(copy).not.toBe(connectionErrorCopy(undefined))
  })

  it('always returns something for an unknown code', () => {
    expect(connectionErrorCopy('SOMETHING_NEW')).toBe(
      connectionErrorCopy(undefined),
    )
    expect(sendErrorCopy('SOMETHING_NEW').length).toBeGreaterThan(0)
  })

  it('distinguishes a rejected send from a closed connection', () => {
    expect(sendErrorCopy('INVALID_MESSAGE')).not.toBe(
      sendErrorCopy('CHAT_CLOSED'),
    )
  })
})
