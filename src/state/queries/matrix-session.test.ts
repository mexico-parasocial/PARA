import {createElement, type PropsWithChildren} from 'react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {act, renderHook, waitFor} from '@testing-library/react-native'

import {canModerateChat} from '#/lib/chat/roles'
import {matrixBridgeFetch} from '#/lib/matrix/bridge'
import {bridgeCallWithProof} from '#/lib/matrix/proofs'
import {
  useChatBadgesQuery,
  useChatMemberListQuery,
  useMatrixIdentityQuery,
  useMatrixTokenQuery,
  useModerationDashboardQuery,
} from './matrix'

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

it('uses explicit verified roles and ignores cached participation-based permissions', async () => {
  mockDid = 'did:plc:member'
  const community = 'at://did:plc:owner/com.para.community.board/test'
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}})
  client.setQueryData(['chat-badges', mockDid, community, mockDid], {
    participation: {isModerator: true},
  })
  const fetch = jest.mocked(matrixBridgeFetch)
  fetch.mockImplementation(async path => {
    const body = path.startsWith('/api/chat-badges')
      ? {
          did: mockDid,
          communityUri: community,
          roles: ['member', 'owner'],
          visibleBadges: [],
          hiddenBadges: [],
        }
      : path.startsWith('/api/chat-member-list')
        ? {
            members: [{did: mockDid, roles: ['member', 'owner'], badges: []}],
            total: 1,
          }
        : {
            totalMembers: 1,
            reportedThisWeek: 0,
            sanctionedNow: 0,
            riskDistribution: {low: 1, warning: 0, critical: 0},
          }
    return {ok: true, json: async () => body} as Response
  })
  const wrapper = ({children}: PropsWithChildren) =>
    createElement(QueryClientProvider, {client}, children)
  const {result, unmount} = renderHook(
    () => ({
      badges: useChatBadgesQuery(mockDid, community),
      members: useChatMemberListQuery(community),
      dashboard: useModerationDashboardQuery(community, mockDid),
    }),
    {wrapper},
  )
  expect(canModerateChat(result.current.badges.data?.roles)).toBe(false)
  await waitFor(() =>
    expect(result.current.badges.data?.roles).toEqual(['member', 'owner']),
  )
  await waitFor(() =>
    expect(result.current.members.data?.members).toHaveLength(1),
  )
  await waitFor(() =>
    expect(result.current.dashboard.data?.totalMembers).toBe(1),
  )
  expect(canModerateChat(result.current.badges.data?.roles)).toBe(true)
  expect(result.current.badges.data).not.toHaveProperty('participation')
  expect(result.current.members.data?.members[0]).not.toHaveProperty(
    'participation',
  )
  expect(result.current.dashboard.data).not.toHaveProperty('activeToday')
  unmount()
  client.clear()
})
