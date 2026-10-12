import {createElement} from 'react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {act, renderHook, waitFor} from '@testing-library/react-native'

import {
  type CabildeoServiceAgent,
  fetchCabildeosWithCoverage,
} from '#/lib/api/cabildeo'
import {type CabildeoView} from '#/lib/cabildeo-client'
import {useAgent} from '#/state/session'
import {
  fetchMapCivicData,
  mapCabildeosQueryKey,
  useMapCabildeosQuery,
} from '../map-cabildeos'

jest.mock('#/lib/api/cabildeo', () => ({fetchCabildeosWithCoverage: jest.fn()}))
jest.mock('#/lib/mock-data/cabildeos', () => ({
  MOCK_CABILDEO_VIEWS: [{uri: 'demo'}],
}))
jest.mock('#/lib/services/config', () => ({USE_MOCK_DATA: true}))
jest.mock('#/state/queries/cabildeo', () => ({
  cabildeosQueryKey: ['cabildeo', 'list'],
}))
jest.mock('#/state/session', () => ({useAgent: jest.fn()}))
jest.mock('#/state/queries', () => ({STALE: {MINUTES: {ONE: 60_000}}}))

const agent = {} as CabildeoServiceAgent
const fetchRead = jest.mocked(fetchCabildeosWithCoverage)

beforeEach(() => jest.clearAllMocks())

it('keeps a real empty result empty in a release build', async () => {
  fetchRead.mockResolvedValue({cabildeos: [], hasMore: false})
  expect(await fetchMapCivicData(agent, false)).toEqual({
    items: [],
    source: 'appview',
    hasMore: false,
  })
})

it('propagates outages in a release build instead of claiming zero', async () => {
  const error = new Error('offline')
  fetchRead.mockRejectedValue(error)
  await expect(fetchMapCivicData(agent, false)).rejects.toBe(error)
})

it.each(['empty', 'unavailable'] as const)(
  'labels the %s demo fallback',
  async reason => {
    if (reason === 'empty')
      fetchRead.mockResolvedValue({cabildeos: [], hasMore: false})
    else fetchRead.mockRejectedValue(new Error('offline'))
    expect(await fetchMapCivicData(agent, true)).toEqual({
      items: [{uri: 'demo'}],
      source: 'demo',
      hasMore: false,
      demoReason: reason,
    })
  },
)

it('retains incomplete coverage without replacing it with demo records', async () => {
  fetchRead.mockResolvedValue({cabildeos: [], hasMore: true})
  expect(await fetchMapCivicData(agent, true)).toEqual({
    items: [],
    source: 'appview',
    hasMore: true,
  })
})

it('partitions viewer-dependent results and preserves the invalidation prefix', () => {
  expect(mapCabildeosQueryKey('did:plc:alice')).not.toEqual(
    mapCabildeosQueryKey('did:plc:bob'),
  )
  expect(mapCabildeosQueryKey(undefined)).not.toEqual(
    mapCabildeosQueryKey('did:plc:alice'),
  )
  expect(mapCabildeosQueryKey(undefined).slice(0, 2)).toEqual([
    'cabildeo',
    'list',
  ])
})

function hookWrapper(client: QueryClient) {
  return ({children}: {children: React.ReactNode}) =>
    createElement(QueryClientProvider, {client}, children)
}

it('never carries the previous viewer records across an account switch', async () => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}})
  const aliceItems = [{uri: 'alice-visible-record'}] as CabildeoView[]
  client.setQueryData(mapCabildeosQueryKey('did:plc:alice'), {
    items: aliceItems,
    source: 'appview',
    hasMore: false,
  })
  jest
    .mocked(useAgent)
    .mockReturnValue({session: {did: 'did:plc:alice'}} as unknown as ReturnType<
      typeof useAgent
    >)
  fetchRead.mockResolvedValue({cabildeos: [], hasMore: false})
  const {result, rerender, unmount} = renderHook(useMapCabildeosQuery, {
    wrapper: hookWrapper(client),
  })
  expect(result.current.data).toEqual(aliceItems)
  jest
    .mocked(useAgent)
    .mockReturnValue({session: {did: 'did:plc:bob'}} as unknown as ReturnType<
      typeof useAgent
    >)
  rerender({})
  expect(result.current.data).toBeUndefined()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).not.toEqual(aliceItems)
  unmount()
  client.clear()
})

it('retains real cached data on an outage even when demo fallback is allowed', async () => {
  const client = new QueryClient({defaultOptions: {queries: {retryDelay: 0}}})
  const items = [{uri: 'real-record'}] as CabildeoView[]
  client.setQueryData(mapCabildeosQueryKey('did:plc:alice'), {
    items,
    source: 'appview',
    hasMore: false,
  })
  jest
    .mocked(useAgent)
    .mockReturnValue({session: {did: 'did:plc:alice'}} as unknown as ReturnType<
      typeof useAgent
    >)
  fetchRead.mockRejectedValue(new Error('offline'))
  const {result, unmount} = renderHook(useMapCabildeosQuery, {
    wrapper: hookWrapper(client),
  })
  await act(async () => {
    await result.current.refetch()
  })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.data).toEqual(items)
  expect(result.current.provenance?.source).toBe('appview')
  unmount()
  client.clear()
})
