import {type tools} from '#/lexicons'
import {getNoticeLabels} from './noticeLabels'

type Notice = tools.ozone.inbox.getActionedSubject.$OutputBody

const notice = {
  subject: {uri: 'at://did:plc:alice/app.bsky.feed.post/abc'},
  enforcement: {state: 'removed'},
  actions: [{type: 'contentRemoved', createdAt: '2026-10-01T00:00:00Z'}],
} as unknown as Notice

describe('notice labels', () => {
  it('uses pending appeal date and does not report a resolved outcome', () => {
    const labels = getNoticeLabels({
      ...notice,
      appeal: {state: 'pending', appealedAt: '2026-10-02T00:00:00Z'},
    })
    expect(labels.appealResolved).toBe(false)
    expect(labels.date).toBe('2026-10-02T00:00:00Z')
  })

  it('does not attribute an older appeal outcome to a newer action', () => {
    const labels = getNoticeLabels({
      ...notice,
      appeal: {
        state: 'resolved',
        outcome: 'approved',
        resolvedAt: '2026-09-30T00:00:00Z',
      },
    })
    expect(labels.appealResolved).toBe(false)
    expect(labels.date).toBe('2026-10-01T00:00:00Z')
  })

  it('uses the resolution date for a current appeal outcome', () => {
    const labels = getNoticeLabels({
      ...notice,
      appeal: {
        state: 'resolved',
        outcome: 'denied',
        resolvedAt: '2026-10-03T00:00:00Z',
      },
    })
    expect(labels.appealResolved).toBe(true)
    expect(labels.date).toBe('2026-10-03T00:00:00Z')
  })
})
