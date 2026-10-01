import {getNotificationFeedItems} from '../feed-items'
import {type FeedNotification, type FeedPage} from '../types'

function notification(uri: string, reason = 'follow'): FeedNotification {
  return {
    _reactKey: `notif-${uri}-${reason}`,
    type: 'follow',
    notification: {uri, reason},
  } as FeedNotification
}

function page(items: FeedNotification[]): FeedPage {
  return {items, cursor: undefined, seenAt: new Date(), priority: false}
}

describe('getNotificationFeedItems', () => {
  it('removes duplicate records within a page and across overlapping pages', () => {
    const first = notification('at://did:plc:alice/app.bsky.graph.follow/1')
    const second = notification('at://did:plc:bob/app.bsky.graph.follow/2')
    const third = notification('at://did:plc:carol/app.bsky.graph.follow/3')
    const pages = [
      page([first, {...first}, second]),
      page([{...first}, {...second}, third]),
    ]

    const items = getNotificationFeedItems(pages)

    expect(items).toEqual([first, second, third])
    expect(items[0]).toBe(first)
    expect(new Set(items.map(item => item._reactKey)).size).toBe(items.length)
    expect(pages.map(p => p.items.length)).toEqual([3, 3])
  })

  it('preserves different reasons for the same record', () => {
    const uri = 'at://did:plc:alice/app.bsky.feed.post/1'
    const mention = notification(uri, 'mention')
    const reply = notification(uri, 'reply')

    expect(getNotificationFeedItems([page([mention, reply])])).toEqual([
      mention,
      reply,
    ])
  })

  it('keeps existing keys and order when another page is appended', () => {
    const first = notification('at://did:plc:alice/app.bsky.graph.follow/1')
    const second = notification('at://did:plc:bob/app.bsky.graph.follow/2')
    const pages = [page([first])]

    const before = getNotificationFeedItems(pages)
    const after = getNotificationFeedItems([
      ...pages,
      page([{...first}, second]),
    ])

    expect(after).toEqual([...before, second])
    expect(after[0]).toBe(before[0])
  })

  it('handles empty pages', () => {
    expect(getNotificationFeedItems([])).toEqual([])
    expect(getNotificationFeedItems([page([])])).toEqual([])
  })
})
