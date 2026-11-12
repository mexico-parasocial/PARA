import {useState} from 'react'
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  formatSignal,
  getSignalColor,
  getSignalLabel,
  parseSignalAverage,
} from '#/lib/policy-display'
import {
  getPolicyStance,
  type PolicyStance,
  summarizePolicyBallots,
} from '#/lib/policy-ledger'
import {
  type CommonNavigatorParams,
  type PlatformNavigationProp as NavigationProp,
} from '#/lib/routes/types'
import {useCommunityBoardQuery} from '#/state/queries/community-boards'
import {
  type PolicyLedgerEntry,
  usePolicyLedgerQuery,
} from '#/state/queries/policy-ledger'
import {usePolicyTallyQuery} from '#/state/queries/policy-tally'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {getPolicyPostParts} from '#/screens/Policies/PolicyCard'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {
  formatAverage,
  PolicyOutcomePill,
  SignalHistogram,
} from '#/components/civic/PolicyConsensus'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {PostFlairStrip} from '#/components/Post/PostFlairStrip'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SeeVotes'>

type StanceFilter = PolicyStance | 'all'

/**
 * A person's policy ballots: the -3..+3 vote they cast on each policy, beside
 * where everyone who voted stands. Policies have no phases, options or
 * delegation; those belong to debates in Lobbying.
 */
export function SeeVotesScreen({route}: Props) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const did = route.params?.did ?? currentAccount?.did
  const isSelf = Boolean(did) && did === currentAccount?.did
  const {data: profile} = useProfileQuery({did})
  const name = profile?.displayName || profile?.handle
  const [filter, setFilter] = useState<StanceFilter>('all')

  const {data, isLoading, isError, refetch} = usePolicyLedgerQuery(did)
  const entries = data?.entries ?? []
  const summary = summarizePolicyBallots(entries)
  const visible =
    filter === 'all'
      ? entries
      : entries.filter(entry => getPolicyStance(entry.signal) === filter)

  const filters: {key: StanceFilter; label: string; count: number}[] = [
    {key: 'all', label: l`Todos`, count: summary.total},
    {key: 'support', label: l`Apoyo`, count: summary.stances.support},
    {key: 'neutral', label: l`Neutral`, count: summary.stances.neutral},
    {key: 'oppose', label: l`Rechazo`, count: summary.stances.oppose},
  ]

  return (
    <Layout.Screen testID="policyLedgerScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Votos</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={{flex: 1}}>
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={{padding: 16, paddingBottom: 100}}>
          <View style={[a.gap_xs, a.mb_lg]}>
            <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
              {isSelf ? (
                <Trans>Tus votos en policies</Trans>
              ) : (
                <Trans>Votos en policies</Trans>
              )}
            </Text>
            <Text
              emoji
              style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
              {isSelf ? (
                <Trans>
                  Cada voto va de -3 a +3 y es público. Toca una policy para
                  revisarla o cambiar tu voto.
                </Trans>
              ) : name ? (
                <Trans>
                  Los votos públicos de {name}, de -3 a +3, junto a la postura
                  de quienes votaron.
                </Trans>
              ) : (
                <Trans>
                  Votos públicos de -3 a +3, junto a la postura de quienes
                  votaron.
                </Trans>
              )}
            </Text>
          </View>

          {isLoading ? (
            <View style={[a.align_center, a.justify_center, {minHeight: 200}]}>
              <ActivityIndicator size="large" color={t.palette.primary_500} />
            </View>
          ) : isError ? (
            <ListMaybePlaceholder
              isLoading={false}
              isError
              onRetry={refetch}
              emptyType="results"
              errorTitle={l`No se pudieron cargar los votos`}
              errorMessage={l`Revisa tu conexión e inténtalo de nuevo.`}
            />
          ) : entries.length === 0 ? (
            <View style={[a.align_center, a.gap_md, {padding: 40}]}>
              <Text
                style={[a.text_md, a.font_bold, a.text_center, t.atoms.text]}>
                {isSelf ? (
                  <Trans>Todavía no has votado ninguna policy</Trans>
                ) : (
                  <Trans>Todavía no hay votos en policies</Trans>
                )}
              </Text>
              {isSelf ? (
                <Button
                  label={l`Ver policies`}
                  size="small"
                  color="primary"
                  onPress={() => navigation.navigate('PoliciesDashboard', {})}>
                  <ButtonText>
                    <Trans>Ver policies</Trans>
                  </ButtonText>
                </Button>
              ) : null}
            </View>
          ) : (
            <View style={[a.gap_lg]}>
              <LedgerSummary summary={summary} />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[a.gap_sm]}>
                {filters.map(f => {
                  const active = filter === f.key
                  return (
                    <Pressable
                      key={f.key}
                      accessibilityRole="button"
                      accessibilityState={{selected: active}}
                      accessibilityLabel={l`${f.label}: ${f.count}`}
                      accessibilityHint={l`Muestra solo estos votos`}
                      onPress={() => setFilter(f.key)}
                      style={[
                        a.flex_row,
                        a.align_center,
                        a.gap_xs,
                        a.px_md,
                        a.py_sm,
                        a.rounded_full,
                        a.border,
                        t.atoms.border_contrast_low,
                        active
                          ? {
                              backgroundColor: t.palette.primary_500,
                              borderColor: t.palette.primary_500,
                            }
                          : t.atoms.bg_contrast_25,
                      ]}>
                      <Text
                        style={[
                          a.text_sm,
                          a.font_bold,
                          active ? {color: t.palette.white} : t.atoms.text,
                        ]}>
                        {f.label}
                      </Text>
                      <Text
                        style={[
                          a.text_sm,
                          active
                            ? {color: t.palette.white}
                            : t.atoms.text_contrast_medium,
                        ]}>
                        {f.count}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {visible.length === 0 ? (
                <Text
                  style={[
                    a.text_sm,
                    a.text_center,
                    a.py_lg,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>Ningún voto con esta postura.</Trans>
                </Text>
              ) : (
                <View style={[a.gap_md]}>
                  {visible.map(entry => (
                    <LedgerRow
                      key={entry.policyUri}
                      entry={entry}
                      onPress={() =>
                        navigation.navigate('PolicyDetails', {
                          policyUri: entry.policyUri,
                        })
                      }
                    />
                  ))}
                </View>
              )}

              {data?.truncated ? (
                <Text
                  style={[
                    a.text_xs,
                    a.text_center,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>Se muestran los votos más recientes.</Trans>
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

/** Totals by side, and how the ballots spread from -3 to +3. */
function LedgerSummary({
  summary,
}: {
  summary: ReturnType<typeof summarizePolicyBallots>
}) {
  const t = useTheme()
  const tiles = [
    {label: <Trans>Policies</Trans>, value: summary.total, color: undefined},
    {
      label: <Trans>Apoyo</Trans>,
      value: summary.stances.support,
      color: getSignalColor(2),
    },
    {
      label: <Trans>Neutral</Trans>,
      value: summary.stances.neutral,
      color: getSignalColor(0),
    },
    {
      label: <Trans>Rechazo</Trans>,
      value: summary.stances.oppose,
      color: getSignalColor(-2),
    },
  ]
  return (
    <View
      style={[
        a.rounded_md,
        a.border,
        a.p_lg,
        a.gap_lg,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_row, a.justify_between]}>
        {tiles.map((tile, index) => (
          <View key={index} style={[a.flex_1, a.align_center, a.gap_2xs]}>
            <Text
              style={[
                a.text_2xl,
                a.font_bold,
                tile.color ? {color: tile.color} : t.atoms.text,
              ]}>
              {tile.value}
            </Text>
            <Text
              style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
              {tile.label}
            </Text>
          </View>
        ))}
      </View>
      <SignalHistogram counts={summary.counts} height={36} showCounts />
    </View>
  )
}

/** The ballot as a weight, so a row reads at a glance. */
function SignalBadge({signal}: {signal: number}) {
  const color = getSignalColor(signal)
  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        a.rounded_md,
        a.gap_2xs,
        {width: 72, paddingVertical: 10, backgroundColor: color + '1F'},
      ]}>
      <Text style={[a.text_2xl, a.font_bold, {color}]}>
        {formatSignal(signal)}
      </Text>
      <Text
        numberOfLines={1}
        style={[a.text_2xs, a.font_bold, a.text_center, {color}]}>
        {getSignalLabel(signal)}
      </Text>
    </View>
  )
}

function LedgerRow({
  entry,
  onPress,
}: {
  entry: PolicyLedgerEntry
  onPress: () => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const {data: tally, isLoading: isTallyLoading} = usePolicyTallyQuery(
    entry.post ? entry.policyUri : undefined,
  )
  const {data: board} = useCommunityBoardQuery({
    communityId: tally?.community || undefined,
  })
  const castAt = new Date(entry.createdAt)
  const castLabel = Number.isNaN(castAt.getTime())
    ? ''
    : i18n.date(castAt, {day: 'numeric', month: 'short', year: 'numeric'})

  if (!entry.post) {
    return (
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.gap_md,
          a.p_md,
          a.rounded_md,
          a.border,
          t.atoms.border_contrast_low,
          {opacity: 0.7},
        ]}>
        <SignalBadge signal={entry.signal} />
        <View style={[a.flex_1, a.gap_2xs]}>
          <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
            <Trans>Policy no disponible</Trans>
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {castLabel ? (
              <Trans>Votada el {castLabel}. Puede que se haya borrado.</Trans>
            ) : (
              <Trans>Puede que se haya borrado.</Trans>
            )}
          </Text>
        </View>
      </View>
    )
  }

  const {title, badges} = getPolicyPostParts(entry.post)
  const meta = [board?.board.name, castLabel ? l`votada el ${castLabel}` : '']
    .filter(Boolean)
    .join(' · ')
  const average = tally ? parseSignalAverage(tally.signalAverage) : 0

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={l`${title}. Tu voto: ${formatSignal(entry.signal)}`}
      accessibilityHint={l`Abre los detalles de la policy`}
      onPress={onPress}
      style={({pressed}) => [
        a.flex_row,
        a.gap_md,
        a.p_md,
        a.rounded_md,
        a.border,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
        pressed && {opacity: 0.85},
      ]}>
      <SignalBadge signal={entry.signal} />
      <View style={[a.flex_1, a.gap_xs]}>
        <View style={[a.flex_row, a.align_center, a.gap_sm, a.flex_wrap]}>
          <PostFlairStrip
            badges={badges.filter(badge => badge.kind !== 'postType')}
            compact
          />
          {tally?.official ? (
            <Text
              style={[a.text_xs, a.font_bold, {color: t.palette.primary_500}]}>
              <Trans>OFICIAL</Trans>
            </Text>
          ) : null}
        </View>
        <Text
          emoji
          numberOfLines={2}
          style={[a.text_md, a.font_bold, a.leading_snug, t.atoms.text]}>
          {title}
        </Text>
        {meta ? (
          <Text emoji style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {meta}
          </Text>
        ) : null}
        <View
          style={[a.flex_row, a.align_center, a.gap_sm, a.flex_wrap, a.pt_2xs]}>
          {isTallyLoading ? (
            <View
              style={[
                a.rounded_xs,
                t.atoms.bg_contrast_50,
                {height: 16, width: 140},
              ]}
            />
          ) : !tally || tally.voteCount === 0 ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>Aún no hay un conteo</Trans>
            </Text>
          ) : (
            <>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>
                  Promedio{' '}
                  <Text
                    style={[
                      a.text_xs,
                      a.font_bold,
                      {color: getSignalColor(average)},
                    ]}>
                    {formatAverage(average)}
                  </Text>{' '}
                  · {tally.voteCount} {tally.voteCount === 1 ? 'voto' : 'votos'}
                </Trans>
              </Text>
              <PolicyOutcomePill outcome={tally.outcome} />
            </>
          )}
        </View>
      </View>
    </Pressable>
  )
}
