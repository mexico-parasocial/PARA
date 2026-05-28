import {type CabildeoView} from '#/lib/cabildeo-client'
import {getPostBadges} from '#/lib/post-flairs'

export type DebateKind = 'policy' | 'matter'

export type DebateBadge = {
  kind: DebateKind
  label: string
  color: string
  bgColor: string
}

export type ViewerParticipation = {
  label: string
  accentColor: string
  accentBackground: string
  optionLabel?: string
}

const FALLBACK_BADGES: Record<DebateKind, DebateBadge> = {
  policy: {
    kind: 'policy',
    label: 'Policy',
    color: '#2563EB',
    bgColor: '#DBEAFE',
  },
  matter: {
    kind: 'matter',
    label: 'Matter',
    color: '#EA580C',
    bgColor: '#FED7AA',
  },
}

export const CABILDEO_PHASE_META = {
  draft: {label: 'Draft', color: '#6B7280'},
  open: {label: 'Open', color: '#0EA5E9'},
  deliberating: {label: 'Deliberating', color: '#F59E0B'},
  voting: {label: 'Voting', color: '#22C55E'},
  resolved: {label: 'Resolved', color: '#8B5CF6'},
} as const

export function getCabildeoBadge(cabildeo: Pick<CabildeoView, 'flairs'>) {
  const badge = getPostBadges({flairs: cabildeo.flairs}).find(
    (
      item,
    ): item is ReturnType<typeof getPostBadges>[number] & {
      kind: DebateKind
    } => item.kind === 'policy' || item.kind === 'matter',
  )

  if (!badge) {
    return FALLBACK_BADGES.policy
  }

  return {
    kind: badge.kind,
    label: badge.label,
    color: badge.color,
    bgColor: badge.bgColor,
  } satisfies DebateBadge
}

export function getCabildeoPhaseMeta(phase: string) {
  return (
    CABILDEO_PHASE_META[phase as keyof typeof CABILDEO_PHASE_META] || {
      label: phase,
      color: '#6B7280',
    }
  )
}

export function getCabildeoCommunities(
  cabildeo: Pick<CabildeoView, 'community' | 'communities'>,
) {
  return [cabildeo.community, ...(cabildeo.communities || [])].filter(Boolean)
}

export function getCabildeoTotalParticipants(
  cabildeo: Pick<CabildeoView, 'voteTotals' | 'positionCounts'>,
) {
  return (
    (cabildeo.voteTotals?.total || 0) + (cabildeo.positionCounts?.total || 0)
  )
}

export function getCabildeoLeadingOption(
  cabildeo: Pick<
    CabildeoView,
    'outcome' | 'optionSummary' | 'voteTotals' | 'positionCounts'
  >,
) {
  const outcomeBreakdown = cabildeo.outcome?.breakdown || []
  if (outcomeBreakdown.length > 0) {
    return [...outcomeBreakdown].sort(
      (a, b) => b.effectiveVotes - a.effectiveVotes,
    )[0]
  }

  const optionSummary = cabildeo.optionSummary || []
  if (optionSummary.length > 0) {
    return [...optionSummary].sort(
      (a, b) => b.votes - a.votes || b.positions - a.positions,
    )[0]
  }

  return null
}

export function getViewerParticipation(
  cabildeo: Pick<CabildeoView, 'options' | 'userContext'>,
): ViewerParticipation | null {
  const directOptionIndex = cabildeo.userContext?.viewerVoteOption
  if (typeof directOptionIndex === 'number') {
    const optionLabel = cabildeo.options[directOptionIndex]?.label
    return {
      label: cabildeo.userContext?.viewerVoteIsDirect
        ? 'You voted'
        : 'Your ceded vote',
      accentColor: '#166534',
      accentBackground: '#DCFCE7',
      optionLabel,
    }
  }

  if (cabildeo.userContext?.delegateVoteEvent) {
    const optionLabel =
      cabildeo.options[cabildeo.userContext.delegateVoteEvent.optionIndex]
        ?.label
    return {
      label: 'Receiving voice voted',
      accentColor: '#7C3AED',
      accentBackground: '#EDE9FE',
      optionLabel,
    }
  }

  if (cabildeo.userContext?.hasDelegatedTo) {
    return {
      label: 'Vote ceded',
      accentColor: '#92400E',
      accentBackground: '#FEF3C7',
    }
  }

  return null
}
