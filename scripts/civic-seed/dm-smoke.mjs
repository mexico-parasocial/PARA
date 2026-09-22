import assert from 'node:assert/strict'
import process from 'node:process'

import {chat} from '@bsky/sdk/lexicons'

import {
  createParaChatClient,
  loginParaSession,
} from '../lib/para-client.mjs'

const DEFAULT_SERVICE = 'http://localhost:2583'
const DEFAULT_CHAT_DID = 'did:plc:ztgydimgwegx72nfqbfgurrb'
const DEFAULT_PASSWORD = 'hunter2'

function env(name, fallback) {
  const value = process.env[name]
  return value && value.length > 0 ? value : fallback
}

function log(message, data) {
  if (data) {
    console.log(`[dm-smoke] ${message}`, data)
    return
  }
  console.log(`[dm-smoke] ${message}`)
}

// The old agent passed `{headers: {'atproto-proxy': `${chatDid}#bsky_chat`}}`
// on every chat call. The lex client routes those calls through a client
// whose `service` option is the proxy target, which sets the same header.
function getChatProxyService(chatDid) {
  return `${chatDid}#bsky_chat`
}

async function login({service, identifier, password, chatProxyService}) {
  const session = await loginParaSession({service, identifier, password})
  const client = createParaChatClient(session, chatProxyService)
  return {
    client,
    did: session.did,
  }
}

function messageTexts(output) {
  return output.messages
    .filter(message => message?.$type === 'chat.bsky.convo.defs#messageView')
    .map(message => message.text)
}

function convoIds(output) {
  return output.convos.map(convo => convo.id)
}

async function main() {
  const service = env('PARA_CIVIC_SEED_SERVICE', DEFAULT_SERVICE)
  const chatDid = env('PARA_LOCAL_CHAT_DID', DEFAULT_CHAT_DID)
  const accountA = env('PARA_DM_SMOKE_ACCOUNT_A', 'active-a.test')
  const accountB = env('PARA_DM_SMOKE_ACCOUNT_B', 'active-b.test')
  const passwordA = env('PARA_DM_SMOKE_PASSWORD_A', DEFAULT_PASSWORD)
  const passwordB = env('PARA_DM_SMOKE_PASSWORD_B', DEFAULT_PASSWORD)
  const chatProxyService = getChatProxyService(chatDid)
  log('starting', {service, chatDid, accountA, accountB})

  const {client: clientA, did: didA} = await login({
    service,
    identifier: accountA,
    password: passwordA,
    chatProxyService,
  })
  const {client: clientB, did: didB} = await login({
    service,
    identifier: accountB,
    password: passwordB,
    chatProxyService,
  })

  assert.ok(didA, 'expected a DID for account A')
  assert.ok(didB, 'expected a DID for account B')
  log('logged in', {didA, didB})

  const availability = await clientA.call(chat.bsky.convo.getConvoAvailability, {
    members: [didB],
  })
  assert.equal(availability.canChat, true, 'expected A to be able to DM B')

  const created = await clientA.call(chat.bsky.convo.getConvoForMembers, {
    members: [didB],
  })
  const convoId = created.convo.id
  assert.ok(convoId, 'expected convo id')
  assert.equal(created.convo.status, 'accepted')
  log('convo ready', {convoId})

  const requestListB = await clientB.call(chat.bsky.convo.listConvos, {
    status: 'request',
  })
  const sawRequest = convoIds(requestListB).includes(convoId)
  if (sawRequest) {
    log('recipient sees pending request', {convoId})
  } else {
    log('recipient request already resolved', {convoId})
  }

  await clientB.call(chat.bsky.convo.acceptConvo, {convoId})
  const convoBAccepted = await clientB.call(chat.bsky.convo.getConvo, {
    convoId,
  })
  assert.equal(convoBAccepted.convo.status, 'accepted')

  await clientA.call(chat.bsky.convo.updateAllRead, {status: 'accepted'})
  await clientB.call(chat.bsky.convo.updateAllRead, {status: 'accepted'})

  const messageAText = `dm smoke A -> B ${Date.now()}`
  const sentA = await clientA.call(chat.bsky.convo.sendMessage, {
    convoId,
    message: {
      text: messageAText,
    },
  })
  assert.equal(sentA.text, messageAText)

  const convoBUnread = await clientB.call(chat.bsky.convo.getConvo, {convoId})
  assert.equal(
    convoBUnread.convo.unreadCount,
    1,
    'expected B unread count to increment after A message',
  )
  const messagesB = await clientB.call(chat.bsky.convo.getMessages, {convoId})
  assert.ok(
    messageTexts(messagesB).includes(messageAText),
    'expected B to see A message',
  )

  await clientB.call(chat.bsky.convo.updateRead, {
    convoId,
    messageId: sentA.id,
  })
  const convoBRead = await clientB.call(chat.bsky.convo.getConvo, {convoId})
  assert.equal(
    convoBRead.convo.unreadCount,
    0,
    'expected B unread count to clear after updateRead',
  )

  const messageBText = `dm smoke B -> A ${Date.now()}`
  const sentB = await clientB.call(chat.bsky.convo.sendMessage, {
    convoId,
    message: {
      text: messageBText,
    },
  })
  assert.equal(sentB.text, messageBText)

  const unreadListA = await clientA.call(chat.bsky.convo.listConvos, {
    status: 'accepted',
    readState: 'unread',
  })
  assert.ok(
    convoIds(unreadListA).includes(convoId),
    'expected unread list for A to include the convo after B message',
  )
  const messagesA = await clientA.call(chat.bsky.convo.getMessages, {convoId})
  const textsA = messageTexts(messagesA)
  assert.ok(textsA.includes(messageAText), 'expected A to see its own message')
  assert.ok(textsA.includes(messageBText), 'expected A to see B message')

  await clientA.call(chat.bsky.convo.updateAllRead, {status: 'accepted'})
  const convoARead = await clientA.call(chat.bsky.convo.getConvo, {convoId})
  assert.equal(
    convoARead.convo.unreadCount,
    0,
    'expected A unread count to clear after updateAllRead',
  )

  const unreadListAAfterRead = await clientA.call(chat.bsky.convo.listConvos, {
    status: 'accepted',
    readState: 'unread',
  })
  assert.ok(
    !convoIds(unreadListAAfterRead).includes(convoId),
    'expected read convo to disappear from unread list',
  )

  const logs = await clientA.call(chat.bsky.convo.getLog, {})
  assert.ok(logs.logs.length >= 5, 'expected several convo log events')
  assert.ok(logs.cursor, 'expected getLog cursor')

  const nextLogs = await clientA.call(chat.bsky.convo.getLog, {
    cursor: logs.cursor,
  })
  assert.equal(
    nextLogs.logs.length,
    0,
    'expected no additional logs when replaying from the latest cursor',
  )

  const {client: freshA} = await login({
    service,
    identifier: accountA,
    password: passwordA,
    chatProxyService,
  })
  const {client: freshB} = await login({
    service,
    identifier: accountB,
    password: passwordB,
    chatProxyService,
  })

  const freshListA = await freshA.call(chat.bsky.convo.listConvos, {
    status: 'accepted',
  })
  assert.ok(
    convoIds(freshListA).includes(convoId),
    'expected convo to survive fresh client login for A',
  )
  const freshMessagesB = await freshB.call(chat.bsky.convo.getMessages, {
    convoId,
  })
  const freshTextsB = messageTexts(freshMessagesB)
  assert.ok(
    freshTextsB.includes(messageAText) && freshTextsB.includes(messageBText),
    'expected both messages after fresh login',
  )

  log('success', {
    convoId,
    messages: [messageAText, messageBText],
    logEvents: logs.logs.length,
  })
}

main().catch(error => {
  console.error('[dm-smoke] failed')
  console.error(error)
  process.exitCode = 1
})
