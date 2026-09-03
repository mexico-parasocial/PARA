import {isAppPassword} from '#/lib/jwt'

function makeJwt(payload: object) {
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')
  return `${encode({alg: 'HS256', typ: 'JWT'})}.${encode(payload)}.sig`
}

describe('isAppPassword', () => {
  it('returns true for an app-password scoped token', () => {
    const token = makeJwt({scope: 'com.atproto.appPass'})
    expect(isAppPassword(token)).toBe(true)
  })

  it('returns false for a full-access token', () => {
    const token = makeJwt({scope: 'com.atproto.access'})
    expect(isAppPassword(token)).toBe(false)
  })

  it('returns false for a privileged app-password token', () => {
    const token = makeJwt({scope: 'com.atproto.appPassPrivileged'})
    expect(isAppPassword(token)).toBe(false)
  })

  it('returns false for an empty token instead of throwing', () => {
    expect(() => isAppPassword('')).not.toThrow()
    expect(isAppPassword('')).toBe(false)
  })

  it('returns false for a malformed token instead of throwing', () => {
    expect(() => isAppPassword('not-a-jwt')).not.toThrow()
    expect(isAppPassword('not-a-jwt')).toBe(false)
  })
})
