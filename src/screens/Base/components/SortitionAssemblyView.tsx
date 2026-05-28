import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {
  type SortitionCandidate,
  type SortitionRun,
} from '#/state/queries/matrix'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function SortitionAssemblyView({
  run,
  viewerCandidate,
}: {
  run: SortitionRun
  viewerCandidate?: SortitionCandidate | null
}) {
  const t = useTheme()

  if (run.status !== 'active') return null

  const isSelected = viewerCandidate?.selected === true

  return (
    <View
      style={[
        a.mt_lg,
        a.p_md,
        a.rounded_md,
        a.border,
        {
          backgroundColor: isSelected
            ? t.palette.primary_50
            : t.palette.contrast_50,
          borderColor: isSelected
            ? t.palette.primary_500
            : t.palette.contrast_100,
        },
      ]}>
      <Text style={[a.font_bold, a.text_md, t.atoms.text]}>
        {isSelected ? (
          <Trans>Cámara de Jurados</Trans>
        ) : (
          <Trans>Lectura solamente</Trans>
        )}
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_xs]}>
        {isSelected ? (
          <Trans>
            Tu prueba es válida. Puedes participar en la deliberación de esta
            asamblea aleatoria.
          </Trans>
        ) : viewerCandidate ? (
          <Trans>
            Tu hash quedó por encima del umbral de selección. Puedes leer el
            proceso y verificar el resultado.
          </Trans>
        ) : (
          <Trans>
            No apareces en el set elegible usado por este sorteo. Puedes leer el
            proceso y revisar las pruebas públicas.
          </Trans>
        )}
      </Text>

      {viewerCandidate && (
        <View style={[a.flex_row, a.gap_md, a.mt_md]}>
          <View style={[a.flex_1]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>Tu hash</Trans>
            </Text>
            <Text style={[a.font_bold, t.atoms.text]}>
              {viewerCandidate.hashValue.toFixed(8)}
            </Text>
          </View>
          <View style={[a.flex_1]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>Umbral</Trans>
            </Text>
            <Text style={[a.font_bold, t.atoms.text]}>
              {viewerCandidate.threshold.toFixed(8)}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
