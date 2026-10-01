import {type PropsWithChildren} from 'react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {act, renderHook, waitFor} from '@testing-library/react-native'

import {
  useSubmitProposedQuestionMutation,
  useVoteOnProposedQuestionMutation,
} from '#/state/mutations/raq'
import {useAgent} from '#/state/session'
import {
  PROPOSED_QUESTIONS_QUERY_KEY,
  useProposedQuestions,
} from '../useProposedQuestions'

jest.mock('#/state/session', () => ({useAgent: jest.fn()}))

function setup(call: jest.Mock, did = 'did:plc:viewer') {
  jest.mocked(useAgent).mockReturnValue({
    session: {did},
    appviewClient: {call},
    pdsClient: {call},
  } as never)
  const client = new QueryClient({
    defaultOptions: {
      queries: {gcTime: Infinity, retry: false},
      mutations: {gcTime: Infinity},
    },
  })
  const wrapper = ({children}: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return {client, wrapper}
}

const proposal = {
  uri: 'at://did:plc:alice/com.para.raq.proposal/one',
  creator: 'did:plc:alice',
  text: 'Question',
  targetAxis: 'eco_coord',
  upvotes: 3,
  downvotes: 1,
  viewerUpvote: true,
}

it('loads subsequent pages and sends the selected community on every request', async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce({proposals: [proposal], cursor: 'next'})
    .mockResolvedValueOnce({
      proposals: [{...proposal, uri: 'second'}],
      cursor: '',
    })
  const {wrapper} = setup(call)
  const hook = renderHook(() => useProposedQuestions('community-uri'), {
    wrapper,
  })
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
  expect(hook.result.current.data?.[0]).toMatchObject({
    creator: 'did:plc:alice',
    targetAxis: 'eco_coord',
    viewerHasUpvoted: true,
  })
  await act(async () => {
    await hook.result.current.fetchNextPage()
  })
  expect(hook.result.current.data).toHaveLength(2)
  expect(hook.result.current.hasNextPage).toBe(false)
  expect(call.mock.calls[1][1]).toMatchObject({
    community: 'community-uri',
    cursor: 'next',
  })
  hook.unmount()
})

it('invalidates all live community lists as well as the legacy proposal cache on creation', async () => {
  const {wrapper, client} = setup(jest.fn().mockResolvedValue({}))
  const mainKey = [...PROPOSED_QUESTIONS_QUERY_KEY, 'did:plc:viewer', undefined]
  const communityKey = [
    ...PROPOSED_QUESTIONS_QUERY_KEY,
    'did:plc:viewer',
    'community-uri',
  ]
  const legacyKey = ['raq', 'proposed-questions', 'did:plc:viewer']
  for (const key of [mainKey, communityKey, legacyKey])
    client.setQueryData(key, [])
  const hook = renderHook(() => useSubmitProposedQuestionMutation(), {wrapper})
  await act(async () => {
    await hook.result.current.mutateAsync({text: 'New proposal'})
  })
  for (const key of [mainKey, communityKey, legacyKey])
    expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  hook.unmount()
})

it('can undo a proposal reaction through the shared mutation', async () => {
  const call = jest.fn().mockResolvedValue({})
  const {wrapper} = setup(call)
  const hook = renderHook(() => useVoteOnProposedQuestionMutation(), {wrapper})
  await act(async () => {
    await hook.result.current.mutateAsync({
      uri: proposal.uri,
      direction: 'none',
    })
  })
  expect(call.mock.calls[0][1].record.value).toBe(0)
  hook.unmount()
})

it('refreshes from the first page without trimming another community cache', async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce({proposals: [proposal], cursor: 'next'})
    .mockResolvedValueOnce({proposals: [{...proposal, uri: 'second'}]})
    .mockResolvedValueOnce({proposals: [{...proposal, uri: 'fresh'}]})
  const {wrapper, client} = setup(call)
  const otherKey = [
    ...PROPOSED_QUESTIONS_QUERY_KEY,
    'did:plc:viewer',
    'other-community',
  ]
  client.setQueryData(otherKey, {
    pages: [{questions: []}, {questions: []}],
    pageParams: [undefined, 'other'],
  })
  const hook = renderHook(() => useProposedQuestions('community-uri'), {
    wrapper,
  })
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
  await act(async () => {
    await hook.result.current.fetchNextPage()
  })
  await act(async () => {
    await hook.result.current.refresh()
  })
  expect(hook.result.current.data?.map(p => p.id)).toEqual(['fresh'])
  expect(call.mock.calls[2][1]).toMatchObject({
    community: 'community-uri',
    cursor: undefined,
  })
  expect(client.getQueryData<{pages: unknown[]}>(otherKey)?.pages).toHaveLength(
    2,
  )
  hook.unmount()
})

it('keeps one viewer’s reaction state out of another viewer’s cache', async () => {
  const call = jest.fn().mockResolvedValue({proposals: [proposal]})
  const {wrapper, client} = setup(call)
  const hook = renderHook(() => useProposedQuestions(), {wrapper})
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
  jest
    .mocked(useAgent)
    .mockReturnValue({
      session: {did: 'did:plc:other'},
      appviewClient: {call},
    } as never)
  call.mockResolvedValue({proposals: [{...proposal, viewerUpvote: false}]})
  hook.rerender({})
  expect(hook.result.current.data).toBeUndefined()
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
  expect(hook.result.current.data?.[0].viewerHasUpvoted).toBe(false)
  expect(
    client.getQueryData([
      ...PROPOSED_QUESTIONS_QUERY_KEY,
      'did:plc:viewer',
      undefined,
    ]),
  ).toBeDefined()
  hook.unmount()
})
