import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {isQvlUnavailable} from '#/lib/qvl-status'
import {useQvlTallySimulationQuery} from '#/state/queries/qvl'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {ShadowTallyChart} from './ShadowTallyChart'

/** Server release safeguards and experimental results share one visible state. */
export function QuadraticTallyPanel({proposalUri}: {proposalUri: string}) {
  const t = useTheme()
  const {_} = useLingui()
  const {data, error, isPending, isFetching, refetch} =
    useQvlTallySimulationQuery(proposalUri)

  if (isPending) {
    return (
      <View style={[a.py_2xl, a.align_center]}>
        <Loader size="lg" />
      </View>
    )
  }

  if (error) {
    return isQvlUnavailable(error) ? (
      <InDevelopmentCard />
    ) : (
      <UnavailableCard onRetry={() => void refetch()} isFetching={isFetching} />
    )
  }

  return (
    <View style={[a.gap_lg]}>
      <View
        style={[
          a.p_lg,
          a.rounded_md,
          a.border,
          a.gap_md,
          t.atoms.bg,
          t.atoms.border_contrast_low,
        ]}>
        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <ShadowBadge />
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>No decide nada</Trans>
          </Text>
        </View>
        <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
          <Trans>Comparación experimental de conteos</Trans>
        </Text>
        <ShadowTallyChart
          flat={Number(data.flat.signalAverage)}
          sqrtN={Number(data.sqrtN.signalAverage)}
        />
        <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            Los conteos plano y ponderado usan registros distintos. No son
            resultados oficiales. El ajuste por correlación no dispone de un
            estado de cálculo verificable y no se muestra.
          </Trans>
        </Text>
      </View>

      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        <Metric
          label={_(msg`Participantes efectivos`)}
          value={data.metrics.effectiveParticipants}
        />
        <Metric
          label={_(msg`Peso de la voz más grande`)}
          value={asPercent(data.metrics.maxWeightRatio, 100)}
        />
        <Metric
          label={_(msg`Votó directo, sin ceder`)}
          value={asPercent(data.metrics.directVotePct)}
        />
        <Metric
          label={_(msg`Cesiones retiradas`)}
          value={asPercent(data.metrics.revocationRate)}
        />
      </View>
    </View>
  )
}

function InDevelopmentCard() {
  const t = useTheme()
  return (
    <View
      style={[
        a.p_lg,
        a.rounded_md,
        a.border,
        a.gap_sm,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[a.font_semi_bold, a.text_md, t.atoms.text]}>
        <Trans>El voto cuadrático está en desarrollo</Trans>
      </Text>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
        <Trans>
          Las estadísticas de papeletas están bloqueadas hasta contar con un
          sistema de publicación que proteja la privacidad. Activar un
          experimento no garantiza el anonimato.
        </Trans>
      </Text>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
        <Trans>La deliberación y la delegación actuales son públicas.</Trans>
      </Text>
    </View>
  )
}

function UnavailableCard({
  onRetry,
  isFetching,
}: {
  onRetry: () => void
  isFetching: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      style={[
        a.p_lg,
        a.rounded_md,
        a.border,
        a.gap_sm,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[a.font_semi_bold, a.text_md, t.atoms.text]}>
        <Trans>No se pudo cargar el conteo</Trans>
      </Text>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
        <Trans>Vuelve a intentarlo en un momento.</Trans>
      </Text>
      <Button
        label={_(msg`Reintentar conteo`)}
        onPress={onRetry}
        disabled={isFetching}
        size="small"
        color="secondary"
        variant="solid">
        <ButtonText>
          <Trans>Reintentar</Trans>
        </ButtonText>
      </Button>
    </View>
  )
}

function ShadowBadge() {
  const t = useTheme()
  return (
    <View style={[a.px_sm, a.py_2xs, a.rounded_sm, t.atoms.bg_contrast_50]}>
      <Text
        style={[
          a.text_xs,
          a.font_bold,
          t.atoms.text_contrast_high,
          {letterSpacing: 0.4},
        ]}>
        <Trans>EN SOMBRA</Trans>
      </Text>
    </View>
  )
}

function Metric({label, value}: {label: string; value: string}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.p_md,
        a.rounded_md,
        a.border,
        a.gap_2xs,
        a.flex_1,
        t.atoms.bg,
        t.atoms.border_contrast_low,
        {minWidth: 140},
      ]}>
      <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>{value}</Text>
      <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

function asPercent(value: string, scale = 1): string {
  const parsed = Number(value)
  return value.trim() && Number.isFinite(parsed)
    ? `${Math.round(parsed * scale)}%`
    : '—'
}
