import {exchangeCodeFromReturnUrl, M8_OAUTH_RETURN_URL} from '#/lib/im8/api'

describe('exchangeCodeFromReturnUrl', () => {
  const code = 'a'.repeat(43)

  it('reads the exchange code m8 appends to the return URL', () => {
    expect(
      exchangeCodeFromReturnUrl(`${M8_OAUTH_RETURN_URL}?exchange_code=${code}`),
    ).toBe(code)
  })

  it('ignores a fragment after the query', () => {
    expect(
      exchangeCodeFromReturnUrl(
        `${M8_OAUTH_RETURN_URL}?exchange_code=${code}#_=_`,
      ),
    ).toBe(code)
  })

  it('returns null without a plausible code', () => {
    expect(exchangeCodeFromReturnUrl(M8_OAUTH_RETURN_URL)).toBeNull()
    expect(
      exchangeCodeFromReturnUrl(`${M8_OAUTH_RETURN_URL}?exchange_code=short`),
    ).toBeNull()
    expect(
      exchangeCodeFromReturnUrl(`${M8_OAUTH_RETURN_URL}?error=access_denied`),
    ).toBeNull()
  })
})
