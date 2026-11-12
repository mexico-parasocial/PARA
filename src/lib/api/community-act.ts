import {type AtUriString, type DidString} from '@atproto/syntax'

import {type useAgent} from '#/state/session'
import {com} from '#/lexicons'

type Agent = Pick<ReturnType<typeof useAgent>, 'pdsClient'>
type ActInput = com.para.community.act.$InputBody

export const COMMUNITY_PROFILE_COLLECTION = 'com.para.community.profile'

const PROFILE_URI = new RegExp(
  `^at://(did:[^/]+)/${COMMUNITY_PROFILE_COLLECTION.replaceAll('.', '\\.')}/self$`,
)

/** Whether `value` names a community account: its profile record's AT URI. */
export function isCommunityUri(value: string | undefined): boolean {
  return Boolean(value && PROFILE_URI.test(value))
}

/**
 * The community's own DID. A community is an account, named everywhere by its
 * profile record `at://<did>/com.para.community.profile/self`.
 */
export function communityDid(uri: string | undefined): DidString {
  const match = uri ? PROFILE_URI.exec(uri) : null
  if (!match) throw new Error('No se pudo identificar la comunidad.')
  return match[1] as DidString
}

/**
 * Takes one action in a community. The PDS that hosts the community checks it
 * against the community's rules and either records it or refuses with the
 * reason, so a resolved call means the action happened.
 *
 * @NOTE Only accounts on the PDS that hosts the community can act: an account
 * elsewhere must proxy to the community's `#para_community` service with its
 * own signed request, which the app does not do yet.
 */
export async function communityAct(
  agent: Agent,
  communityUri: string | undefined,
  input: Omit<ActInput, 'community'>,
) {
  return agent.pdsClient.call(com.para.community.act, {
    ...input,
    community: communityDid(communityUri),
  })
}

/**
 * A handle slug for a new community: 3 to 40 lowercase letters, digits and
 * inner hyphens, which is what the host accepts. Null when the name leaves
 * nothing usable, so the caller can ask for another name.
 */
export function communitySlug(name: string): string | null {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '')
  return slug.length >= 3 ? slug : null
}

export type {AtUriString}
