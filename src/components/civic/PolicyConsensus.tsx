import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {
  formatSignal,
  getOutcomeMeta,
  getQuorumProgress,
  getSignalColor,
  getSignalCounts,
  getSignalLabel,
  parseSignalAverage,
  POLICY_SIGNALS,
  type PolicyTally,
} from '#/lib/policy-display'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

function formatAverage(average: number) {
  const rounded = Math.round(average * 10) / 10
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1)
}

export function PolicyOutcomePill({outcome}: {outcome: string}) {
  const meta = getOutcomeMeta(outcome)
  return (
    <View
      style={[
        a.rounded_xs,
        a.self_start,
        {
          backgroundColor: meta.color + '1F',
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
      ]}>
      <Text style={[a.text_xs, a.font_bold, {color: meta.color}]}>
        {meta.label}
      </Text>
    </View>
  )
}

/** One bar per weight, so the shape of the disagreement is visible at a glance. */
export function SignalHistogram({
  counts,
  height,
  showCounts = false,
}: {
  counts: number[]
  height: number
  showCounts?: boolean
}) {
  const t = useTheme()
  const max = Math.max(1, ...counts)
  return (
    <View style={[a.flex_row, a.gap_2xs, a.align_end]}>
      {POLICY_SIGNALS.map((signal, index) => {
        const count = counts[index]
        const fill = count > 0 ? Math.max(0.1, count / max) : 0
        return (
          <View key={signal} style={[a.flex_1, a.align_center, a.gap_2xs]}>
            {showCounts ? (
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {count}
              </Text>
            ) : null}
            <View
              style={[
                a.w_full,
                a.justify_end,
                a.rounded_xs,
                t.atoms.bg_contrast_50,
                {height, overflow: 'hidden'},
              ]}>
              <View
                style={{
                  height: `${fill * 100}%`,
                  backgroundColor: getSignalColor(signal),
                }}
              />
            </View>
            {showCounts ? (
              <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
                {formatSignal(signal)}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

/**
 * Compact consensus line for a list card: the vote distribution, the mean
 * and the participation. `undefined` while loading, `null` when no ballots
 * have been counted yet.
 */
export function PolicyConsensusMeter({
  tally,
  isLoading,
}: {
  tally: PolicyTally | null | undefined
  isLoading?: boolean
}) {
  const t = useTheme()
  if (isLoading) {
    return (
      <View
        style={[
          a.rounded_xs,
          t.atoms.bg_contrast_50,
          {height: 46, opacity: 0.6},
        ]}
      />
    )
  }
  if (!tally || tally.voteCount === 0) {
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>Nadie ha votado todavía</Trans>
      </Text>
    )
  }
  const average = parseSignalAverage(tally.signalAverage)
  return (
    <View style={[a.gap_sm]}>
      <SignalHistogram counts={getSignalCounts(tally)} height={32} />
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.flex_wrap]}>
        <Text
          style={[a.text_sm, a.font_bold, {color: getSignalColor(average)}]}>
          <Trans>Promedio {formatAverage(average)}</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            {tally.voteCount} {tally.voteCount === 1 ? 'voto' : 'votos'}
          </Trans>
        </Text>
        <PolicyOutcomePill outcome={tally.outcome} />
      </View>
    </View>
  )
}

/** Where the mean sits between -3 and +3. */
function AverageGauge({average}: {average: number}) {
  const t = useTheme()
  const position = ((average + 3) / 6) * 100
  return (
    <View style={[a.gap_xs]}>
      <View style={{height: 18, justifyContent: 'center'}}>
        <View style={[a.flex_row, a.gap_2xs]}>
          {POLICY_SIGNALS.map(signal => (
            <View
              key={signal}
              style={[
                a.flex_1,
                a.rounded_xs,
                {height: 8, backgroundColor: getSignalColor(signal) + '66'},
              ]}
            />
          ))}
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${position}%`,
            marginLeft: -7,
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 3,
            borderColor: t.atoms.bg.backgroundColor,
            backgroundColor: getSignalColor(average),
          }}
        />
      </View>
      <View style={[a.flex_row, a.justify_between]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {formatSignal(-3)}
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>0</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {formatSignal(3)}
        </Text>
      </View>
    </View>
  )
}

/**
 * The consensus of a policy, with what a reader needs to judge it: where the
 * mean sits, how the votes are spread, and whether enough people took part.
 */
export function PolicyConsensusPanel({tally}: {tally: PolicyTally | null}) {
  const t = useTheme()
  if (!tally || tally.voteCount === 0) {
    return (
      <View style={[a.gap_xs]}>
        <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
          <Trans>Todavía no hay votos</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            Cuando alguien vote de -3 a +3, aquí verás el promedio, cómo se
            reparten las posiciones y si se alcanzó el quórum.
          </Trans>
        </Text>
      </View>
    )
  }

  const average = parseSignalAverage(tally.signalAverage)
  const progress = getQuorumProgress(tally)
  const nearest = Math.round(average)

  return (
    <View style={[a.gap_lg]}>
      <View style={[a.flex_row, a.align_center, a.justify_between, a.gap_md]}>
        <View style={[a.flex_1, a.gap_2xs]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            <Trans>POSICIÓN PROMEDIO</Trans>
          </Text>
          <Text
            style={[
              {fontSize: 34, fontWeight: '900', lineHeight: 38},
              {color: getSignalColor(average)},
            ]}>
            {formatAverage(average)}
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {getSignalLabel(nearest)}
          </Text>
        </View>
        <PolicyOutcomePill outcome={tally.outcome} />
      </View>

      <AverageGauge average={average} />

      <View style={[a.gap_sm]}>
        <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
          <Trans>Cómo se reparten los votos</Trans>
        </Text>
        <SignalHistogram
          counts={getSignalCounts(tally)}
          height={72}
          showCounts
        />
      </View>

      <View style={[a.gap_xs]}>
        <View style={[a.flex_row, a.justify_between]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
            <Trans>Quórum</Trans>
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {tally.voteCount} / {tally.quorumTarget}
          </Text>
        </View>
        <View
          style={[
            a.rounded_full,
            t.atoms.bg_contrast_50,
            {height: 8, overflow: 'hidden'},
          ]}>
          <View
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: tally.quorumMet
                ? getSignalColor(2)
                : getSignalColor(0),
            }}
          />
        </View>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {tally.quorumMet ? (
            <Trans>Quórum alcanzado.</Trans>
          ) : (
            <Trans>
              Faltan {Math.max(0, tally.quorumTarget - tally.voteCount)} votos
              para que el resultado cuente.
            </Trans>
          )}
        </Text>
      </View>
    </View>
  )
}

/**
 * Where the viewer sits against the community: both on the -3..+3 line, with
 * how far apart they are. Nothing shows until there is a vote to compare.
 */
export function PolicyStanding({
  viewerSignal,
  tally,
}: {
  viewerSignal: number | undefined
  tally: PolicyTally | null | undefined
}) {
  const t = useTheme()
  if (viewerSignal === undefined || !tally || tally.voteCount === 0) return null

  const average = parseSignalAverage(tally.signalAverage)
  const gap = viewerSignal - average
  const place = (value: number) => `${((value + 3) / 6) * 100}%` as const

  return (
    <View style={[a.gap_sm]}>
      <View style={{height: 22, justifyContent: 'center'}}>
        <View style={[a.flex_row, a.gap_2xs]}>
          {POLICY_SIGNALS.map(signal => (
            <View
              key={signal}
              style={[
                a.flex_1,
                a.rounded_xs,
                {height: 8, backgroundColor: getSignalColor(signal) + '44'},
              ]}
            />
          ))}
        </View>
        <View
          style={{
            position: 'absolute',
            left: place(average),
            marginLeft: -7,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: getSignalColor(average),
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: place(viewerSignal),
            marginLeft: -9,
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 3,
            borderColor: t.atoms.text.color,
            backgroundColor: t.atoms.bg.backgroundColor,
          }}
        />
      </View>
      <View style={[a.flex_row, a.gap_lg, a.flex_wrap]}>
        <View style={[a.flex_row, a.align_center, a.gap_xs]}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: getSignalColor(average),
            }}
          />
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>Comunidad {formatAverage(average)}</Trans>
          </Text>
        </View>
        <View style={[a.flex_row, a.align_center, a.gap_xs]}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              borderWidth: 2,
              borderColor: t.atoms.text.color,
            }}
          />
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>Tú {formatSignal(viewerSignal)}</Trans>
          </Text>
        </View>
      </View>
      <Text style={[a.text_sm, t.atoms.text]}>
        {Math.abs(gap) < 0.5 ? (
          <Trans>Tu posición coincide con la de la comunidad.</Trans>
        ) : gap > 0 ? (
          <Trans>
            Estás {Math.abs(gap).toFixed(1)} puntos más a favor que la
            comunidad.
          </Trans>
        ) : (
          <Trans>
            Estás {Math.abs(gap).toFixed(1)} puntos más en contra que la
            comunidad.
          </Trans>
        )}
      </Text>
    </View>
  )
}
