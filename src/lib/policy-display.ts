import {type com} from '#/lexicons'

export type PolicyTally = com.para.civic.defs.PolicyTally

/** Every weight a policy ballot can carry, in display order. */
export const POLICY_SIGNALS = [-3, -2, -1, 0, 1, 2, 3] as const

const SIGNAL_LABELS: Record<number, string> = {
  [-3]: 'Rechazo total',
  [-2]: 'Rechazo',
  [-1]: 'Rechazo leve',
  0: 'Neutral',
  1: 'Apoyo leve',
  2: 'Apoyo',
  3: 'Apoyo total',
}

// Diverging red → grey → green; the same hues the swipe control uses.
const SIGNAL_COLORS: Record<number, string> = {
  [-3]: '#DC2626',
  [-2]: '#EF4444',
  [-1]: '#F87171',
  0: '#9CA3AF',
  1: '#4ADE80',
  2: '#22C55E',
  3: '#16A34A',
}

export function getSignalLabel(signal: number) {
  return SIGNAL_LABELS[signal] ?? ''
}

export function getSignalColor(signal: number) {
  return SIGNAL_COLORS[Math.max(-3, Math.min(3, Math.round(signal)))]
}

export function formatSignal(signal: number) {
  return signal > 0 ? `+${signal}` : String(signal)
}

const OUTCOME_META: Record<string, {label: string; color: string}> = {
  insufficient_quorum: {label: 'Sin quórum', color: '#6B7280'},
  contested: {label: 'En disputa', color: '#F59E0B'},
  passed: {label: 'Con apoyo', color: '#22C55E'},
  strong_passed: {label: 'Apoyo fuerte', color: '#16A34A'},
  failed: {label: 'Sin apoyo', color: '#EF4444'},
}

export function getOutcomeMeta(outcome: string) {
  return OUTCOME_META[outcome] ?? OUTCOME_META.insufficient_quorum
}

/** The tally publishes the mean as a string; anything unreadable counts as 0. */
export function parseSignalAverage(value: string | undefined) {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? Math.max(-3, Math.min(3, parsed)) : 0
}

/** One count per weight from -3 to +3, with absent buckets filled with zero. */
export function getSignalCounts(tally: Pick<PolicyTally, 'breakdown'>) {
  const counts = POLICY_SIGNALS.map(() => 0)
  for (const bucket of tally.breakdown) {
    const index = bucket.signal + 3
    if (index >= 0 && index < counts.length) counts[index] += bucket.count
  }
  return counts
}

/** Share of the quorum reached, capped at 1. */
export function getQuorumProgress(
  tally: Pick<PolicyTally, 'voteCount' | 'quorumTarget'>,
) {
  if (tally.quorumTarget <= 0) return 0
  return Math.min(1, tally.voteCount / tally.quorumTarget)
}

/**
 * A policy post carries its title as the first line of its text. A single
 * long paragraph is split at the first sentence so the card still has a title.
 */
export function splitPolicyText(text: string) {
  const trimmed = text.trim()
  const lines = trimmed.split(/\r?\n/)
  const first = lines[0].trim()
  const rest = lines.slice(1).join('\n').trim()
  if (rest || first.length <= 90) return {title: first, body: rest}

  const sentenceEnd = first.search(/[.!?¡¿](\s|$)/)
  if (sentenceEnd > 0 && sentenceEnd < 140) {
    return {
      title: first.slice(0, sentenceEnd + 1),
      body: first.slice(sentenceEnd + 1).trim(),
    }
  }
  return {title: first, body: ''}
}

/**
 * The matter a policy is filed under is its single-pipe flair (`|#NiUnaMenos`);
 * double-pipe flairs (`||#`) describe the policy itself.
 */
export function getMatterTag(flairs: string[] | undefined) {
  return flairs?.find(flair => /^\|#[^|#]/.test(flair))
}

/** `|#NiUnaMenos` → `Ni Una Menos`, for matters the flair catalog does not know. */
export function humanizeFlairTag(tag: string) {
  return tag
    .replace(/^\|+#/, '')
    .replace(/([a-záéíóúñ0-9])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
    .trim()
}
