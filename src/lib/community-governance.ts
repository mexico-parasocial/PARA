import {
  type CommunityGovernanceApplicant,
  type CommunityGovernanceCapability,
  type CommunityGovernanceDeputyRole,
  type CommunityGovernanceHistoryEntry,
  type CommunityGovernanceMetadata,
  type CommunityGovernanceModerator,
  type CommunityGovernanceOfficialRepresentative,
  type CommunityGovernancePerson,
  type CommunityGovernanceRecord,
} from '#/lib/api/para-lexicons'
import {normalizeCommunitySlug as normalizeCommunitySlugString} from '#/lib/strings/community-names'

export const DEFAULT_MODERATOR_CAPABILITIES: CommunityGovernanceCapability[] = [
  'appoint_deputies',
  'edit_role_descriptions',
  'review_applicants',
  'publish_governance_updates',
  'set_official_representatives',
]

export type CommunityGovernanceView = CommunityGovernanceRecord & {
  source: 'network' | 'repo' | 'mock'
  uri?: string
  repoDid?: string
  counters?: CommunityGovernanceCounters
}

export type CommunityGovernanceCounters = {
  members: number
  visiblePosters: number
  policyPosts: number
  matterPosts: number
  badgeHolders: number
}

export function normalizeCommunitySlug(community: string) {
  return normalizeCommunitySlugString(community)
}

export function communityGovernanceRkey(community: string) {
  return normalizeCommunitySlug(community) || 'community'
}

export function communityGovernanceHandleLabel(
  person?: CommunityGovernancePerson | null,
) {
  if (!person) return 'Vacant'
  return person.displayName || person.handle || person.did || 'Unknown'
}

export function buildMockCommunityGovernance(
  communityName: string,
  communityId?: string,
): CommunityGovernanceView {
  const slug = normalizeCommunitySlug(communityName)
  const now = new Date().toISOString()

  return {
    source: 'mock',
    community: communityName,
    communityId,
    slug,
    createdAt: now,
    updatedAt: now,
    moderators: [
      {
        displayName: `${communityName} Steward`,
        handle: `@${slug || 'community'}.mod`,
        role: 'Lead moderator',
        badge: 'Moderation Lead',
        capabilities: DEFAULT_MODERATOR_CAPABILITIES,
      },
      {
        displayName: 'Civic Review Desk',
        handle: '@civic.review',
        role: 'Case moderator',
        badge: 'Safety & Appeals',
        capabilities: [
          'review_applicants',
          'publish_governance_updates',
          'set_official_representatives',
        ],
      },
      {
        displayName: 'RAQ Arbiter',
        handle: '@raq.arbiter',
        role: 'Process moderator',
        badge: 'Procedure',
        capabilities: [
          'appoint_deputies',
          'edit_role_descriptions',
          'publish_governance_updates',
        ],
      },
    ],
    officials: [
      {
        displayName: `${communityName} Spokesperson`,
        office: 'Official representative',
        mandate: 'Policy comms and final statements',
      },
      {
        displayName: `${communityName} Legislative Desk`,
        office: 'Policy coordinator',
        mandate: 'Tracks active policy records and escalations',
      },
      {
        displayName: `${communityName} Matter Desk`,
        office: 'Matter coordinator',
        mandate: 'Curates local incidents and issue threads',
      },
    ],
    deputies: [
      {
        key: 'chief-digital-deputy',
        tier: 'Tier I',
        role: 'Chief Digital Deputy',
        activeHolder: {displayName: `${communityName} Node Prime`},
        activeSince: now,
        votes: 1824,
        applicants: buildApplicants(['Ana C.', 'Luis R.', 'Mar P.']),
        description:
          'Coordinates the digital caucus, breaks tie cases, and translates moderator priorities into deputy assignments.',
        capabilities: [
          'Assign deputy queues',
          'Escalate policy and matter conflicts',
          'Publish weekly operational summaries',
        ],
      },
      {
        key: 'policy-deputy',
        tier: 'Tier II',
        role: 'Policy Deputy',
        activeHolder: {displayName: 'Deliberation Desk'},
        activeSince: now,
        votes: 1268,
        applicants: buildApplicants(['Sofia M.', 'Iker T.']),
        description:
          'Owns structured policy intake, tracks open proposals, and keeps official policy posts aligned with community process.',
        capabilities: [
          'Triage policy proposals',
          'Maintain policy descriptions',
          'Recommend official tagging',
        ],
      },
      {
        key: 'matter-deputy',
        tier: 'Tier II',
        role: 'Matter Deputy',
        activeHolder: {displayName: 'Ground Signal Unit'},
        activeSince: now,
        votes: 1194,
        applicants: buildApplicants(['Vale D.', 'Noe A.', 'Rafa C.']),
        description:
          'Runs active matter threads, incident follow-ups, and local evidence collection for urgent community issues.',
        capabilities: [
          'Curate matter evidence',
          'Organize local case threads',
          'Request moderator review on claims',
        ],
      },
      {
        key: 'mobilization-deputy',
        tier: 'Tier III',
        role: 'Mobilization Deputy',
        activeHolder: {displayName: 'Turnout Relay'},
        activeSince: now,
        votes: 884,
        applicants: buildApplicants(['Paz G.']),
        description:
          'Handles turnout logistics, volunteer coordination, and action prompts tied to live community campaigns.',
        capabilities: [
          'Schedule action pushes',
          'Coordinate volunteer rosters',
          'Update turnout briefings',
        ],
      },
    ],
    metadata: {
      termLengthDays: 90,
      reviewCadence: 'Monthly governance review',
      escalationPath:
        'Lead moderator > civic review desk > public governance update',
      publicContact: `governance@${slug || 'community'}.para`,
      lastPublishedAt: now,
    },
    editHistory: [
      {
        id: 'seed-governance',
        action: 'publish_governance_updates',
        createdAt: now,
        summary: 'Initial governance charter published for the directory.',
      },
    ],
  }
}

export function createEmptyCommunityGovernanceView(
  communityName: string,
  communityId?: string,
): CommunityGovernanceView {
  const now = new Date().toISOString()
  return {
    source: 'network',
    community: communityName,
    communityId,
    slug: normalizeCommunitySlug(communityName),
    createdAt: now,
    updatedAt: now,
    moderators: [],
    officials: [],
    deputies: [],
    metadata: undefined,
    editHistory: [],
    counters: {
      members: 0,
      visiblePosters: 0,
      policyPosts: 0,
      matterPosts: 0,
      badgeHolders: 0,
    },
  }
}

export function normalizeCommunityGovernance(
  raw: unknown,
  fallbackCommunity: string,
  fallbackCommunityId?: string,
): CommunityGovernanceView | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const data = raw as Record<string, unknown>
  const record = (data.record as Record<string, unknown> | undefined) ?? data
  const community = stringOr(record.community) || fallbackCommunity
  const communityId = stringOr(record.communityId) || fallbackCommunityId
  const slug = stringOr(record.slug) || normalizeCommunitySlug(community)
  const moderators = normalizeModerators(record.moderators ?? data.moderators)
  const officials = normalizeOfficials(record.officials ?? data.officials)
  const deputies = normalizeDeputies(record.deputies ?? data.deputies)
  const metadata = normalizeMetadata(record.metadata ?? data.metadata)
  const editHistory = normalizeHistory(record.editHistory ?? data.editHistory)
  const counters = normalizeCounters(
    record.counters ?? data.counters ?? data.summary,
  )

  if (
    !community &&
    moderators.length === 0 &&
    officials.length === 0 &&
    deputies.length === 0
  ) {
    return null
  }

  return {
    source:
      stringOr(record.source ?? data.source) === 'repo'
        ? 'repo'
        : stringOr(record.source ?? data.source) === 'mock'
          ? 'mock'
          : 'network',
    community,
    communityId,
    slug,
    createdAt: stringOr(record.createdAt) || new Date().toISOString(),
    updatedAt:
      stringOr(record.updatedAt) ||
      metadata?.lastPublishedAt ||
      new Date().toISOString(),
    moderators,
    officials,
    deputies,
    metadata,
    editHistory,
    counters,
    uri: stringOr(data.uri),
    repoDid:
      stringOr(data.repoDid) ||
      (stringOr(data.uri)?.split('/')[2] ?? undefined),
  }
}

export function createCommunityGovernanceRecord(
  governance: CommunityGovernanceView,
): CommunityGovernanceRecord & {$type: string} {
  return {
    $type: 'com.para.community.governance',
    community: governance.community,
    communityId: governance.communityId,
    slug: governance.slug,
    createdAt: governance.createdAt,
    updatedAt: governance.updatedAt,
    moderators: governance.moderators,
    officials: governance.officials,
    deputies: governance.deputies,
    metadata: governance.metadata,
    editHistory: governance.editHistory,
  }
}

export function isCommunityModerator(
  governance: CommunityGovernanceView | null | undefined,
  did: string | undefined,
) {
  if (!governance || !did) return false
  return governance.moderators.some(mod => mod.did === did)
}

export function getModeratorCapabilities(
  governance: CommunityGovernanceView | null | undefined,
  did: string | undefined,
) {
  if (!governance || !did) return []
  const moderator = governance.moderators.find(mod => mod.did === did)
  return moderator?.capabilities || []
}

export function canManageGovernance(
  governance: CommunityGovernanceView | null | undefined,
  did: string | undefined,
) {
  if (!governance || !did) return false
  if (governance.repoDid && governance.repoDid !== did) {
    return false
  }
  return isCommunityModerator(governance, did)
}

export function appendGovernanceHistoryEntry(
  history: CommunityGovernanceHistoryEntry[] | undefined,
  entry: Omit<CommunityGovernanceHistoryEntry, 'id' | 'createdAt'>,
) {
  return [
    {
      ...entry,
      id: `${entry.action}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    },
    ...(history || []),
  ].slice(0, 20)
}

function buildApplicants(names: string[]): CommunityGovernanceApplicant[] {
  return names.map((displayName, index) => ({
    displayName,
    appliedAt: new Date(Date.now() - index * 86400000).toISOString(),
    status: 'applied',
  }))
}

function normalizeModerators(raw: unknown): CommunityGovernanceModerator[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const value = item as Record<string, unknown>
      const member =
        value.member && typeof value.member === 'object'
          ? (value.member as Record<string, unknown>)
          : undefined
      return {
        did: stringOr(value.did) || stringOr(member?.did),
        handle: stringOr(value.handle) || stringOr(member?.handle),
        displayName:
          stringOr(value.displayName) ||
          stringOr(value.name) ||
          stringOr(member?.displayName) ||
          stringOr(member?.name) ||
          undefined,
        avatar: stringOr(value.avatar) || stringOr(member?.avatar),
        role: stringOr(value.role) || 'Moderator',
        badge: stringOr(value.badge) || 'Moderator',
        capabilities: normalizeCapabilityList(value.capabilities),
      }
    })
    .filter(Boolean) as CommunityGovernanceModerator[]
}

function normalizeOfficials(
  raw: unknown,
): CommunityGovernanceOfficialRepresentative[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const value = item as Record<string, unknown>
      const member =
        value.member && typeof value.member === 'object'
          ? (value.member as Record<string, unknown>)
          : undefined
      return {
        did: stringOr(value.did) || stringOr(member?.did),
        handle: stringOr(value.handle) || stringOr(member?.handle),
        displayName:
          stringOr(value.displayName) ||
          stringOr(value.name) ||
          stringOr(member?.displayName) ||
          stringOr(member?.name) ||
          undefined,
        avatar: stringOr(value.avatar) || stringOr(member?.avatar),
        office: stringOr(value.office) || 'Representative',
        mandate: stringOr(value.mandate) || 'No mandate published yet.',
      }
    })
    .filter(Boolean) as CommunityGovernanceOfficialRepresentative[]
}

function normalizeDeputies(raw: unknown): CommunityGovernanceDeputyRole[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const value = item as Record<string, unknown>
      const role =
        stringOr(value.role) || stringOr(value.title) || 'Deputy Role'
      return {
        key: stringOr(value.key) || normalizeCommunitySlug(role),
        tier: stringOr(value.tier) || 'Tier II',
        role,
        description:
          stringOr(value.description) || 'No public role description yet.',
        capabilities: normalizeStringList(value.capabilities),
        activeHolder: normalizePerson(
          (value.activeHolder as Record<string, unknown> | undefined) ??
            (value.member as Record<string, unknown> | undefined) ?? {
              displayName:
                stringOr(value.activeHolderName) ||
                stringOr(value.activeHolderHandle),
              handle: stringOr(value.activeHolderHandle),
              did: stringOr(value.activeHolderDid),
            },
        ),
        activeSince: stringOr(value.activeSince),
        votes: numberOr(value.votes) || numberOr(value.votesBackingRole),
        applicants: normalizeApplicants(value.applicants),
      }
    })
    .filter(Boolean) as CommunityGovernanceDeputyRole[]
}

function normalizeApplicants(raw: unknown): CommunityGovernanceApplicant[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (typeof item === 'string') {
        return {
          displayName: item,
          appliedAt: new Date().toISOString(),
          status: 'applied' as const,
        }
      }
      if (!item || typeof item !== 'object') return null
      const value = item as Record<string, unknown>
      return {
        did: stringOr(value.did),
        handle: stringOr(value.handle),
        displayName:
          stringOr(value.displayName) || stringOr(value.name) || undefined,
        avatar: stringOr(value.avatar),
        appliedAt: stringOr(value.appliedAt) || new Date().toISOString(),
        status:
          stringOr(value.status) === 'approved'
            ? 'approved'
            : stringOr(value.status) === 'rejected'
              ? 'rejected'
              : 'applied',
        note: stringOr(value.note),
      }
    })
    .filter(Boolean) as CommunityGovernanceApplicant[]
}

function normalizeMetadata(
  raw: unknown,
): CommunityGovernanceMetadata | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const value = raw as Record<string, unknown>
  return {
    termLengthDays: numberOr(value.termLengthDays),
    reviewCadence: stringOr(value.reviewCadence),
    escalationPath: stringOr(value.escalationPath),
    publicContact: stringOr(value.publicContact),
    lastPublishedAt: stringOr(value.lastPublishedAt),
    state: stringOr(value.state),
    matterFlairIds: optionalStringList(value.matterFlairIds),
    policyFlairIds: optionalStringList(value.policyFlairIds),
  }
}

function normalizeHistory(raw: unknown): CommunityGovernanceHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const value = item as Record<string, unknown>
      return {
        id:
          stringOr(value.id) ||
          `${stringOr(value.action) || 'update'}-${Date.now()}`,
        action: stringOr(value.action) || 'publish_governance_updates',
        actorDid: stringOr(value.actorDid),
        actorHandle: stringOr(value.actorHandle),
        createdAt: stringOr(value.createdAt) || new Date().toISOString(),
        summary: stringOr(value.summary) || 'Governance update published.',
      }
    })
    .filter(Boolean) as CommunityGovernanceHistoryEntry[]
}

function normalizePerson(
  raw: Record<string, unknown> | undefined,
): CommunityGovernancePerson | undefined {
  if (!raw) return undefined
  const displayName =
    stringOr(raw.displayName) || stringOr(raw.name) || undefined
  const handle = stringOr(raw.handle)
  const did = stringOr(raw.did)
  const avatar = stringOr(raw.avatar)
  if (!displayName && !handle && !did && !avatar) return undefined
  return {displayName, handle, did, avatar}
}

function normalizeCapabilityList(
  raw: unknown,
): CommunityGovernanceCapability[] {
  const values = normalizeStringList(raw)
  return values.filter((value): value is CommunityGovernanceCapability =>
    DEFAULT_MODERATOR_CAPABILITIES.includes(
      value as CommunityGovernanceCapability,
    ),
  )
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function optionalStringList(raw: unknown): string[] | undefined {
  return Array.isArray(raw) ? normalizeStringList(raw) : undefined
}

function normalizeCounters(
  raw: unknown,
): CommunityGovernanceCounters | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const value = raw as Record<string, unknown>
  return {
    members: numberOr(value.members),
    visiblePosters: numberOr(value.visiblePosters),
    policyPosts: numberOr(value.policyPosts),
    matterPosts: numberOr(value.matterPosts),
    badgeHolders: numberOr(value.badgeHolders),
  }
}

function stringOr(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}

function numberOr(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
