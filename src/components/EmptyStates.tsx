import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Empty State Templates ═════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
//
// Usage:
//   <EmptyStateFirstTime
//     icon="🏛️"
//     title={_(msg`Start by voting on an open issue`)}
//     message={_(msg`Your vote shapes community decisions. Browse active proposals and make your voice heard.`)}
//     actionLabel={_(msg`Browse cabildeos →`)}
//     onAction={() => navigation.navigate('Agora')}
//   />
//
//   <EmptyStateNoData
//     icon="📭"
//     title={_(msg`Nothing here yet`)}
//     message={_(msg`Try adjusting your filters or check back later.`)}
//     actionLabel={_(msg`Refresh`)}
//     onAction={refetch}
//   />
//
//   <EmptyStateError
//     message={_(msg`Couldn't load. Tap to retry.`)}
//     onRetry={refetch}
//   />

// ─── First-time user ──────────────────────────────────────────────────────────

export function EmptyStateFirstTime({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: string
  title: string
  message: string
  actionLabel: string
  onAction: () => void
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        a.gap_md,
        {paddingVertical: 48, paddingHorizontal: 24},
      ]}>
      <Text style={{fontSize: 48}}>{icon}</Text>
      <Text
        style={[
          a.font_bold,
          t.atoms.text,
          {fontSize: 17, textAlign: 'center'},
        ]}>
        {title}
      </Text>
      <Text
        style={[
          a.text_center,
          t.atoms.text_contrast_medium,
          {fontSize: 14, lineHeight: 20, maxWidth: 280},
        ]}>
        {message}
      </Text>
      <View style={[a.mt_sm]}>
        <Button
          variant="solid"
          color="primary"
          size="large"
          label={actionLabel}
          onPress={onAction}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      </View>
    </View>
  )
}

// ─── No data (returning user) ─────────────────────────────────────────────────

export function EmptyStateNoData({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: string
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        a.gap_sm,
        {paddingVertical: 40, paddingHorizontal: 24},
      ]}>
      <Text style={{fontSize: 32}}>{icon}</Text>
      <Text
        style={[
          a.font_semi_bold,
          t.atoms.text,
          {fontSize: 15, textAlign: 'center'},
        ]}>
        {title}
      </Text>
      <Text
        style={[
          a.text_center,
          t.atoms.text_contrast_medium,
          {fontSize: 13, lineHeight: 18, maxWidth: 260},
        ]}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <View style={[a.mt_xs]}>
          <Button
            variant="ghost"
            color="primary"
            size="small"
            label={actionLabel}
            onPress={onAction}>
            <ButtonText>{actionLabel}</ButtonText>
          </Button>
        </View>
      )}
    </View>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function EmptyStateError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        a.gap_sm,
        {paddingVertical: 40, paddingHorizontal: 24},
      ]}>
      <Text style={{fontSize: 32}}>⚠️</Text>
      <Text
        style={[
          a.font_semi_bold,
          t.atoms.text,
          {fontSize: 15, textAlign: 'center'},
        ]}>
        {message}
      </Text>
      <View style={[a.mt_xs]}>
        <Button
          variant="solid"
          color="primary"
          size="small"
          label={_(msg`Retry`)}
          onPress={onRetry}>
          <ButtonText>
            <Trans>Retry</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}
