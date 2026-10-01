import {type PropsWithChildren} from 'react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {act, renderHook, waitFor} from '@testing-library/react-native'

import {useOpenQuestions} from '#/state/queries/useOpenQuestions'
import {useAgent} from '#/state/session'
import {app} from '#/lexicons'

jest.mock('#/state/session', () => ({useAgent: jest.fn()}))

function setup(call: jest.Mock) {
  jest.mocked(useAgent).mockReturnValue({appviewClient: {call}} as never)
  const client = new QueryClient({
    defaultOptions: {queries: {gcTime: Infinity, retry: false}},
  })
  const wrapper = ({children}: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useOpenQuestions(), {wrapper})
}

beforeEach(() => jest.clearAllMocks())

describe('open questions search', () => {
  it('uses the compatibility endpoint with latest ordering and cancellation', async () => {
    const posts = [{uri: 'at://did:plc:alice/app.bsky.feed.post/question'}]
    // A deployment that rejects v2 still supports this search.
    const call = jest.fn().mockImplementation(endpoint => {
      if (endpoint === app.bsky.feed.searchPostsV2) {
        return Promise.reject(new Error('Search v2 is not enabled'))
      }
      return Promise.resolve({posts})
    })
    const hook = setup(call)

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))

    expect(hook.result.current.data).toEqual(posts)
    expect(call).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledWith(
      app.bsky.feed.searchPosts,
      {q: '|#?OpenQuestion', limit: 50, sort: 'latest'},
      {signal: expect.any(AbortSignal)},
    )
    hook.unmount()
  })

  it('distinguishes a successful empty search from a failed request', async () => {
    const hook = setup(jest.fn().mockResolvedValue({posts: []}))

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))

    expect(hook.result.current.data).toEqual([])
    expect(hook.result.current.isError).toBe(false)
    hook.unmount()
  })

  it('exposes genuine failures and recovers on retry', async () => {
    const error = new Error('Network request failed')
    const call = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue({posts: []})
    const hook = setup(call)

    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(hook.result.current.error).toBe(error)
    expect(hook.result.current.data).toBeUndefined()

    await act(async () => {
      await hook.result.current.refetch()
    })

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(hook.result.current.data).toEqual([])
    expect(call).toHaveBeenCalledTimes(2)
    hook.unmount()
  })
})
