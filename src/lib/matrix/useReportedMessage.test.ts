import {act, renderHook} from '@testing-library/react-native'

import {type ReportedMessageView} from './reportedMessage'
import {useReportedMessageReader} from './useReportedMessage'

const message: ReportedMessageView = {
  state: 'message',
  sender: '@author:example.org',
  kind: 'text',
  body: 'private',
}
type Reader = () => Promise<ReportedMessageView>

describe('reported message review isolation', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('hides the previous session immediately and ignores its late response', async () => {
    let finishOld!: (value: ReportedMessageView) => void
    const oldReader = () =>
      new Promise<ReportedMessageView>(resolve => {
        finishOld = resolve
      })
    const newReader: Reader = async () => ({
      state: 'unavailable',
      reason: 'no-access',
    })
    const {result, rerender} = renderHook(
      ({read}: {read: Reader | undefined}) => useReportedMessageReader(read),
      {initialProps: {read: oldReader}},
    )
    await act(async () => rerender({read: newReader}))
    await act(async () => finishOld(message))
    expect(result.current.view).toEqual({
      state: 'unavailable',
      reason: 'no-access',
    })
    rerender({read: undefined})
    expect(result.current.view).toBeUndefined()
  })

  it('replaces visible content after redaction and stops fetching on close', async () => {
    const read = jest
      .fn<Promise<ReportedMessageView>, []>()
      .mockResolvedValueOnce(message)
      .mockResolvedValue({state: 'redacted'})
    const {result, unmount} = renderHook(() => useReportedMessageReader(read))
    await act(async () => {})
    expect(result.current.view).toEqual(message)
    await act(async () => {
      jest.advanceTimersByTime(15_000)
    })
    expect(result.current.view).toEqual({state: 'redacted'})
    unmount()
    await act(async () => {
      jest.advanceTimersByTime(30_000)
    })
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('does not share a previously loaded message with another reader', async () => {
    const read = async () => message
    const {result, rerender} = renderHook(
      ({reader}: {reader: Reader}) => useReportedMessageReader(reader),
      {initialProps: {reader: read}},
    )
    await act(async () => {})
    expect(result.current.view).toEqual(message)
    rerender({reader: () => new Promise(() => {})})
    expect(result.current.view).toBeUndefined()
  })
})
