import {
  canManageGovernance,
  type CommunityGovernanceView,
  holdsVerifiedRole,
  normalizeCommunityGovernance,
} from './community-governance'

const OWNER = 'did:plc:owner'
const MOD = 'did:plc:mod'
const OUTSIDER = 'did:plc:outsider'
const NOW = new Date('2026-11-07T00:00:00Z')

function view(
  overrides: Partial<CommunityGovernanceView> = {},
): CommunityGovernanceView {
  return {
    ...normalizeCommunityGovernance({}, 'mx-test'),
    ...overrides,
  }
}

describe('holdsVerifiedRole', () => {
  const governance = view({
    roleHolders: [
      {did: OWNER, role: 'owner', effectiveAt: '2026-01-01T00:00:00Z'},
      {
        did: MOD,
        role: 'moderator',
        effectiveAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-12-01T00:00:00Z',
      },
    ],
  })

  it('accepts a holder of the role', () => {
    expect(holdsVerifiedRole(governance, OWNER, ['owner'], NOW)).toBe(true)
    expect(holdsVerifiedRole(governance, MOD, ['moderator'], NOW)).toBe(true)
  })

  it('refuses another role and anyone not listed', () => {
    expect(holdsVerifiedRole(governance, MOD, ['owner'], NOW)).toBe(false)
    expect(holdsVerifiedRole(governance, OUTSIDER, ['owner'], NOW)).toBe(false)
    expect(holdsVerifiedRole(governance, undefined, ['owner'], NOW)).toBe(false)
  })

  it('refuses a role past its expiry', () => {
    const later = new Date('2026-12-02T00:00:00Z')
    expect(holdsVerifiedRole(governance, MOD, ['moderator'], later)).toBe(false)
  })
})

describe('canManageGovernance', () => {
  it('does not trust a moderator the record lists for itself', () => {
    const governance = view({
      repoDid: OUTSIDER,
      moderators: [
        {
          did: OUTSIDER,
          role: 'Moderator',
          badge: 'MOD',
          capabilities: ['publish_governance_updates'],
        },
      ] as CommunityGovernanceView['moderators'],
      roleHolders: [],
    })
    expect(canManageGovernance(governance, OUTSIDER)).toBe(false)
  })

  it('needs the record to be the viewer own as well as a verified role', () => {
    const roleHolders = [
      {did: MOD, role: 'moderator', effectiveAt: '2026-01-01T00:00:00Z'},
    ]
    expect(canManageGovernance(view({repoDid: MOD, roleHolders}), MOD)).toBe(
      true,
    )
    expect(canManageGovernance(view({repoDid: OWNER, roleHolders}), MOD)).toBe(
      false,
    )
  })
})

describe('normalizeCommunityGovernance', () => {
  it('reads admission mode and role definitions, defaulting to open', () => {
    const closed = normalizeCommunityGovernance(
      {
        admissionMode: 'assembly_approval',
        roleDefinitions: [
          {
            role: 'moderator',
            howToObtain: 'Receive an appointment.',
            responsibilities: ['Review reports'],
            actions: ['member.suspend'],
            permissions: ['moderate'],
          },
          {howToObtain: 'no role, dropped'},
        ],
      },
      'mx-test',
    )
    expect(closed.admissionMode).toBe('assembly_approval')
    expect(closed.roleDefinitions).toEqual([
      {
        role: 'moderator',
        howToObtain: 'Receive an appointment.',
        responsibilities: ['Review reports'],
        actions: ['member.suspend'],
        permissions: ['moderate'],
      },
    ])
    expect(normalizeCommunityGovernance({}, 'mx-test').admissionMode).toBe(
      'open',
    )
  })
})
