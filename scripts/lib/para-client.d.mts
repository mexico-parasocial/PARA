// Type declarations for para-client.mjs (runtime is plain JS; these exist so
// .ts scripts run under tsx/tsc type-check cleanly against the helper).

import type {Client} from '@atproto/lex'
import type {PasswordSession} from '@atproto/lex-password-session'

/** A lex client built by this helper (session-scoped, lenient processing). */
export type ParaLexClient = Client

export interface ParaLoginOptions {
  service: string
  identifier: string
  password: string
}

export interface ParaCreateAccountOptions {
  service: string
  handle: string
  email: string
  password: string
  inviteCode?: string
}

export function clientForSession(
  session: PasswordSession,
  clientOptions?: ConstructorParameters<typeof Client>[1],
): Client

export function loginParaSession(options: ParaLoginOptions): Promise<PasswordSession>

export function createParaAccountSession(
  options: ParaCreateAccountOptions,
): Promise<PasswordSession>

export function createParaClient(
  options: ParaLoginOptions,
): Promise<Client>

export function createParaAccountClient(
  options: ParaCreateAccountOptions,
): Promise<Client>

export function createParaServiceClient(service: string): Client

export function createParaChatClient(
  session: PasswordSession,
  chatProxyService: string,
): Client
