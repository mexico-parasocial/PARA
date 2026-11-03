import {useState} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useFollowThroughQuery} from '#/state/queries/follow-through'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {summaryFacts} from '../display'
import {CompromisoRow} from './CompromisoRow'
import {ProgressBar} from './ProgressBar'

/** Compromisos shown before the viewer asks for the rest. */
const PREVIEW_COUNT = 3

/**
 * Seguimiento of a resolved cabildeo: what its organizers committed to do and
 * what they reported since. It renders nothing when there is nothing to show,
 * which includes every cabildeo the AppView will not follow (not an activity,
 * no single winner, quorum not met). Absence is not a verdict, so it says
 * nothing about a cabildeo that has no compromisos.
 */
export function FollowThroughSection({
  cabildeoUri,
  resolved,
}: {
  cabildeoUri: string
  resolved: boolean
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const query = useFollowThroughQuery(cabildeoUri, {enabled: resolved})
  const [showAll, setShowAll] = useState(false)
  const [now] = useState(() => Date.now())

  if (!resolved) return null

  if (query.isError) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={_(msg`Reintentar`)}
        accessibilityHint={_(msg`Vuelve a cargar el seguimiento`)}
        onPress={() => query.refetch()}
        style={[a.mt_lg]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {_(msg`No se pudo cargar el seguimiento. Reintentar`)}
        </Text>
      </TouchableOpacity>
    )
  }

  const items = query.data?.items ?? []
  if (items.length === 0) return null

  const facts = query.data?.summary ? summaryFacts(query.data.summary) : null
  const shown = showAll ? items : items.slice(0, PREVIEW_COUNT)
  const hidden = items.length - shown.length

  return (
    <View
      style={[
        a.mt_lg,
        a.p_lg,
        a.gap_md,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
        t.atoms.bg_contrast_25,
      ]}>
      <View style={[a.gap_xs]}>
        <Text style={[a.text_lg, a.font_bold]}>
          <Trans>Seguimiento</Trans>
        </Text>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            Lo que la comunidad se comprometió a hacer tras esta decisión, según
            quienes la organizan.
          </Trans>
        </Text>
      </View>

      {facts ? (
        <View style={[a.gap_sm]}>
          {facts.progress !== null ? (
            <ProgressBar
              value={facts.progress}
              label={_(msg`Avance general: ${facts.progress}%`)}
            />
          ) : null}
          <View style={[a.flex_row, a.flex_wrap, a.gap_md]}>
            <Text style={[a.text_sm, a.font_bold]}>
              {_(msg`Cumplidos: ${facts.completed} de ${facts.total}`)}
            </Text>
            {facts.overdue > 0 ? (
              <Text
                style={[
                  a.text_sm,
                  a.font_bold,
                  {color: t.palette.negative_500},
                ]}>
                {_(msg`Atrasados: ${facts.overdue}`)}
              </Text>
            ) : null}
            {facts.nextDueAt ? (
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                {_(
                  msg`Próximo plazo: ${i18n.date(new Date(facts.nextDueAt), {dateStyle: 'medium'})}`,
                )}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={[a.gap_lg]}>
        {shown.map(item => (
          <CompromisoRow key={item.uri} item={item} now={now} />
        ))}
      </View>

      {hidden > 0 || showAll ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            showAll
              ? _(msg`Ver menos compromisos`)
              : _(msg`Ver los ${items.length} compromisos`)
          }
          accessibilityHint={_(msg`Cambia cuántos compromisos se muestran`)}
          onPress={() => setShowAll(v => !v)}>
          <Text
            style={[a.text_sm, a.font_bold, {color: t.palette.primary_500}]}>
            {showAll
              ? _(msg`Ver menos`)
              : _(msg`Ver los ${items.length} compromisos`)}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}
