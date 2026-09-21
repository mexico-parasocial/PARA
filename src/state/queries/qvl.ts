import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {issueParaVoteProof} from '#/lib/api/vote-proof'
import {isQvlUnavailable} from '#/lib/qvl-status'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'qvl'

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const qvlVotesQueryKey = (proposal: string) => [
  RQKEY_ROOT,
  'votes',
  proposal,
]
export const qvlIntensitiesQueryKey = (proposal: string) => [
  RQKEY_ROOT,
  'intensities',
  proposal,
]
export const qvlDelegationsQueryKey = (
  delegator?: string,
  delegate?: string,
) => [RQKEY_ROOT, 'delegations', delegator || '', delegate || '']
export const qvlDeliberationsQueryKey = (proposal: string) => [
  RQKEY_ROOT,
  'deliberations',
  proposal,
]
export const qvlTallySimulationQueryKey = (proposal: string) => [
  RQKEY_ROOT,
  'tally',
  proposal,
]
export const qvlAuditTrailQueryKey = (proposal: string) => [
  RQKEY_ROOT,
  'audit',
  proposal,
]

// ─── Types (mirroring backend response shapes) ───────────────────────────────

export interface QvlVote {
  uri: string
  cid: string
  creator: string
  proposal: string
  community: string
  signal: number
  createdAt: string
}

export interface QvlIntensity {
  uri: string
  cid: string
  proposal: string
  voter: string
  signal: number
  units: number
  creditsSpent: number
  delegatedFrom?: string[]
  delegationDepth?: number
  effectiveWeight?: string
  createdAt: string
}

export interface QvlDelegation {
  uri: string
  cid: string
  delegate: string
  delegator: string
  delegateRole?: string
  party?: string
  scope: {
    mode: string
    community?: string
    topic?: string
    proposal?: string
  }
  expiresAt?: string
  revokedAt?: string
  createdAt: string
}

export interface QvlDeliberation {
  uri: string
  cid: string
  creator: string
  proposal: string
  body: string
  stance: string
  agreeCount: number
  disagreeCount: number
  passCount: number
  /**
   * The requesting viewer's own position, and only theirs — the AppView does
   * not serve anyone else's side on an argument.
   */
  viewerDirection?: 'agree' | 'disagree' | 'pass'
  createdAt: string
}

export interface QvlDeliberationVote {
  uri: string
  cid: string
  creator: string
  statement: string
  voter: string
  vote: 'agree' | 'disagree' | 'pass'
  createdAt: string
}

export interface TallyResult {
  voteCount: number
  signalSum: string
  signalAverage: string
  quorumMet: boolean
  quorumTarget: number
  effectiveWeightSum: string
  breakdown?: {signal: number; count: number}[]
}

export interface TallyMetrics {
  maxWeightRatio: string
  effectiveParticipants: string
  revocationRate: string
  directVotePct: string
  shadowMode: boolean
}

export interface TallySimulation {
  flat: TallyResult
  sqrtN: TallyResult
  correlation: TallyResult
  metrics: TallyMetrics
}

export interface AuditTrail {
  proposal: string
  votes: {voter: string; signal: number; createdAt: string}[]
  intensities: {
    voter: string
    signal: number
    units: number
    creditsSpent: number
    delegatedFrom?: string[]
    delegationDepth?: number
    effectiveWeight?: string
    createdAt: string
  }[]
  delegations: {
    delegate: string
    delegator: string
    delegateRole?: string
    scopeMode: string
    scopeCommunity?: string
    scopeProposal?: string
    createdAt: string
  }[]
  tallies: {
    flat: {steps: {description: string; value: string}[]; result: TallyResult}
    sqrtN: {steps: {description: string; value: string}[]; result: TallyResult}
    correlation: {
      steps: {description: string; value: string}[]
      result: TallyResult
    }
  }
  metrics: TallyMetrics
}

// ─── Read Queries ────────────────────────────────────────────────────────────

export function useQvlVotesQuery(proposal: string) {
  const agent = useAgent()
  return useQuery<QvlVote[]>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: qvlVotesQueryKey(proposal),
    queryFn: async () => {
      const res = await agent.call('com.para.community.listVotes', {proposal})
      if (!res.success) throw new Error('Failed to load votes')
      return res.data.votes as QvlVote[]
    },
  })
}

export function useQvlIntensitiesQuery(proposal: string) {
  const agent = useAgent()
  return useQuery<QvlIntensity[]>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: qvlIntensitiesQueryKey(proposal),
    queryFn: async () => {
      const res = await agent.call('com.para.community.listIntensities', {
        proposal,
      })
      if (!res.success) throw new Error('Failed to load intensities')
      return res.data.intensities as QvlIntensity[]
    },
  })
}

export function useQvlDelegationsQuery(
  opts: {delegator?: string; delegate?: string} = {},
) {
  const agent = useAgent()
  return useQuery<QvlDelegation[]>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: qvlDelegationsQueryKey(opts.delegator, opts.delegate),
    queryFn: async () => {
      const res = await agent.call('com.para.community.listDelegations', {
        delegator: opts.delegator,
        delegate: opts.delegate,
      })
      if (!res.success) throw new Error('Failed to load delegations')
      return res.data.delegations as QvlDelegation[]
    },
  })
}

export function useQvlDeliberationsQuery(proposal: string) {
  const agent = useAgent()
  return useQuery<QvlDeliberation[]>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: qvlDeliberationsQueryKey(proposal),
    queryFn: async () => {
      const res = await agent.call('com.para.community.listDeliberations', {
        proposal,
      })
      if (!res.success) throw new Error('Failed to load deliberations')
      return res.data.statements as QvlDeliberation[]
    },
  })
}

export function useQvlTallySimulationQuery(proposal: string) {
  const agent = useAgent()
  return useQuery<TallySimulation>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: [
      ...qvlTallySimulationQueryKey(proposal),
      agent.session?.did ?? null,
    ],
    enabled: Boolean(proposal),
    retry: (failureCount, error) =>
      !isQvlUnavailable(error) && failureCount < 2,
    queryFn: async () => {
      const res = await agent.call('com.para.community.getTallySimulation', {
        proposal,
      })
      if (!res.success) throw new Error('Failed to load tally simulation')
      return {
        flat: res.data.flat as TallyResult,
        sqrtN: res.data.sqrtN as TallyResult,
        correlation: res.data.correlation as TallyResult,
        metrics: res.data.metrics as TallyMetrics,
      }
    },
  })
}

export function useQvlAuditTrailQuery(proposal: string) {
  const agent = useAgent()
  return useQuery<AuditTrail>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: qvlAuditTrailQueryKey(proposal),
    queryFn: async () => {
      const res = await agent.call('com.para.community.getAuditTrail', {
        proposal,
      })
      if (!res.success) throw new Error('Failed to load audit trail')
      return res.data as AuditTrail
    },
  })
}

// ─── Write Mutations ─────────────────────────────────────────────────────────

/*
 * `useCastVoteMutation` and `useCastIntensityMutation` were removed on
 * 2026-09-18 (E0 of the ballot freeze). Both wrote a ballot into the voter's
 * OWN public repo: `com.para.community.vote` carried `voter` (DID) beside
 * `signal`, and `com.para.community.intensity` additionally published
 * `units`, `creditsSpent`, `effectiveWeight` and `delegatedFrom` — the
 * delegation graph that OD-7 §5b names as more re-identifying than the
 * ballots themselves.
 *
 * Neither had a caller anywhere in the app. They are deleted rather than
 * flagged off, so that wiring a binding ballot back up is a deliberate act
 * that has to re-read this: a record written to a public repo and sequenced
 * to the firehose cannot be unpublished, and both lexicons mark `voter` and
 * `signal` as REQUIRED, so there is no privacy-preserving way to use them.
 *
 * The replacement is not a mutation in this file. Per OD-7 §5a/§5b a ballot
 * must leave the voter's repo entirely: submitted to a tally endpoint, with a
 * client-derived nullifier anchored to the credential, `signal` carried as a
 * Pedersen commitment with a range proof, and the tally opened only in
 * aggregate. See WatZappa/docs/OD-7-BALLOT-IDENTITY-REGISTRATION.md.
 *
 * Deliberation voting (`useCastDeliberationVoteMutation`, below) is
 * deliberately untouched: debate is meant to be attributable.
 */
export function useCreateDelegationMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      delegate,
      delegateRole,
      party,
      scope,
    }: {
      delegate: string
      delegateRole?: string
      party?: string
      scope: {
        mode: string
        community?: string
        topic?: string
        proposal?: string
      }
    }) => {
      if (!agent.session) throw new Error('Not logged in')
      return agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'com.para.community.delegation',
        record: {
          $type: 'com.para.community.delegation',
          delegate,
          delegator: agent.session.did,
          delegateRole,
          party,
          scope,
          createdAt: new Date().toISOString(),
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [RQKEY_ROOT, 'delegations']})
    },
  })
}

export function useCreateDeliberationMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      proposal,
      community,
      body,
      stance,
    }: {
      proposal: string
      community: string
      body: string
      stance: string
    }) => {
      if (!agent.session) throw new Error('Not logged in')
      return agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'com.para.community.deliberation',
        record: {
          $type: 'com.para.community.deliberation',
          proposal,
          community,
          author: agent.session.did,
          body,
          stance,
          createdAt: new Date().toISOString(),
        },
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: qvlDeliberationsQueryKey(variables.proposal),
      })
    },
  })
}

export function useCastDeliberationVoteMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      deliberation,
      direction,
    }: {
      deliberation: string
      direction: 'agree' | 'disagree' | 'pass'
    }) => {
      if (!agent.session) throw new Error('Not logged in')
      const proof = await issueParaVoteProof(agent, {
        subjectUri: deliberation,
        subjectType: 'community_deliberation',
      })
      return agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'com.para.community.deliberationVote',
        record: {
          $type: 'com.para.community.deliberationVote',
          deliberation,
          voter: agent.session.did,
          direction,
          voteNullifier: proof?.voteNullifier,
          eligibilityProofRef: proof?.eligibilityProofRef,
          createdAt: new Date().toISOString(),
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [RQKEY_ROOT, 'deliberations']})
    },
  })
}
