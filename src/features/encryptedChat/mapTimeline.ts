// oxlint-disable typescript/no-unsafe-enum-comparison -- Generated Uniffi tags have string values.
import {type TimelineItemLike} from '@unomed/react-native-matrix-sdk'

import {type ChatMessage} from './types'

type MessageKind = ChatMessage['kind']

export function mapTimelineItems(
  items: TimelineItemLike[],
  ownUserId: string,
): ChatMessage[] {
  return items.flatMap(item => {
    const event = item.asEvent()
    if (!event || event.content.tag !== 'MsgLike') return []
    const content = event.content.inner.content
    const {kind} = content
    if (
      kind.tag !== 'Message' &&
      kind.tag !== 'UnableToDecrypt' &&
      kind.tag !== 'Redacted'
    ) {
      return []
    }

    const message = kind.tag === 'Message' ? kind.inner.content : undefined
    const msgType = message?.msgType
    let type: MessageKind = 'text'
    let media: ChatMessage['media']
    if (kind.tag === 'UnableToDecrypt') type = 'unableToDecrypt'
    else if (kind.tag === 'Redacted') type = 'redacted'
    else if (msgType) {
      switch (msgType.tag) {
        case 'Image':
        case 'Audio':
        case 'Video':
        case 'File': {
          type = msgType.tag.toLowerCase() as MessageKind
          const data = msgType.inner.content
          media = {
            filename: data.filename,
            mimeType: data.info?.mimetype ?? 'application/octet-stream',
            size:
              data.info?.size === undefined
                ? undefined
                : Number(data.info.size),
          }
          break
        }
      }
    }

    const eventId =
      event.eventOrTransactionId.tag === 'EventId'
        ? event.eventOrTransactionId.inner.eventId
        : undefined
    const reply = content.inReplyTo
    const replyDetails = reply?.event()
    let replyBody: string | undefined
    let replySender: string | undefined
    if (replyDetails?.tag === 'Ready') {
      replySender = replyDetails.inner.sender
      const replyContent = replyDetails.inner.content
      if (replyContent.tag === 'MsgLike') {
        const replyKind = replyContent.inner.content.kind
        if (replyKind.tag === 'Message')
          replyBody = replyKind.inner.content.body
      }
    }

    return [
      {
        id: item.uniqueId().id,
        eventId,
        sender: event.sender,
        body: message?.body ?? '',
        timestamp: Number(event.timestamp),
        kind: type,
        media,
        reactions: content.reactions.map(reaction => ({
          key: reaction.key,
          count: reaction.senders.length,
          reactedByMe: reaction.senders.some(
            sender => sender.senderId === ownUserId,
          ),
        })),
        replyTo: reply
          ? {eventId: reply.eventId(), sender: replySender, body: replyBody}
          : undefined,
        edited: message?.isEdited ?? false,
        readByCount: [...event.readReceipts.keys()].filter(
          userId => userId !== ownUserId,
        ).length,
        pending: !event.isRemote,
        unableToDecrypt: kind.tag === 'UnableToDecrypt',
      },
    ]
  })
}
