import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Plural, Trans} from '@lingui/react/macro'

import {type BallotKind, type DelegateReach} from '#/lib/mandates/mandates'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const MAX_DOTS = 30

/**
 * How many votes one delegate's choice decides, and what share of the whole
 * that is. One number, one row of people, one bar; everything else is a
 * sentence. docs/revocable-mandates-spec.md §6.
 */
export function DelegateReachCard({
  handle,
  reach,
  kind,
  shadow = false,
}: {
  handle: string
  reach: DelegateReach
  kind: BallotKind
  /** The subject's ballots do not decide anything yet. */
  shadow?: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()
  const lenders = reach.lent.length
  const pct = Math.round(reach.share * 100)

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
      {shadow && (
        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <View
            style={[a.px_sm, a.py_2xs, a.rounded_sm, t.atoms.bg_contrast_50]}>
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
      )}

      <View style={[a.gap_2xs]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>El voto de {handle} en esta propuesta</Trans>
        </Text>
        <Text style={[a.text_3xl, a.font_bold, t.atoms.text]}>
          <Plural value={reach.votes} one="# voto" other="# votos" />
        </Text>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
          {!reach.voted ? (
            <Trans>
              Todavía no vota, así que no lleva ningún voto prestado.
            </Trans>
          ) : lenders === 0 ? (
            <Trans>Solo el suyo.</Trans>
          ) : (
            <Plural
              value={lenders}
              one="El suyo y el de # persona que se lo prestó."
              other="El suyo y el de # personas que se lo prestaron."
            />
          )}
        </Text>
      </View>

      {reach.votes > 0 && <People reach={reach} />}

      <View style={[a.gap_xs]}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={_(msg`Parte de todos los votos de la propuesta`)}
          accessibilityHint={_(
            msg`Cuántos votos decide esta persona frente a todos los demás`,
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
                width: `${Math.max(reach.share > 0 ? 2 : 0, pct)}%`,
                backgroundColor: t.palette.primary_500,
              },
            ]}
          />
        </View>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            {pct}% de los votos de esta propuesta. Nadie puede llevar el voto de
            más de {reach.capPeople} personas.
          </Trans>
        </Text>
      </View>

      {(reach.overridden.length > 0 || reach.returned.length > 0) && (
        <View style={[a.gap_2xs]}>
          {reach.overridden.length > 0 && (
            <Text style={[a.text_xs, a.leading_snug, t.atoms.text]}>
              <Plural
                value={reach.overridden.length}
                one="# persona votó por su cuenta: cuenta su voto, no este."
                other="# personas votaron por su cuenta: cuenta su voto, no este."
              />
            </Text>
          )}
          {reach.returned.length > 0 && (
            <Text style={[a.text_xs, a.leading_snug, t.atoms.text]}>
              <Plural
                value={reach.returned.length}
                one="# persona recuperó su voto porque se pasaba del tope."
                other="# personas recuperaron su voto porque se pasaba del tope."
              />
            </Text>
          )}
        </View>
      )}

      <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
        {kind === 'policy' ? (
          <Trans>
            Cada voto prestado lleva la misma señal que el de {handle}, de −3 a
            +3, y cuenta una vez por persona. Puedes votar tú o retirarlo hasta
            el cierre.
          </Trans>
        ) : (
          <Trans>
            Cada voto prestado va a la opción que elija {handle} y cuenta una
            vez por persona. Puedes votar tú o retirarlo hasta el cierre.
          </Trans>
        )}
      </Text>
    </View>
  )
}

/** One dot per person: filled for the delegate, outlined for each lender. */
function People({reach}: {reach: DelegateReach}) {
  const t = useTheme()
  const dots = [
    ...(reach.voted ? ['own'] : []),
    ...reach.lent.map(() => 'lent'),
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
