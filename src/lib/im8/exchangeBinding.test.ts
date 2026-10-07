import * as Crypto from 'expo-crypto'

import {createM8ExchangeBinding} from './exchangeBinding'

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {SHA256: 'SHA-256'},
  CryptoEncoding: {BASE64: 'base64'},
}))
it('uses S256 and URL-safe unpadded encoding for the standard PKCE vector', async () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  ;(Crypto.randomUUID as jest.Mock)
    .mockReturnValueOnce(verifier.slice(0, 20))
    .mockReturnValueOnce(verifier.slice(20))
  ;(Crypto.digestStringAsync as jest.Mock).mockResolvedValueOnce(
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw+cM=',
  )
  await expect(createM8ExchangeBinding()).resolves.toEqual({
    verifier,
    challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  })
  expect(Crypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', verifier, {
    encoding: 'base64',
  })
})
