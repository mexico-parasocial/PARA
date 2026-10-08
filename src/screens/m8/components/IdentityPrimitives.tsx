import {type ReactNode} from 'react'
import {View} from 'react-native'
import {type I18n} from '@lingui/core'
import {msg} from '@lingui/core/macro'

import {
  type ProofBrokerGrant,
  type ProofBrokerProofArtifact,
} from '#/lib/im8/types'
import {atoms as a, useTheme, type ViewStyleProp} from '#/alf'
import {Text} from '#/components/Typography'

/*
 * Shared pieces for the Identity & Wallet tabs. Labels mirror the iM8 wallet
 * (iM8/src/screens/Console/constants.ts CLAIM_LABELS) and the status values
 * mubEZ returns (mubEZ/src/types/index.ts), so PARA and iM8 describe the same
 * record the same way.
 */

export type PillTone = 'positive' | 'negative' | 'warning' | 'neutral'

export function Card({children, style}: {children: ReactNode} & ViewStyleProp) {
  const t = useTheme()
  return (
    <View
      style={[
        a.p_md,
        a.gap_sm,
        a.rounded_md,
        a.border,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
        style,
      ]}>
      {children}
    </View>
  )
}

export function SectionHeading({
  title,
  detail,
}: {
  title: string
  detail?: string
}) {
  const t = useTheme()
  return (
    <View style={[a.gap_2xs, a.pt_sm]}>
      <Text style={[a.text_md, a.font_semi_bold, t.atoms.text]}>{title}</Text>
      {detail ? (
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          {detail}
        </Text>
      ) : null}
    </View>
  )
}

export function Pill({label, tone}: {label: string; tone: PillTone}) {
  const t = useTheme()
  const colors = {
    positive: {bg: t.palette.positive_50, fg: t.palette.positive_700},
    negative: {bg: t.palette.negative_50, fg: t.palette.negative_700},
    warning: {bg: t.palette.primary_50, fg: t.palette.primary_700},
    neutral: {bg: t.palette.contrast_50, fg: t.palette.contrast_700},
  }[tone]
  return (
    <View
      style={[
        a.px_sm,
        a.py_2xs,
        a.rounded_sm,
        a.self_start,
        {backgroundColor: colors.bg},
      ]}>
      <Text
        style={[a.text_xs, a.font_semi_bold, {color: colors.fg}]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function EmptyNoteText({children}: {children: ReactNode}) {
  const t = useTheme()
  return (
    <Text
      style={[
        a.text_sm,
        a.leading_snug,
        a.py_md,
        t.atoms.text_contrast_medium,
      ]}>
      {children}
    </Text>
  )
}

export function claimLabel(i18n: I18n, type: string) {
  switch (type) {
    case 'is_verified_public_figure':
      return i18n._(msg`Verified public figure`)
    case 'is_civic_eligible':
      return i18n._(msg`PARA eligibility`)
    case 'has_para_verification':
      return i18n._(msg`PARA verification`)
    case 'has_party_affiliation_match':
      return i18n._(msg`Party affiliation match`)
    case 'is_age_eligible':
      return i18n._(msg`Age eligible`)
    case 'has_backup_coverage':
      return i18n._(msg`Backup coverage`)
    case 'joined_during_founding_period':
      return i18n._(msg`Founding-period membership`)
    case 'has_continuous_party_membership_30d':
      return i18n._(msg`30-day party membership`)
    default:
      return type
  }
}

export function grantStatus(
  i18n: I18n,
  status: ProofBrokerGrant['status'],
): {label: string; tone: PillTone} {
  switch (status) {
    case 'approved':
      return {label: i18n._(msg`Active`), tone: 'positive'}
    case 'pending':
      return {label: i18n._(msg`Pending`), tone: 'warning'}
    case 'suspended':
      return {label: i18n._(msg`Suspended`), tone: 'warning'}
    case 'revoked':
      return {label: i18n._(msg`Revoked`), tone: 'negative'}
    case 'expired':
      return {label: i18n._(msg`Expired`), tone: 'neutral'}
  }
}

export function proofStatus(
  i18n: I18n,
  status: ProofBrokerProofArtifact['status'],
): {label: string; tone: PillTone} {
  switch (status) {
    case 'active':
      return {label: i18n._(msg`Active`), tone: 'positive'}
    case 'pending':
      return {label: i18n._(msg`Pending`), tone: 'warning'}
    case 'suspended':
      return {label: i18n._(msg`Suspended`), tone: 'warning'}
    case 'revoked':
      return {label: i18n._(msg`Revoked`), tone: 'negative'}
    case 'expired':
      return {label: i18n._(msg`Expired`), tone: 'neutral'}
  }
}

export function proofOutcome(
  i18n: I18n,
  outcome: ProofBrokerProofArtifact['outcome'],
) {
  switch (outcome) {
    case 'verified':
      return i18n._(msg`Verified`)
    case 'not-verified':
      return i18n._(msg`Not verified`)
    case 'matched':
      return i18n._(msg`Matched`)
    case 'mismatched':
      return i18n._(msg`Did not match`)
    case 'bounded':
      return i18n._(msg`Within range`)
  }
}

// mubEZ writes ISO timestamps, except rows that take SQLite's
// datetime('now') default ("YYYY-MM-DD HH:MM:SS", UTC), which Hermes
// does not parse.
function parseM8Date(value: string | null | undefined) {
  if (!value) return null
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(i18n: I18n, value: string | null | undefined) {
  const date = parseM8Date(value)
  return date ? i18n.date(date, {dateStyle: 'medium'}) : null
}

export function formatDateTime(i18n: I18n, value: string | null | undefined) {
  const date = parseM8Date(value)
  return date
    ? i18n.date(date, {dateStyle: 'medium', timeStyle: 'short'})
    : null
}
