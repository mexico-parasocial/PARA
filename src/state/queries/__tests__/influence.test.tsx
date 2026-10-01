import {type PropsWithChildren} from 'react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {act, renderHook, waitFor} from '@testing-library/react-native'

import {
  influenceQueryKey,
  useInfluenceQuery,
  useInfluenceVisibilityMutation,
} from '#/state/queries/influence'
import {useAgent, useSession} from '#/state/session'

jest.mock('#/state/session', () => ({
  useAgent: jest.fn(),
  useSession: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({useFocusEffect: jest.fn()}))

const did = 'did:plc:alice'
const response = {
  actor: did,
  influenceVisible: true,
  stats: {influence: -4, votesReceivedAllTime: -4, votesCastAllTime: 2},
}

function setup(call: jest.Mock, pdsCall = jest.fn()) {
  jest.mocked(useSession).mockReturnValue({currentAccount: {did}} as never)
  jest.mocked(useAgent).mockReturnValue({
    appviewClient: {call},
    pdsClient: {call: pdsCall},
  } as never)
  const client = new QueryClient({
    defaultOptions: {queries: {gcTime: Infinity, retry: false}},
  })
  const wrapper = ({children}: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return {client, wrapper}
}

beforeEach(() => jest.clearAllMocks())

it('reads real negative scores and separates owner and other viewer caches', async () => {
  const {client, wrapper} = setup(jest.fn().mockResolvedValue(response))
  const hook = renderHook(() => useInfluenceQuery(did), {wrapper})
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
  expect(hook.result.current.data?.stats.influence).toBe(-4)
  expect(client.getQueryData(influenceQueryKey(did, did))).toEqual(response)
  expect(
    client.getQueryData(influenceQueryKey(did, 'did:plc:bob')),
  ).toBeUndefined()
  hook.unmount()
  client.clear()
})

it('exposes errors instead of substituting a zero score', async () => {
  const {client, wrapper} = setup(
    jest.fn().mockRejectedValue(new Error('Offline')),
  )
  const hook = renderHook(() => useInfluenceQuery(did), {wrapper})
  await waitFor(() => expect(hook.result.current.isError).toBe(true))
  expect(hook.result.current.data).toBeUndefined()
  hook.unmount()
  client.clear()
})

it('persists visibility while preserving existing profile fields', async () => {
  const existing = {
    displayName: 'Alice',
    description: 'Profile',
    avatar: {ref: 'blob'},
  }
  const pdsCall = jest.fn(async (_method, updater) => {
    expect(updater(existing)).toEqual({...existing, revealInfluence: false})
  })
  const {client, wrapper} = setup(
    jest.fn().mockResolvedValue({...response, influenceVisible: false}),
    pdsCall,
  )
  client.setQueryData(influenceQueryKey(did, did), response)
  const hook = renderHook(() => useInfluenceVisibilityMutation(), {wrapper})
  await act(async () => {
    await hook.result.current.mutateAsync(false)
  })
  expect(pdsCall).toHaveBeenCalledTimes(1)
  expect(client.getQueryData(influenceQueryKey(did, did))).toMatchObject({
    influenceVisible: false,
    stats: {influence: -4},
  })
  hook.unmount()
  client.clear()
})

it('keeps the visibility preference when saving fails', async () => {
  const {client, wrapper} = setup(
    jest.fn(),
    jest.fn().mockRejectedValue(new Error('Offline')),
  )
  client.setQueryData(influenceQueryKey(did, did), response)
  const hook = renderHook(() => useInfluenceVisibilityMutation(), {wrapper})
  await act(async () => {
    await expect(hook.result.current.mutateAsync(false)).rejects.toThrow(
      'Offline',
    )
  })
  expect(client.getQueryData(influenceQueryKey(did, did))).toEqual(response)
  hook.unmount()
  client.clear()
})
