import {useCallback, useEffect, useState} from 'react'

import {PARTY_FEED_PROFILES} from '#/lib/party-feeds'
import * as persisted from '#/state/persisted'
import {type CommunityBoardView} from '#/state/queries/community-boards'

export type RecentCommunityView = CommunityBoardView & {
  isLocalRecent?: boolean
}

export function useRecentCommunities() {
  const [recents, setRecents] = useState(
    () => (persisted.get('recentCommunities') || []) as RecentCommunityView[],
  )

  useEffect(() => {
    return persisted.onUpdate('recentCommunities', next => {
      setRecents((next || []) as RecentCommunityView[])
    })
  }, [])

  return recents
}

export function useAddRecentCommunity() {
  return useCallback((community: RecentCommunityView) => {
    addRecentCommunity(community)
  }, [])
}

export function addRecentCommunity(community: RecentCommunityView) {
  const current = (persisted.get('recentCommunities') ||
    []) as RecentCommunityView[]
  const nextKeys = getRecentCommunityKeys(community)
  const filtered = current.filter(currentCommunity => {
    const currentKeys = getRecentCommunityKeys(currentCommunity)
    return !currentKeys.some(key => nextKeys.includes(key))
  })
  const next = [community, ...filtered].slice(0, 20)
  void persisted.write('recentCommunities', next)
}

export function createLocalRecentCommunity({
  communityId,
  communityName,
  communityPath,
}: {
  communityId?: string
  communityName?: string
  communityPath?: string
}): RecentCommunityView | null {
  const rawIdentifier = communityId || communityName
  if (!rawIdentifier) return null

  const identifier = rawIdentifier.trim()
  if (!identifier || identifier === '1') return null

  const prefix =
    inferCommunityPrefix(communityPath, communityName, identifier) ||
    inferPartyPrefix(communityName, identifier)
  const displayIdentifier = prefix
    ? `${prefix}/${stripCommunityPrefix(identifier)}`
    : identifier
  const displayName =
    communityName?.trim() || formatCommunityLabel(displayIdentifier)
  const slug = stripCommunityPrefix(identifier)
  const uri = `local:community:${normalizeRecentCommunityKey(displayIdentifier)}`

  return {
    uri,
    cid: '',
    creatorDid: '',
    communityId: slug,
    slug,
    name: displayName,
    quadrant: prefix === 'p' ? 'political' : 'geographic',
    delegatesChatId: '',
    subdelegatesChatId: '',
    memberCount: 0,
    viewerMembershipState: 'none',
    createdAt: new Date().toISOString(),
    isLocalRecent: true,
  }
}

export function clearRecentCommunities() {
  void persisted.write('recentCommunities', [])
}

function getRecentCommunityKeys(community: RecentCommunityView) {
  const prefix = inferCommunityPrefix(
    undefined,
    community.name,
    `${community.quadrant === 'political' ? 'p' : 'g'}/${
      community.slug || community.communityId
    }`,
  )
  const slug = stripCommunityPrefix(community.slug || community.communityId)
  const qualifiedSlug = prefix && slug ? `${prefix}/${slug}` : slug

  return [
    community.uri.startsWith('local:community:') ? undefined : community.uri,
    qualifiedSlug,
    community.name,
  ]
    .map(normalizeRecentCommunityKey)
    .filter((value): value is string => Boolean(value))
}

function stripCommunityPrefix(value?: string) {
  return value?.replace(/^[pg]\//i, '')
}

function normalizeRecentCommunityKey(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
}

function formatCommunityLabel(value: string) {
  const trimmed = value.trim()
  if (/^[pg]\//i.test(trimmed)) return trimmed

  return trimmed
    .replace(/-/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function inferCommunityPrefix(
  communityPath?: string,
  communityName?: string,
  identifier?: string,
) {
  const pathPrefix = communityPath?.match(/^\/?([pg])\//i)?.[1]
  const namePrefix = communityName?.match(/^([pg])\//i)?.[1]
  const identifierPrefix = identifier?.match(/^([pg])\//i)?.[1]

  return (pathPrefix || namePrefix || identifierPrefix)?.toLowerCase()
}

function inferPartyPrefix(communityName?: string, identifier?: string) {
  const normalizedValues = [communityName, identifier]
    .map(value => normalizeRecentCommunityKey(stripCommunityPrefix(value)))
    .filter(Boolean)

  const isKnownParty = PARTY_FEED_PROFILES.some(profile => {
    const partyValues = [profile.name, profile.shortName, profile.filter]
      .map(value => normalizeRecentCommunityKey(stripCommunityPrefix(value)))
      .filter(Boolean)

    return partyValues.some(partyValue => normalizedValues.includes(partyValue))
  })

  return isKnownParty ? 'p' : undefined
}
