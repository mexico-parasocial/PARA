import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Plural, Trans} from '@lingui/react/macro'

import {type DelegateVoice} from '#/lib/mandates/voice'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const MAX_DOTS = 30

/**
 * How much of a proposal one delegate speaks for. One number (voces), one
 * row of people, one bar. Everything else is a sentence.
 * docs/revocable-mandates-spec.md §6.
 */
export function DelegatedVoiceCard({
  handle,
  voice,
}: {
  handle: string
  voice: DelegateVoice
}) {
  const t = useTheme()
  const {_} = useLingui()
  const lenders = voice.lent.length
  const pct = Math.round(voice.share * 100)

  return (
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
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>No decide nada</Trans>
        </Text>
      </View>

      <View style={[a.gap_2xs]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>La voz de {handle} en esta propuesta</Trans>
        </Text>
        <Text style={[a.text_3xl, a.font_bold, t.atoms.text]}>
          <Plural value={voice.voices} one="# voz" other="# voces" />
        </Text>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
          {voice.own === 0 ? (
            <Trans>
              Todavía no vota, así que no lleva ninguna voz prestada.
            </Trans>
          ) : lenders === 0 ? (
            <Trans>Solo la suya.</Trans>
          ) : (
            <Plural
              value={lenders}
              one="La suya y la de # persona que se la prestó."
              other="La suya y la de # personas que se la prestaron."
            />
          )}
        </Text>
      </View>

      {voice.people > 0 && <People voice={voice} />}

      <View style={[a.gap_xs]}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={_(msg`Parte de todas las voces de la propuesta`)}
          accessibilityHint={_(
            msg`Cuánto de la propuesta lleva esta voz frente a todas las demás`,
          )}
          accessibilityValue={{min: 0, max: 100, now: pct}}
          style={[
            a.w_full,
            a.rounded_full,
            a.overflow_hidden,
            t.atoms.bg_contrast_100,
            {height: 8},
          ]}>
          <View
            style={[
              a.h_full,
              a.rounded_full,
              {
                width: `${Math.max(voice.share > 0 ? 2 : 0, pct)}%`,
                backgroundColor: t.palette.primary_500,
              },
            ]}
          />
        </View>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            {pct}% de todas las voces de esta propuesta. Nadie puede llevar la
            voz de más de {voice.capPeople} personas.
          </Trans>
        </Text>
      </View>

      {(voice.overridden.length > 0 || voice.returned.length > 0) && (
        <View style={[a.gap_2xs]}>
          {voice.overridden.length > 0 && (
            <Text style={[a.text_xs, a.leading_snug, t.atoms.text]}>
              <Plural
                value={voice.overridden.length}
                one="# persona votó por su cuenta: cuenta su voto, no este."
                other="# personas votaron por su cuenta: cuenta su voto, no este."
              />
            </Text>
          )}
          {voice.returned.length > 0 && (
            <Text style={[a.text_xs, a.leading_snug, t.atoms.text]}>
              <Plural
                value={voice.returned.length}
                one="# persona recuperó su voz porque se pasaba del tope."
                other="# personas recuperaron su voz porque se pasaba del tope."
              />
            </Text>
          )}
        </View>
      )}

      <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
        <Trans>
          Prestar tu voz no la multiplica ni la reduce: cada persona cuenta una
          vez, con la intensidad que ella misma autorizó y pagada con sus
          propios créditos. Puedes votar tú o retirarla hasta el cierre.
        </Trans>
      </Text>
    </View>
  )
}

/** One dot per person: filled for the delegate, outlined for each lender. */
function People({voice}: {voice: DelegateVoice}) {
  const t = useTheme()
  const dots = [
    ...(voice.own > 0 ? ['own'] : []),
    ...voice.lent.map(() => 'lent'),
  ]
  const shown = dots.slice(0, MAX_DOTS)
  const more = dots.length - shown.length

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[a.flex_row, a.flex_wrap, a.align_center, {gap: 4}]}>
      {shown.map((kind, i) => (
        <View
          key={i}
          style={[
            a.rounded_full,
            {
              width: 10,
              height: 10,
              borderWidth: 1.5,
              borderColor: t.palette.primary_500,
              backgroundColor:
                kind === 'own' ? t.palette.primary_500 : 'transparent',
            },
          ]}
        />
      ))}
      {more > 0 && (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.ml_xs]}>
          +{more}
        </Text>
      )}
    </View>
  )
}
