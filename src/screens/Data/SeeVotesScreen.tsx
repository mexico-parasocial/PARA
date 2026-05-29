import {useCallback, useMemo, useState} from 'react'
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CabildeoPhase} from '#/lib/api/para-lexicons'
import {type CabildeoView} from '#/lib/cabildeo-client'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {EmptyState} from '#/view/com/util/EmptyState'
import {useBreakpoints, useTheme} from '#/alf'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SeeVotes'>

function getPhaseConfig(
  t: ReturnType<typeof useTheme>,
): Record<CabildeoPhase, {label: string; color: string}> {
  return {
    draft: {label: 'Draft', color: t.palette.contrast_400},
    open: {label: 'Open', color: t.palette.primary_500},
    deliberating: {label: 'Deliberating', color: t.palette.yellow},
    voting: {label: 'Voting', color: t.palette.positive_500},
    resolved: {label: 'Resolved', color: t.palette.primary_500},
  }
}

function formatFlair(flair: string): string {
  // Strip || and | prefixes from flairs
  return flair.replace(/^\|+/, '').replace(/^#/, '#')
}

function getPrimaryFlair(flairs: string[] | undefined): string | null {
  if (!flairs || flairs.length === 0) return null
  const policy = flairs.find(f => f.startsWith('||'))
  if (policy) return formatFlair(policy)
  const matter = flairs.find(f => f.startsWith('|'))
  if (matter) return formatFlair(matter)
  return formatFlair(flairs[0])
}

function VoteSummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.summaryCard,
        t.atoms.border_contrast_low,
        t.atoms.bg_contrast_25,
      ]}>
      <Text style={[styles.summaryValue, {color}]}>{value}</Text>
      <Text style={[styles.summaryLabel, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

function VoteCard({
  cabildeo,
  onPress,
}: {
  cabildeo: CabildeoView
  onPress: () => void
}) {
  const t = useTheme()
  const {i18n} = useLingui()
  const phaseConfig = getPhaseConfig(t)[cabildeo.phase]
  const votedOptionIndex = cabildeo.userContext?.viewerVoteOption
  const votedOption =
    typeof votedOptionIndex === 'number'
      ? cabildeo.options[votedOptionIndex]?.label
      : undefined
  const isDirect = cabildeo.userContext?.viewerVoteIsDirect ?? false
  const primaryFlair = getPrimaryFlair(cabildeo.flairs)

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.voteCard,
        t.atoms.border_contrast_low,
        t.atoms.bg_contrast_25,
        {borderLeftWidth: 3, borderLeftColor: phaseConfig.color},
      ]}>
      {/* Header: phase + flair + date */}
      <View style={styles.cardHeader}>
        <View style={styles.cardMeta}>
          <View
            style={[
              styles.phasePill,
              {backgroundColor: phaseConfig.color + '18'},
            ]}>
            <Text style={[styles.phaseText, {color: phaseConfig.color}]}>
              {phaseConfig.label}
            </Text>
          </View>
          {primaryFlair && (
            <Text style={[styles.flairText, t.atoms.text_contrast_medium]}>
              {primaryFlair}
            </Text>
          )}
        </View>
        <Text style={[styles.dateText, t.atoms.text_contrast_medium]}>
          {i18n.date(new Date(cabildeo.createdAt), {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, t.atoms.text]} numberOfLines={2}>
        {cabildeo.title}
      </Text>

      {/* Community */}
      <Text style={[styles.communityText, t.atoms.text_contrast_medium]}>
        {cabildeo.community}
        {cabildeo.region ? ` · ${cabildeo.region}` : ''}
      </Text>

      {/* Vote detail */}
      <View style={styles.voteDetailRow}>
        {votedOption ? (
          <View style={styles.voteOptionRow}>
            <View
              style={[
                styles.voteDot,
                {
                  backgroundColor: isDirect
                    ? t.palette.positive_500
                    : t.palette.primary_500,
                },
              ]}
            />
            <Text style={[styles.voteOptionText, t.atoms.text]}>
              {isDirect ? (
                <Trans>You voted: {votedOption}</Trans>
              ) : (
                <Trans>Delegate voted: {votedOption}</Trans>
              )}
            </Text>
          </View>
        ) : null}
        <View
          style={[
            styles.directPill,
            {
              backgroundColor: isDirect
                ? t.palette.positive_500 + '15'
                : t.palette.primary_500 + '15',
            },
          ]}>
          <Text
            style={[
              styles.directPillText,
              {
                color: isDirect
                  ? t.palette.positive_500
                  : t.palette.primary_500,
              },
            ]}>
            {isDirect ? <Trans>Direct</Trans> : <Trans>Delegated</Trans>}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export function SeeVotesScreen({route}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {gtMobile} = useBreakpoints()
  const [filter, setFilter] = useState<CabildeoPhase | 'all'>('all')
  const {data: cabildeos = [], isLoading} = useCabildeosQuery()
  const {currentAccount} = useSession()
  const did = route.params?.did ?? currentAccount?.did
  const {data: profile} = useProfileQuery({did})
  const profileName = profile?.displayName || profile?.handle

  // Filter to only voted cabildeos
  const votedCabildeos = useMemo(() => {
    return cabildeos.filter(
      c => typeof c.userContext?.viewerVoteOption === 'number',
    )
  }, [cabildeos])

  const filtered = useMemo(() => {
    if (filter === 'all') return votedCabildeos
    return votedCabildeos.filter(c => c.phase === filter)
  }, [votedCabildeos, filter])

  const stats = useMemo(() => {
    const total = votedCabildeos.length
    const direct = votedCabildeos.filter(
      c => c.userContext?.viewerVoteIsDirect,
    ).length
    const delegated = total - direct
    return {total, direct, delegated}
  }, [votedCabildeos])

  const phaseFilters: Array<{key: CabildeoPhase | 'all'; label: string}> = [
    {key: 'all', label: _(msg`All`)},
    {key: 'voting', label: _(msg`Voting`)},
    {key: 'resolved', label: _(msg`Resolved`)},
    {key: 'deliberating', label: _(msg`Deliberating`)},
  ]

  const onPressCabildeo = useCallback(
    (uri: string) => {
      navigation.navigate('PolicyDetails', {cabildeoUri: uri})
    },
    [navigation],
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Votes</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Content>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            gtMobile && {paddingHorizontal: 32},
          ]}>
          {/* Intro */}
          <View style={styles.intro}>
            <Text style={[styles.title, t.atoms.text]}>
              <Trans>Your vote ledger</Trans>
            </Text>
            <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
              {profileName ? (
                <Trans>
                  Policy votes for {profileName}. Tap a card to review or
                  change your stance.
                </Trans>
              ) : (
                <Trans>
                  All your policy votes in one place. Tap a card to review or
                  change your stance.
                </Trans>
              )}
            </Text>
          </View>

          {/* Summary */}
          <View style={styles.summaryRow}>
            <VoteSummaryCard
              label={_(msg`Total`)}
              value={stats.total}
              color={t.palette.primary_500}
            />
            <VoteSummaryCard
              label={_(msg`Direct`)}
              value={stats.direct}
              color={t.palette.positive_500}
            />
            <VoteSummaryCard
              label={_(msg`Delegated`)}
              value={stats.delegated}
              color={t.palette.primary_500}
            />
          </View>

          {/* Filters */}
          {votedCabildeos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScroll}
              contentContainerStyle={styles.filtersContent}>
              {phaseFilters.map(f => (
                <TouchableOpacity
                  key={f.key}
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Filter by ${f.label}`)}
                  accessibilityHint={_(msg`Filters vote history by phase`)}
                  style={[
                    styles.filterChip,
                    t.atoms.border_contrast_low,
                    t.atoms.bg_contrast_25,
                    filter === f.key && {
                      backgroundColor: t.palette.primary_500,
                      borderColor: t.palette.primary_500,
                    },
                  ]}
                  onPress={() => setFilter(f.key)}>
                  <Text
                    style={[
                      styles.filterChipText,
                      t.atoms.text,
                      filter === f.key && {color: '#fff'},
                    ]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Empty states */}
          {isLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
                <Trans>Loading your votes…</Trans>
              </Text>
            </View>
          ) : votedCabildeos.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={CircleInfo}
                message={_(
                  msg`You haven't voted on any proposals yet. Browse the Agora to find policies to vote on.`,
                )}
                button={{
                  label: _(msg`Browse Agora`),
                  text: _(msg`Browse Agora`),
                  onPress: () => navigation.navigate('PoliciesDashboard', {}),
                }}
              />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
                <Trans>No votes match this filter.</Trans>
              </Text>
            </View>
          ) : (
            <View style={{gap: 10}}>
              {filtered.map(c => (
                <VoteCard
                  key={c.uri}
                  cabildeo={c}
                  onPress={() => onPressCabildeo(c.uri)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </Layout.Content>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  intro: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  filtersScroll: {
    marginBottom: 16,
  },
  filtersContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voteCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  phasePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '700',
  },
  flairText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  communityText: {
    fontSize: 12,
    marginBottom: 10,
  },
  voteDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  voteOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  voteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voteOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  directPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  directPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
})
