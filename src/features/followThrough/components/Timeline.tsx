import {Linking, TouchableOpacity, View} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {type FollowThroughUpdateView} from '#/lib/api/follow-through'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {newestFirst, shownProgress, statusTone} from '../display'
import {useStatusLabel, useToneColor} from './StatusPill'

function isWebUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

/**
 * The actualizaciones of one compromiso, newest first. An update a steward
 * edited after it was indexed is shown as first written, and one they deleted
 * leaves a count behind, so the record cannot be quietly rewritten.
 */
export function Timeline({
  updates,
  withdrawn,
}: {
  updates: readonly FollowThroughUpdateView[]
  withdrawn: number
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const statusLabel = useStatusLabel()
  const toneColor = useToneColor()
  const ordered = newestFirst(updates)

  return (
    <View style={[a.gap_md]}>
      {ordered.map(u => {
        const progress = shownProgress(u.progress)
        return (
          <View
            key={u.uri}
            style={[
              a.border_l,
              a.pl_md,
              a.gap_xs,
              {borderLeftColor: toneColor(statusTone(u.status, false))},
            ]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {i18n.date(new Date(u.occurredAt), {dateStyle: 'medium'})}
            </Text>
            <Text style={[a.text_sm, a.font_bold]}>
              {statusLabel(u.status)}
              {progress !== null ? ` · ${progress}%` : ''}
            </Text>
            {u.dueAt ? (
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                {_(
                  msg`Nuevo plazo: ${i18n.date(new Date(u.dueAt), {dateStyle: 'medium'})}`,
                )}
              </Text>
            ) : null}
            {u.note ? <Text style={[a.text_sm]}>{u.note}</Text> : null}
            {u.evidenceUris.map(uri =>
              isWebUrl(uri) ? (
                <TouchableOpacity
                  key={uri}
                  accessibilityRole="link"
                  accessibilityLabel={_(msg`Abrir evidencia ${uri}`)}
                  accessibilityHint={_(msg`Abre un enlace externo`)}
                  onPress={() => Linking.openURL(uri)}>
                  <Text
                    numberOfLines={1}
                    style={[a.text_sm, {color: t.palette.primary_500}]}>
                    {uri}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text
                  key={uri}
                  numberOfLines={1}
                  style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  {uri}
                </Text>
              ),
            )}
            {u.edited ? (
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {_(msg`Editada después de publicarse. Se muestra la original.`)}
              </Text>
            ) : null}
          </View>
        )
      })}
      {withdrawn > 0 ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {_(
            msg`${plural(withdrawn, {
              one: '# actualización se publicó y luego se borró.',
              other: '# actualizaciones se publicaron y luego se borraron.',
            })}`,
          )}
        </Text>
      ) : null}
    </View>
  )
}
