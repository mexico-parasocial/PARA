import {type ChatMessage} from '#/features/encryptedChat/types'
import {
  classifyClientServerEvent,
  fetchReportedMessage,
  viewFromChatMessage,
} from './reportedMessage'

const base = {sender: '@author:para', origin_server_ts: 1_700_000_000_000}

describe('classifyClientServerEvent', () => {
  it('reads a text message', () => {
    expect(
      classifyClientServerEvent({
        ...base,
        type: 'm.room.message',
        content: {msgtype: 'm.text', body: 'hola'},
      }),
    ).toEqual({
      state: 'message',
      sender: '@author:para',
      timestamp: 1_700_000_000_000,
      kind: 'text',
      body: 'hola',
    })
  })

  it('maps media msgtypes', () => {
    expect(
      classifyClientServerEvent({
        ...base,
        type: 'm.room.message',
        content: {msgtype: 'm.image', body: 'foto.jpg'},
      }),
    ).toMatchObject({state: 'message', kind: 'image'})
  })

  it('treats a redaction as redacted, not as an empty message', () => {
    expect(
      classifyClientServerEvent({
        ...base,
        type: 'm.room.message',
        content: {},
        unsigned: {redacted_because: {type: 'm.room.redaction'}},
      }),
    ).toEqual({
      state: 'redacted',
      sender: '@author:para',
      timestamp: 1_700_000_000_000,
    })
  })

  it('cannot read an encrypted event without crypto', () => {
    expect(
      classifyClientServerEvent({
        ...base,
        type: 'm.room.encrypted',
        content: {algorithm: 'm.megolm.v1.aes-sha2', ciphertext: 'x'},
      }),
    ).toMatchObject({state: 'undecryptable'})
  })

  it('does not present a non-message event as a message', () => {
    expect(
      classifyClientServerEvent({
        ...base,
        type: 'm.reaction',
        content: {'m.relates_to': {key: '👍'}},
      }),
    ).toEqual({state: 'unavailable', reason: 'error'})
  })
})

describe('fetchReportedMessage', () => {
  const call = (response: Partial<Response> | Error) => {
    const fetchImpl = jest.fn(async () => {
      if (response instanceof Error) throw response
      return response as Response
    })
    return {
      fetchImpl,
      result: fetchReportedMessage({
        homeServer: 'https://matrix.example/',
        accessToken: 'token',
        roomId: '!room:para',
        eventId: '$event',
        fetchImpl: fetchImpl,
      }),
    }
  }

  it("reads the event with the moderator's own token", async () => {
    const {fetchImpl, result} = call({
      ok: true,
      status: 200,
      json: async () => ({
        ...base,
        type: 'm.room.message',
        content: {msgtype: 'm.text', body: 'hola'},
      }),
    })
    await expect(result).resolves.toMatchObject({state: 'message'})
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://matrix.example/_matrix/client/v3/rooms/!room%3Apara/event/%24event',
      {headers: {Authorization: 'Bearer token'}},
    )
  })

  it.each([
    [404, 'not-found'],
    [403, 'no-access'],
    [500, 'error'],
  ] as const)('maps HTTP %s to %s', async (status, reason) => {
    const {result} = call({ok: false, status, json: async () => ({})})
    await expect(result).resolves.toEqual({state: 'unavailable', reason})
  })

  it('reports a network failure instead of throwing', async () => {
    const {result} = call(new Error('offline'))
    await expect(result).resolves.toEqual({
      state: 'unavailable',
      reason: 'error',
    })
  })
})

describe('viewFromChatMessage', () => {
  const message = (over: Partial<ChatMessage>): ChatMessage => ({
    id: 'id',
    eventId: '$event',
    sender: '@author:para',
    body: 'hola',
    timestamp: 1,
    kind: 'text',
    reactions: [],
    edited: false,
    readByCount: 0,
    pending: false,
    unableToDecrypt: false,
    ...over,
  })

  it('carries the native engine states through', () => {
    expect(viewFromChatMessage(message({}))).toMatchObject({
      state: 'message',
      body: 'hola',
    })
    expect(viewFromChatMessage(message({kind: 'redacted'}))).toMatchObject({
      state: 'redacted',
    })
    expect(
      viewFromChatMessage(message({kind: 'unableToDecrypt', body: ''})),
    ).toMatchObject({state: 'undecryptable'})
  })
})
