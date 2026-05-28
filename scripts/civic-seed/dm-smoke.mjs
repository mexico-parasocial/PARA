import assert from 'node:assert/strict'
import process from 'node:process'

import {AtpAgent} from '@atproto/api'

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

function getDmHeaders(chatDid) {
  return {
    'atproto-proxy': `${chatDid}#bsky_chat`,
  }
}

async function login({service, identifier, password}) {
  const agent = new AtpAgent({service})
  const session = await agent.login({identifier, password})
  return {
    agent,
    session: session.data,
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
  const dmHeaders = getDmHeaders(chatDid)

  log('starting', {service, chatDid, accountA, accountB})

  const {agent: agentA, session: sessionA} = await login({
    service,
    identifier: accountA,
    password: passwordA,
  })
  const {agent: agentB, session: sessionB} = await login({
    service,
    identifier: accountB,
    password: passwordB,
  })

  assert.ok(sessionA.did, 'expected a DID for account A')
  assert.ok(sessionB.did, 'expected a DID for account B')
  log('logged in', {didA: sessionA.did, didB: sessionB.did})

  const availability = await agentA.chat.bsky.convo.getConvoAvailability(
    {members: [sessionB.did]},
    {headers: dmHeaders},
  )
  assert.equal(availability.data.canChat, true, 'expected A to be able to DM B')

  const created = await agentA.chat.bsky.convo.getConvoForMembers(
    {members: [sessionB.did]},
    {headers: dmHeaders},
  )
  const convoId = created.data.convo.id
  assert.ok(convoId, 'expected convo id')
  assert.equal(created.data.convo.status, 'accepted')
  log('convo ready', {convoId})

  const requestListB = await agentB.chat.bsky.convo.listConvos(
    {status: 'request'},
    {headers: dmHeaders},
  )
  const sawRequest = convoIds(requestListB.data).includes(convoId)
  if (sawRequest) {
    log('recipient sees pending request', {convoId})
  } else {
    log('recipient request already resolved', {convoId})
  }

  await agentB.chat.bsky.convo.acceptConvo({convoId}, {headers: dmHeaders})
  const convoBAccepted = await agentB.chat.bsky.convo.getConvo(
    {convoId},
    {headers: dmHeaders},
  )
  assert.equal(convoBAccepted.data.convo.status, 'accepted')

  await agentA.chat.bsky.convo.updateAllRead(
    {status: 'accepted'},
    {headers: dmHeaders},
  )
  await agentB.chat.bsky.convo.updateAllRead(
    {status: 'accepted'},
    {headers: dmHeaders},
  )

  const messageAText = `dm smoke A -> B ${Date.now()}`
  const sentA = await agentA.chat.bsky.convo.sendMessage(
    {
      convoId,
      message: {
        text: messageAText,
      },
    },
    {headers: dmHeaders},
  )
  assert.equal(sentA.data.text, messageAText)

  const convoBUnread = await agentB.chat.bsky.convo.getConvo(
    {convoId},
    {headers: dmHeaders},
  )
  assert.equal(
    convoBUnread.data.convo.unreadCount,
    1,
    'expected B unread count to increment after A message',
  )
  const messagesB = await agentB.chat.bsky.convo.getMessages(
    {convoId},
    {headers: dmHeaders},
  )
  assert.ok(
    messageTexts(messagesB.data).includes(messageAText),
    'expected B to see A message',
  )

  await agentB.chat.bsky.convo.updateRead(
    {
      convoId,
      messageId: sentA.data.id,
    },
    {headers: dmHeaders},
  )
  const convoBRead = await agentB.chat.bsky.convo.getConvo(
    {convoId},
    {headers: dmHeaders},
  )
  assert.equal(
    convoBRead.data.convo.unreadCount,
    0,
    'expected B unread count to clear after updateRead',
  )

  const messageBText = `dm smoke B -> A ${Date.now()}`
  const sentB = await agentB.chat.bsky.convo.sendMessage(
    {
      convoId,
      message: {
        text: messageBText,
      },
    },
    {headers: dmHeaders},
  )
  assert.equal(sentB.data.text, messageBText)

  const unreadListA = await agentA.chat.bsky.convo.listConvos(
    {
      status: 'accepted',
      readState: 'unread',
    },
    {headers: dmHeaders},
  )
  assert.ok(
    convoIds(unreadListA.data).includes(convoId),
    'expected unread list for A to include the convo after B message',
  )
  const messagesA = await agentA.chat.bsky.convo.getMessages(
    {convoId},
    {headers: dmHeaders},
  )
  const textsA = messageTexts(messagesA.data)
  assert.ok(textsA.includes(messageAText), 'expected A to see its own message')
  assert.ok(textsA.includes(messageBText), 'expected A to see B message')

  await agentA.chat.bsky.convo.updateAllRead(
    {status: 'accepted'},
    {headers: dmHeaders},
  )
  const convoARead = await agentA.chat.bsky.convo.getConvo(
    {convoId},
    {headers: dmHeaders},
  )
  assert.equal(
    convoARead.data.convo.unreadCount,
    0,
    'expected A unread count to clear after updateAllRead',
  )

  const unreadListAAfterRead = await agentA.chat.bsky.convo.listConvos(
    {
      status: 'accepted',
      readState: 'unread',
    },
    {headers: dmHeaders},
  )
  assert.ok(
    !convoIds(unreadListAAfterRead.data).includes(convoId),
    'expected read convo to disappear from unread list',
  )

  const logs = await agentA.chat.bsky.convo.getLog({}, {headers: dmHeaders})
  assert.ok(logs.data.logs.length >= 5, 'expected several convo log events')
  assert.ok(logs.data.cursor, 'expected getLog cursor')

  const nextLogs = await agentA.chat.bsky.convo.getLog(
    {cursor: logs.data.cursor},
    {headers: dmHeaders},
  )
  assert.equal(
    nextLogs.data.logs.length,
    0,
    'expected no additional logs when replaying from the latest cursor',
  )

  const {agent: freshA} = await login({
    service,
    identifier: accountA,
    password: passwordA,
  })
  const {agent: freshB} = await login({
    service,
    identifier: accountB,
    password: passwordB,
  })

  const freshListA = await freshA.chat.bsky.convo.listConvos(
    {status: 'accepted'},
    {headers: dmHeaders},
  )
  assert.ok(
    convoIds(freshListA.data).includes(convoId),
    'expected convo to survive fresh client login for A',
  )
  const freshMessagesB = await freshB.chat.bsky.convo.getMessages(
    {convoId},
    {headers: dmHeaders},
  )
  const freshTextsB = messageTexts(freshMessagesB.data)
  assert.ok(
    freshTextsB.includes(messageAText) && freshTextsB.includes(messageBText),
    'expected both messages after fresh login',
  )

  log('success', {
    convoId,
    messages: [messageAText, messageBText],
    logEvents: logs.data.logs.length,
  })
}

main().catch(error => {
  console.error('[dm-smoke] failed')
  console.error(error)
  process.exitCode = 1
})
