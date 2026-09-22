// Shared AT Protocol client helper for PARA maintenance / seed scripts.
//
// Replaces the old `AtpAgent` (from the since-removed atproto API package):
//
//   const agent = new AtpAgent({service})
//   await agent.login({identifier, password})
//   const {data} = await agent.api.com.atproto.repo.createRecord({...})
//
// with the lex stack the app itself uses:
//
//   const client = await createParaClient({service, identifier, password})
//   const body = await client.call(com.atproto.repo.createRecord, {...})
//
// NOTE: `client.call(ns, paramsOrBody)` resolves to the RESPONSE BODY
// directly (the old agent resolved to `{data: body}`), so drop the
// `{data}` destructuring. `agent.session.did` becomes `client.assertDid`
// (or `client.did` when a maybe-undefined DID is acceptable).
//
// Lexicon schemas come either from the generated local lexicons
// (`src/lexicons`, TS — for tsx-run .ts scripts) or, from plain-node .mjs
// scripts, from `@bsky/sdk/lexicons` (JS; standard app.bsky / chat.bsky /
// com.atproto namespaces — no com.para).

import {Client} from '@atproto/lex'
import {PasswordSession} from '@atproto/lex-password-session'

/**
 * Mirrors the app's `createLexClient` (src/lib/lexClient.ts): lenient
 * response processing so legacy blob refs / datetime quirks in local dev
 * data don't crash script runs.
 */
const CLIENT_OPTIONS = {strictResponseProcessing: false}

/**
 * Build a lex {@link Client} on top of a `PasswordSession`.
 * Use `loginParaSession` instead if you also need the session itself
 * (handle / accessJwt).
 */
export function clientForSession(session, clientOptions = CLIENT_OPTIONS) {
  return new Client(session, clientOptions)
}

/**
 * Replaces `agent.login({identifier, password})`: returns the session
 * rather than an agent. The session exposes `.did`, `.handle` and
 * `.session` (createSession data, including `accessJwt`).
 */
export function loginParaSession({service, identifier, password}) {
  return PasswordSession.login({service, identifier, password})
}

/**
 * Replaces `agent.createAccount({handle, email, password, inviteCode})`:
 * creates the account and returns an authenticated session for it.
 */
export function createParaAccountSession({
  service,
  handle,
  email,
  password,
  inviteCode,
}) {
  return PasswordSession.createAccount(
    {handle, email, password, inviteCode},
    {service},
  )
}

/**
 * Log in and return an authenticated {@link Client}.
 * Replaces `new AtpAgent({service})` + `agent.login({identifier, password})`.
 */
export async function createParaClient({service, identifier, password}) {
  const session = await loginParaSession({service, identifier, password})
  return clientForSession(session)
}

/**
 * Create an account and return an authenticated {@link Client} for it.
 * Replaces `agent.createAccount({handle, email, password})`.
 */
export async function createParaAccountClient({
  service,
  handle,
  email,
  password,
  inviteCode,
}) {
  const session = await createParaAccountSession({
    service,
    handle,
    email,
    password,
    inviteCode,
  })
  return clientForSession(session)
}

/**
 * Unauthenticated client pointed at `service`, for pre-login calls.
 * Replaces `new AtpAgent({service})` used without a session.
 */
export function createParaServiceClient(service) {
  return new Client({service}, CLIENT_OPTIONS)
}

/**
 * Client that proxies every request to the chat service via the
 * `atproto-proxy` header. Replaces per-call
 * `{headers: {'atproto-proxy': `${chatDid}#bsky_chat`}}` options on the
 * old agent's `chat.bsky.convo.*` methods.
 */
export function createParaChatClient(session, chatProxyService) {
  return new Client(session, {...CLIENT_OPTIONS, service: chatProxyService})
}
