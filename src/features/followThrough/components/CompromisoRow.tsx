import {useState} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {type FollowThroughView} from '#/lib/api/follow-through'
import {useFollowThroughItemQuery} from '#/state/queries/follow-through'
import {useProfileQuery} from '#/state/queries/profile'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {dueState, shownProgress, statusTone} from '../display'
import {ProgressBar} from './ProgressBar'
import {StatusPill, useToneColor} from './StatusPill'
import {Timeline} from './Timeline'

function ResponsibleName({item}: {item: FollowThroughView}) {
  // The label is what the steward wrote. Without one, the account's handle.
  const {data: profile} = useProfileQuery({
    did: item.responsibleLabel ? undefined : item.responsibleDid,
  })
  return item.responsibleLabel ?? (profile ? `@${profile.handle}` : null)
}

/**
 * One compromiso. Tapping it opens its detail and timeline; sub-compromisos
 * stay visible under it, one level deep, as the AppView allows no more.
 */
export function CompromisoRow({
  item,
  now,
  nested = false,
}: {
  item: FollowThroughView
  now: number
  nested?: boolean
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const toneColor = useToneColor()
  const [open, setOpen] = useState(false)
  const detail = useFollowThroughItemQuery(item.uri, {enabled: open})
  const progress = shownProgress(item.progress)
  const due = dueState(item, now)
  const children = item.children ?? []
  const updates = detail.data?.updates ?? []

  const dueText =
    due.kind === 'none'
      ? null
      : _(msg`Plazo: ${i18n.date(new Date(due.at), {dateStyle: 'medium'})}`)

  return (
    <View style={[a.gap_sm, nested && [a.pl_md, a.border_l]]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={
          open
            ? _(msg`Oculta el detalle del compromiso`)
            : _(msg`Muestra el detalle y las actualizaciones`)
        }
        accessibilityState={{expanded: open}}
        activeOpacity={0.7}
        onPress={() => setOpen(v => !v)}
        style={[a.gap_xs]}>
        <Text style={[a.text_md, a.font_bold, a.leading_snug]}>
          {item.title}
        </Text>
        <StatusPill status={item.status} overdue={item.overdue} />
        {progress !== null ? (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <View style={[a.flex_1]}>
              <ProgressBar
                value={progress}
                color={toneColor(statusTone(item.status, item.overdue))}
                label={_(msg`Avance: ${progress}%`)}
              />
            </View>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {progress}%
            </Text>
          </View>
        ) : null}
        <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
          {item.responsibleLabel || item.responsibleDid ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <ResponsibleName item={item} />
            </Text>
          ) : null}
          {dueText ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {dueText}
            </Text>
          ) : null}
          {item.rescheduledCount > 0 ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {_(
                msg`${plural(item.rescheduledCount, {
                  one: 'Reprogramado # vez',
                  other: 'Reprogramado # veces',
                })}`,
              )}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {open ? (
        <View style={[a.gap_md, a.pt_xs]}>
          {item.summary ? (
            <Text style={[a.text_sm]}>{item.summary}</Text>
          ) : null}
          {item.edited ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {_(
                msg`Este compromiso se editó después de publicarse. Se muestra la versión original.`,
              )}
            </Text>
          ) : null}
          {detail.isLoading ? (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              {_(msg`Cargando actualizaciones…`)}
            </Text>
          ) : detail.isError ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={_(msg`Reintentar`)}
              accessibilityHint={_(msg`Vuelve a cargar las actualizaciones`)}
              onPress={() => detail.refetch()}>
              <Text style={[a.text_sm, {color: t.palette.primary_500}]}>
                {_(msg`No se pudieron cargar las actualizaciones. Reintentar`)}
              </Text>
            </TouchableOpacity>
          ) : updates.length === 0 && !item.withdrawnUpdates ? (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              {_(msg`Aún no hay actualizaciones.`)}
            </Text>
          ) : (
            <Timeline
              updates={updates}
              withdrawn={item.withdrawnUpdates ?? 0}
            />
          )}
        </View>
      ) : null}

      {children.length > 0 ? (
        <View style={[a.gap_md, a.pt_xs]}>
          {children.map(child => (
            <CompromisoRow key={child.uri} item={child} now={now} nested />
          ))}
        </View>
      ) : null}
    </View>
  )
}
