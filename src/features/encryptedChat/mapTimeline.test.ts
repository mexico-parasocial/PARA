import {type TimelineItemLike} from '@unomed/react-native-matrix-sdk'

import {mapTimelineItems} from './mapTimeline'

function item(id: string, kind: unknown, extra: Record<string, unknown> = {}) {
  return {
    uniqueId: () => ({id}),
    asEvent: () => ({
      sender: '@alice:example.org',
      timestamp: 1_700_000_000_000n,
      isRemote: true,
      eventOrTransactionId: {tag: 'EventId', inner: {eventId: '$' + id}},
      readReceipts: new Map([['@bob:example.org', {}]]),
      content: {
        tag: 'MsgLike',
        inner: {
          content: {
            kind,
            reactions: [
              {key: '👍', senders: [{senderId: '@alice:example.org'}]},
            ],
            ...extra,
          },
        },
      },
    }),
  } as unknown as TimelineItemLike
}

describe('native Matrix timeline mapping', () => {
  it('maps edited replies and reaction/receipt aggregates without SDK objects', () => {
    const reply = {
      eventId: () => '$parent',
      event: () => ({
        tag: 'Ready',
        inner: {
          sender: '@bob:example.org',
          content: {
            tag: 'MsgLike',
            inner: {
              content: {
                kind: {tag: 'Message', inner: {content: {body: 'Original'}}},
              },
            },
          },
        },
      }),
    }
    const mapped = mapTimelineItems(
      [
        item(
          'one',
          {
            tag: 'Message',
            inner: {
              content: {
                body: 'Respuesta',
                isEdited: true,
                msgType: {tag: 'Text'},
              },
            },
          },
          {inReplyTo: reply},
        ),
      ],
      '@alice:example.org',
    )

    expect(mapped).toMatchObject([
      {
        eventId: '$one',
        kind: 'text',
        edited: true,
        replyTo: {
          eventId: '$parent',
          sender: '@bob:example.org',
          body: 'Original',
        },
        reactions: [{key: '👍', count: 1, reactedByMe: true}],
        readByCount: 1,
      },
    ])
    expect(JSON.stringify(mapped)).not.toContain('source')
  })

  it('maps encrypted media metadata, redactions, and undecryptable events', () => {
    const source = {privateSdkObject: 'must stay internal'}
    const mapped = mapTimelineItems(
      [
        item('image', {
          tag: 'Message',
          inner: {
            content: {
              body: 'photo.png',
              isEdited: false,
              msgType: {
                tag: 'Image',
                inner: {
                  content: {
                    filename: 'photo.png',
                    source,
                    info: {mimetype: 'image/png', size: 42n},
                  },
                },
              },
            },
          },
        }),
        item('redacted', {tag: 'Redacted'}),
        item('missing', {tag: 'UnableToDecrypt'}),
      ],
      '@alice:example.org',
    )

    expect(mapped.map(message => message.kind)).toEqual([
      'image',
      'redacted',
      'unableToDecrypt',
    ])
    expect(mapped[0].media).toEqual({
      filename: 'photo.png',
      mimeType: 'image/png',
      size: 42,
    })
    expect(mapped[2].unableToDecrypt).toBe(true)
    expect(JSON.stringify(mapped)).not.toContain('privateSdkObject')
  })
})
