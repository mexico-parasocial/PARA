import {
  isLikelyLocalServiceUrl,
  normalizeLocalServiceUrl,
} from '#/lib/constants'
import {type PersistedAccount} from '#/state/persisted'

type AccountLike = Pick<
  PersistedAccount,
  'service' | 'did' | 'handle' | 'refreshJwt' | 'accessJwt' | 'active'
>

function normalizeServiceForComparison(service: string) {
  const normalized = isLikelyLocalServiceUrl(service)
    ? normalizeLocalServiceUrl(service)
    : service

  return normalized.replace(/\/+$/, '').toLowerCase()
}

function getAccountIdentityKey(
  account: Pick<AccountLike, 'service' | 'handle'>,
) {
  return `${normalizeServiceForComparison(account.service)}::${account.handle.toLowerCase()}`
}

function getPriority(account: AccountLike, preferredDid?: string) {
  let priority = 0

  if (account.did === preferredDid) priority += 1000
  if (account.refreshJwt) priority += 100
  if (account.accessJwt) priority += 10
  if (account.active) priority += 1

  return priority
}

export function dedupeAccounts<T extends AccountLike>(
  accounts: T[],
  preferredDid?: string,
): T[] {
  const deduped: T[] = []

  for (const account of accounts) {
    const identityKey = getAccountIdentityKey(account)
    const existingIndex = deduped.findIndex(existing => {
      return (
        existing.did === account.did ||
        getAccountIdentityKey(existing) === identityKey
      )
    })

    if (existingIndex === -1) {
      deduped.push(account)
      continue
    }

    const existing = deduped[existingIndex]
    if (
      getPriority(account, preferredDid) > getPriority(existing, preferredDid)
    ) {
      deduped[existingIndex] = account
    }
  }

  return deduped
}
