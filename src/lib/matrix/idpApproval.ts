import {m8CredentialRevision} from '#/lib/im8/credentials'
import {requestAssertionSignature} from './im8Signer'
import {requestDeadline, throwIfAborted} from './request'

/** Approve only the configured IdP, and continue only at the active MAS origin. */
export async function approveMatrixIdpLink(
  link: string,
  issuer: string,
  authorizationUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal)
  const url = new URL(link)
  const trusted = new URL(issuer)
  if (
    url.protocol !== 'para:' ||
    url.hostname !== 'idp-login' ||
    (url.pathname && url.pathname !== '/') ||
    !/^https?:$/.test(trusted.protocol) ||
    trusted.username ||
    trusted.password ||
    url.searchParams.getAll('issuer').length !== 1 ||
    url.searchParams.get('issuer')?.replace(/\/$/, '') !==
      issuer.replace(/\/$/, '') ||
    url.searchParams.getAll('challenge').length !== 1
  )
    throw new Error('CHAT_INVALID_IDP_LINK')
  const challenge = url.searchParams.get('challenge') ?? ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge))
    throw new Error('CHAT_INVALID_IDP_LINK')
  const revision = m8CredentialRevision()
  const signed = await requestAssertionSignature('para-idp', challenge, {
    signal,
  })
  throwIfAborted(signal)
  if (revision !== m8CredentialRevision())
    throw new Error('CHAT_ACCOUNT_CHANGED')
  const deadline = requestDeadline(signal)
  try {
    const response = await fetch(
      `${issuer.replace(/\/$/, '')}/authorize/verify`,
      {
        method: 'POST',
        redirect: 'error',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({challenge, ...signed}),
        signal: deadline.signal,
      },
    )
    if (revision !== m8CredentialRevision())
      throw new Error('CHAT_ACCOUNT_CHANGED')
    if (!response.ok) throw new Error('CHAT_IDP_APPROVAL_FAILED')
    const body = (await response.json()) as {redirect_uri?: string}
    throwIfAborted(signal)
    if (revision !== m8CredentialRevision())
      throw new Error('CHAT_ACCOUNT_CHANGED')
    if (!body.redirect_uri) throw new Error('CHAT_IDP_APPROVAL_FAILED')
    const continuation = new URL(body.redirect_uri)
    if (
      continuation.origin !== new URL(authorizationUrl).origin ||
      continuation.username ||
      continuation.password ||
      !continuation.searchParams.get('code') ||
      !continuation.searchParams.get('state')
    )
      throw new Error('CHAT_INVALID_IDP_RETURN')
    return continuation.toString()
  } finally {
    deadline.dispose()
  }
}
