import {useMemo} from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CabildeoView} from '#/lib/cabildeo-client'
import {type PoliticalAffiliation} from '#/lib/political-affiliations'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

interface CivicDashboardProps {
  cabildeos: CabildeoView[]
  votedCount: number
  affiliations: PoliticalAffiliation[]
  highlightCount: number
  followedCount: number
  onPressSeeVotes: () => void
  onPressSeeInfluence: () => void
  onPressCompass: () => void
}

export function CivicDashboard({
  cabildeos,
  votedCount,
  affiliations,
  highlightCount,
  followedCount,
  onPressSeeVotes,
  onPressSeeInfluence,
  onPressCompass,
}: CivicDashboardProps) {
  const t = useTheme()
  const {_} = useLingui()
  const {gtMobile} = useBreakpoints()

  const votesThisMonth = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return cabildeos.filter(c => {
      const hasVoted = c.userContext?.viewerVoteOption !== undefined
      if (!hasVoted) return false
      const created = new Date(c.createdAt).getTime()
      return created > cutoff
    }).length
  }, [cabildeos])

  const delegationCount = useMemo(() => {
    return cabildeos.filter(c => !!c.userContext?.hasDelegatedTo).length
  }, [cabildeos])

  const delegates = useMemo(() => {
    const set = new Set<string>()
    cabildeos.forEach(c => {
      if (c.userContext?.hasDelegatedTo) {
        set.add(c.userContext.hasDelegatedTo)
      }
    })
    return Array.from(set)
  }, [cabildeos])

  const delegateMatches = useMemo(() => {
    let matches = 0
    let total = 0
    cabildeos.forEach(c => {
      const userVote = c.userContext?.viewerVoteOption
      const delegateVote = c.userContext?.delegateVoteEvent?.optionIndex
      if (userVote !== undefined && delegateVote !== undefined) {
        total++
        if (userVote === delegateVote) matches++
      }
    })
    return {matches, total}
  }, [cabildeos])

  const activeCommunities = useMemo(() => {
    const map = new Map<string, number>()
    cabildeos.forEach(c => {
      const comm = c.community || 'General'
      const hasVoted = c.userContext?.viewerVoteOption !== undefined
      map.set(comm, (map.get(comm) || 0) + (hasVoted ? 1 : 0))
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [cabildeos])

  const civicScore = useMemo(() => {
    const participation = Math.min(100, votedCount * 10)
    const delegationHealth = Math.min(100, delegationCount * 15)
    const engagement = Math.min(100, (highlightCount + followedCount) * 5)
    const affinity = Math.min(100, affiliations.length * 25)
    return Math.round(
      (participation + delegationHealth + engagement + affinity) / 4,
    )
  }, [
    votedCount,
    delegationCount,
    highlightCount,
    followedCount,
    affiliations.length,
  ])

  const scoreColor =
    civicScore >= 75
      ? t.palette.positive_500
      : civicScore >= 50
        ? t.palette.primary_500
        : t.palette.negative_500

  return (
    <View
      style={[
        styles.container,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, t.atoms.text]}>
          <Trans>Civic Dashboard</Trans>
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onPressSeeInfluence}>
          <Text style={[styles.headerLink, {color: t.palette.primary_500}]}>
            <Trans>See influence →</Trans>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Score + metrics row */}
      <View style={[styles.row, gtMobile && styles.rowWeb]}>
        {/* Civic Score ring */}
        <View style={[styles.scoreCard, t.atoms.bg_contrast_25]}>
          <View style={[styles.scoreRing, {borderColor: scoreColor}]}>
            <Text style={[styles.scoreValue, {color: scoreColor}]}>
              {civicScore}
            </Text>
          </View>
          <Text style={[styles.scoreLabel, t.atoms.text_contrast_medium]}>
            <Trans>Civic Score</Trans>
          </Text>
        </View>

        {/* Metric grid */}
        <View style={styles.metricGrid}>
          <MetricTile
            value={votesThisMonth}
            label={_(msg`Votes this month`)}
            onPress={onPressSeeVotes}
          />
          <MetricTile value={delegationCount} label={_(msg`Delegations`)} />
          <MetricTile
            value={votedCount}
            label={_(msg`Total votes`)}
            onPress={onPressSeeVotes}
          />
          <MetricTile
            value={activeCommunities.length}
            label={_(msg`Communities`)}
          />
        </View>
      </View>

      {/* Active communities bar */}
      {activeCommunities.length > 0 && (
        <View style={styles.communitiesRow}>
          {activeCommunities.map(([name, count]) => (
            <View
              key={name}
              style={[
                styles.communityChip,
                {backgroundColor: t.palette.primary_500 + '12'},
              ]}>
              <Text
                style={[styles.communityName, {color: t.palette.primary_500}]}>
                {name}
              </Text>
              <Text
                style={[styles.communityCount, t.atoms.text_contrast_medium]}>
                {count}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Delegation health */}
      {delegates.length > 0 && (
        <View style={[styles.delegationRow, t.atoms.bg_contrast_25]}>
          <Text style={{fontSize: 18}}>🔗</Text>
          <View style={[a.flex_1, a.gap_xs]}>
            <Text style={[styles.delegationTitle, t.atoms.text]}>
              <Trans>Delegation</Trans>
            </Text>
            <Text style={[styles.delegationBody, t.atoms.text_contrast_medium]}>
              <Trans>
                Delegates to {delegates.join(', ')} — matched{' '}
                {delegateMatches.matches}/{delegateMatches.total} votes
              </Trans>
            </Text>
          </View>
        </View>
      )}

      {/* Compass + affiliation mini */}
      {affiliations.length > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onPressCompass}
          style={[styles.compassRow, t.atoms.bg_contrast_25]}>
          <Text style={[styles.compassEmoji, t.atoms.text]}>🧭</Text>
          <View style={a.flex_1}>
            <Text style={[styles.compassTitle, t.atoms.text]}>
              <Trans>Political Compass</Trans>
            </Text>
            <Text style={[styles.compassBody, t.atoms.text_contrast_medium]}>
              {affiliations.map(a => a.type).join(', ')}
            </Text>
          </View>
          <Text style={[styles.chevron, t.atoms.text_contrast_medium]}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function MetricTile({
  value,
  label,
  onPress,
}: {
  value: number
  label: string
  onPress?: () => void
}) {
  const t = useTheme()

  const content = (
    <View style={styles.metricTile}>
      <Text style={[styles.metricValue, t.atoms.text]}>{value}</Text>
      <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity accessibilityRole="button" onPress={onPress}>
        {content}
      </TouchableOpacity>
    )
  }
  return content
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'column',
    gap: 14,
  },
  rowWeb: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    padding: 16,
    minWidth: 110,
  },
  scoreRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  communitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  communityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  communityName: {
    fontSize: 12,
    fontWeight: '700',
  },
  communityCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  delegationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
  },
  delegationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  delegationBody: {
    fontSize: 12,
  },
  compassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
  },
  compassEmoji: {
    fontSize: 24,
  },
  compassTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  compassBody: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '300',
  },
})
