import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type SortitionCandidate,
  type SortitionRun,
} from '#/state/queries/matrix'
import {atoms as a, useTheme} from '#/alf'
import {AvatarStack} from '#/components/AvatarStack'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Group3_Stroke2_Corner0_Rounded as Group} from '#/components/icons/Group'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/SettingsGear2'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

export type SortitionStatus = 'none' | 'pending' | 'active'

export interface SortitionStatusCardProps {
  status: SortitionStatus
  onConfigure: () => void
  canConfigure: boolean
  jurorCount?: number
  expiresAt?: string
  run?: SortitionRun | null
  selected?: SortitionCandidate[]
  viewerCandidate?: SortitionCandidate | null
}

export function SortitionStatusCard({
  status,
  onConfigure,
  canConfigure,
  jurorCount = 100,
  run,
  selected = [],
  viewerCandidate,
}: SortitionStatusCardProps) {
  const {_} = useLingui()
  const t = useTheme()
  const resolvedStatus: SortitionStatus = run
    ? run.status === 'active'
      ? 'active'
      : run.status === 'scheduled'
        ? 'pending'
        : 'none'
    : status
  const count = run?.selectedCount || selected.length || jurorCount
  const isSelected = viewerCandidate?.selected === true

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.justify_between,
        a.p_md,
        a.rounded_md,
        a.border,
        {
          backgroundColor:
            resolvedStatus === 'active'
              ? t.palette.primary_50
              : resolvedStatus === 'pending'
              ? t.palette.yellow + '18'
              : t.palette.contrast_50,
          borderColor:
            resolvedStatus === 'active'
              ? t.palette.primary_500
              : resolvedStatus === 'pending'
              ? t.palette.yellow
              : t.palette.contrast_100,
        },
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_md, a.flex_1]}>
        <View
          style={[
            a.p_sm,
            a.rounded_full,
            {
              backgroundColor:
                resolvedStatus === 'active'
                  ? t.palette.primary_500
                  : resolvedStatus === 'pending'
                  ? t.palette.yellow
                  : t.palette.contrast_200,
            },
          ]}>
          {resolvedStatus === 'pending' ? (
            <Loader size="sm" color="white" />
          ) : (
            <Group fill="white" width={20} />
          )}
        </View>

        <View style={[a.flex_1]}>
          <Text style={[a.font_bold, a.text_sm]}>
            {resolvedStatus === 'active' ? (
              <Trans>Asamblea Aleatoria Activa</Trans>
            ) : resolvedStatus === 'pending' ? (
              <Trans>Sorteo programado</Trans>
            ) : (
              <Trans>Gobernanza Abierta</Trans>
            )}
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {resolvedStatus === 'active' ? (
              isSelected ? (
                <Trans>Fuiste seleccionado por Drand para deliberar.</Trans>
              ) : (
                <Trans>{count} jurados seleccionados por Drand</Trans>
              )
            ) : resolvedStatus === 'pending' ? (
              <Trans>Esperando el round {run?.drandRound} de Drand</Trans>
            ) : (
              <Trans>Deliberación masiva sin sorteo</Trans>
            )}
          </Text>
        </View>
      </View>

      {canConfigure && resolvedStatus === 'none' && (
        <Button
          label={_(msg`Configurar Sorteo`)}
          onPress={onConfigure}
          size="small"
          variant="ghost"
          color="secondary">
          <ButtonText>
            <Trans>Sortear</Trans>
          </ButtonText>
          <ButtonIcon icon={SettingsIcon} />
        </Button>
      )}

      {resolvedStatus === 'active' && (
        <View style={[a.flex_row, a.align_center, a.gap_md]}>
          <AvatarStack
            profiles={[]}
            numPending={4}
            size={24}
            backgroundColor={t.palette.primary_50}
          />
          <View style={[a.flex_row, a.align_center, a.gap_xs]}>
            <CheckIcon fill={t.palette.primary_500} width={16} />
            <Text style={[a.text_xs, {color: t.palette.primary_500, fontWeight: 'bold'}]}>
              <Trans>Verificado</Trans>
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
