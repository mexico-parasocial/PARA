import {createElement, type PropsWithChildren} from 'react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {act, renderHook, waitFor} from '@testing-library/react-native'

import {bridgeCallWithProof} from '#/lib/matrix/proofs'
import {useMatrixIdentityQuery, useMatrixTokenQuery} from './matrix'

let mockDid: string | undefined = 'did:plc:moderator'
jest.mock('#/state/session', () => ({
  useSession: () => ({currentAccount: mockDid ? {did: mockDid} : undefined}),
}))
jest.mock('#/lib/matrix/bridge', () => ({matrixBridgeFetch: jest.fn()}))
jest.mock('#/logger', () => ({logger: {warn: jest.fn()}}))
jest.mock('#/lib/matrix/proofs', () => ({
  BRIDGE_AUDIENCES: {session: 'session', identity: 'identity'},
  bridgeCallWithProof: jest.fn(),
  MatrixProofUnavailableError: class extends Error {},
}))

it('isolates Matrix tokens and identities when switching accounts on one installation', async () => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}})
  const proof = jest.mocked(bridgeCallWithProof)
  proof.mockImplementation(async () => ({
    userId: mockDid,
    accessToken: mockDid,
  }))
  const wrapper = ({children}: PropsWithChildren) =>
    createElement(QueryClientProvider, {client}, children)
  const {result, rerender, unmount} = renderHook(
    () => ({
      token: useMatrixTokenQuery({deviceId: 'same-install'}),
      identity: useMatrixIdentityQuery(),
    }),
    {wrapper},
  )
  await waitFor(() => expect(result.current.token.data?.userId).toBe(mockDid))
  await waitFor(() =>
    expect(result.current.identity.data?.userId).toBe(mockDid),
  )

  mockDid = 'did:plc:member'
  proof.mockImplementation(() => new Promise(() => {}))
  act(() => rerender(undefined))
  expect(result.current.token.data).toBeUndefined()
  expect(result.current.identity.data).toBeUndefined()

  mockDid = undefined
  act(() => rerender(undefined))
  expect(result.current.token.data).toBeUndefined()
  expect(result.current.identity.data).toBeUndefined()
  unmount()
  client.clear()
})
