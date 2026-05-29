import {useCallback, useMemo, useState} from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type CabildeoPhase} from '#/lib/api/para-lexicons'
import {type CabildeoView} from '#/lib/cabildeo-client'
import {
  getCabildeoLeadingOption,
  getCabildeoPhaseMeta,
  getCabildeoTotalParticipants,
} from '#/lib/cabildeo-display'
import {
  type AlignedParty,
  getCabildeoAlignedParty,
  getVoteBreakdownByParty,
} from '#/lib/cabildeo-party-alignment'
import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {type NavigationProp} from '#/lib/routes/types'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {atoms as a, useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {EmptyStateError} from '#/components/EmptyStates'
import {CommunityIcon_Stroke as Community} from '#/components/icons/Community'
import {Globe_Stroke2_Corner0_Rounded as GlobeIcon} from '#/components/icons/Globe'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'
import {Megaphone_Stroke2_Corner0_Rounded as MegaphoneIcon} from '#/components/icons/Megaphone'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {HowItWorksSheet} from './components'

type LobbyingVisibility = 'public' | 'private'
const ALL_REGIONS = '__all_regions__'
type RegionFilter = string
type ResolutionFilter = 'all' | 'active' | CabildeoPhase

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Sub-Components ════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

function getLobbyingAccess(cabildeo: CabildeoView): LobbyingVisibility {
  return cabildeo.minimumViewTier && cabildeo.minimumViewTier !== 'public'
    ? 'private'
    : 'public'
}

function formatDeadline(value: string | undefined) {
  if (!value) return 'No deadline'
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return 'No deadline'

  const now = Date.now()
  const diffDays = Math.ceil((deadline.getTime() - now) / 864e5)
  if (diffDays < 0) return 'Past deadline'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return '1 day left'
  if (diffDays <= 30) return `${diffDays} days left`

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(deadline)
}

function getQuorumProgress(cabildeo: CabildeoView) {
  const minimum = cabildeo.minQuorum || 0
  if (minimum <= 0) return null
  const participants = getCabildeoTotalParticipants(cabildeo)
  return {
    participants,
    minimum,
    ratio: Math.min(1, participants / minimum),
  }
}

function compareLobbyingPriority(a: CabildeoView, b: CabildeoView) {
  const phaseWeight = {
    voting: 0,
    deliberating: 1,
    open: 2,
    draft: 3,
    resolved: 4,
  }
  const aWeight = phaseWeight[a.phase] ?? 5
  const bWeight = phaseWeight[b.phase] ?? 5
  if (aWeight !== bWeight) return aWeight - bWeight

  const aDeadline = a.phaseDeadline
    ? new Date(a.phaseDeadline).getTime()
    : Number.MAX_SAFE_INTEGER
  const bDeadline = b.phaseDeadline
    ? new Date(b.phaseDeadline).getTime()
    : Number.MAX_SAFE_INTEGER
  if (aDeadline !== bDeadline) return aDeadline - bDeadline

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function getTrendingScore(cabildeo: CabildeoView) {
  const votes = cabildeo.voteTotals?.total || 0
  const argumentsCount = cabildeo.positionCounts?.total || 0
  const delegated = cabildeo.voteTotals?.delegated || 0
  const phaseBoost =
    cabildeo.phase === 'voting'
      ? 120
      : cabildeo.phase === 'deliberating'
        ? 80
        : 0
  const deadlineBoost =
    cabildeo.phaseDeadline &&
    new Date(cabildeo.phaseDeadline).getTime() - Date.now() < 7 * 864e5
      ? 45
      : 0
  return votes + argumentsCount * 3 + delegated * 2 + phaseBoost + deadlineBoost
}

function filterByRegion(cabildeos: CabildeoView[], region: RegionFilter) {
  if (region === ALL_REGIONS) return cabildeos
  return cabildeos.filter(c => c.region === region)
}

function filterByResolution(
  cabildeos: CabildeoView[],
  resolution: ResolutionFilter,
) {
  if (resolution === 'all') return cabildeos
  if (resolution === 'active') {
    return cabildeos.filter(c => c.phase !== 'resolved')
  }
  return cabildeos.filter(c => c.phase === resolution)
}

function filterByAccess(
  cabildeos: CabildeoView[],
  visibility: LobbyingVisibility,
) {
  return cabildeos.filter(c => getLobbyingAccess(c) === visibility)
}

/** Animated card wrapper — staggered fade-in + translateY */
function AnimatedCard({
  children,
  index,
}: {
  children: React.ReactNode
  index: number
}) {
  const reducedMotion = useReducedMotion()
  const progress = useSharedValue(reducedMotion ? 1 : 0)

  progress.set(() =>
    withDelay(
      index * 70,
      withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      }),
    ),
  )

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{translateY: (1 - progress.get()) * 16}],
  }))

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}

/** Segmented toggle for Public / Private */
function VisibilityToggle({
  active,
  onChange,
}: {
  active: LobbyingVisibility
  onChange: (v: LobbyingVisibility) => void
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.toggleContainer,
        {backgroundColor: t.palette.contrast_100},
      ]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Public Lobbying"
        accessibilityHint="Shows public lobbying proposals"
        accessibilityState={{selected: active === 'public'}}
        onPress={() => onChange('public')}
        style={[
          styles.toggleButton,
          active === 'public' && {
            backgroundColor: t.palette.primary_500,
          },
        ]}>
        <Text
          style={[
            styles.toggleText,
            active === 'public'
              ? {color: '#fff', fontWeight: '700'}
              : t.atoms.text_contrast_medium,
          ]}>
          <Trans>Public</Trans>
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Private Lobbying"
        accessibilityHint="Shows private lobbying proposals"
        accessibilityState={{selected: active === 'private'}}
        onPress={() => onChange('private')}
        style={[
          styles.toggleButton,
          active === 'private' && {
            backgroundColor: t.palette.primary_500,
          },
        ]}>
        <Text
          style={[
            styles.toggleText,
            active === 'private'
              ? {color: '#fff', fontWeight: '700'}
              : t.atoms.text_contrast_medium,
          ]}>
          <Trans>Private</Trans>
        </Text>
      </Pressable>
    </View>
  )
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={[
        styles.filterChip,
        active
          ? {backgroundColor: t.palette.primary_500}
          : t.atoms.bg_contrast_25,
      ]}>
      <Text
        style={[
          styles.filterChipText,
          active ? {color: '#fff'} : t.atoms.text_contrast_medium,
        ]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

function LobbyingShelfHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
}) {
  const t = useTheme()
  return (
    <View style={styles.lobbyingShelfHeader}>
      <View style={a.flex_1}>
        <Text style={[styles.lobbyingShelfTitle, t.atoms.text]}>{title}</Text>
        <Text
          style={[styles.lobbyingShelfSubtitle, t.atoms.text_contrast_medium]}>
          {subtitle}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={[styles.sectionAction, {color: t.palette.primary_500}]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Compact lobbying card for the Ágora feed */
function LobbyingCard({
  item,
  onPress,
  index,
  shelf = false,
}: {
  item: CabildeoView
  onPress: () => void
  index: number
  shelf?: boolean
}) {
  const t = useTheme()
  const phase = getCabildeoPhaseMeta(item.phase)
  const leadingOption = getCabildeoLeadingOption(item)
  const quorum = getQuorumProgress(item)
  const accessLabel =
    getLobbyingAccess(item) === 'public' ? 'Public' : 'Private'
  const positions = item.positionCounts?.total || 0
  const delegated = item.voteTotals?.delegated || 0

  return (
    <AnimatedCard index={index}>
      <PressableScale
        onPress={onPress}
        targetScale={0.98}
        style={[
          styles.lobbyingCard,
          shelf && styles.lobbyingCardShelf,
          t.atoms.bg,
          {borderColor: t.atoms.border_contrast_low.borderColor},
        ]}>
        <View style={styles.lobbyingHeader}>
          <View
            style={[styles.phaseBadge, {backgroundColor: phase.color + '20'}]}>
            <Text style={[styles.phaseBadgeText, {color: phase.color}]}>
              {phase.label}
            </Text>
          </View>
          <Text style={[styles.accessPill, t.atoms.text_contrast_medium]}>
            {accessLabel}
          </Text>
        </View>
        <Text style={[styles.lobbyingCommunity, t.atoms.text_contrast_medium]}>
          {item.community}
          {item.region ? ` · ${item.region}` : ''}
        </Text>
        <Text style={[styles.lobbyingTitle, t.atoms.text]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text
          style={[styles.lobbyingDesc, t.atoms.text_contrast_medium]}
          numberOfLines={2}>
          {item.description}
        </Text>

        {leadingOption ? (
          <View
            style={[
              styles.leadingOption,
              {backgroundColor: t.palette.contrast_50},
            ]}>
            <Text
              style={[styles.leadingOptionLabel, t.atoms.text_contrast_medium]}>
              <Trans>Leading option</Trans>
            </Text>
            <Text
              style={[styles.leadingOptionText, t.atoms.text]}
              numberOfLines={1}>
              {leadingOption.label}
            </Text>
          </View>
        ) : null}

        <View style={styles.lobbyingSignalGrid}>
          <View style={styles.lobbyingSignal}>
            <Text style={[styles.signalValue, t.atoms.text]}>
              {item.voteTotals?.total ?? 0}
            </Text>
            <Text style={[styles.signalLabel, t.atoms.text_contrast_medium]}>
              <Trans>votes</Trans>
            </Text>
          </View>
          <View style={styles.lobbyingSignal}>
            <Text style={[styles.signalValue, t.atoms.text]}>{positions}</Text>
            <Text style={[styles.signalLabel, t.atoms.text_contrast_medium]}>
              <Trans>arguments</Trans>
            </Text>
          </View>
          <View style={styles.lobbyingSignal}>
            <Text style={[styles.signalValue, t.atoms.text]}>
              {formatDeadline(item.phaseDeadline)}
            </Text>
            <Text style={[styles.signalLabel, t.atoms.text_contrast_medium]}>
              <Trans>window</Trans>
            </Text>
          </View>
        </View>

        {quorum ? (
          <View style={styles.quorumWrap}>
            <View style={styles.quorumHeader}>
              <Text style={[styles.quorumLabel, t.atoms.text_contrast_medium]}>
                <Trans>Quorum</Trans>
              </Text>
              <Text style={[styles.quorumLabel, t.atoms.text_contrast_medium]}>
                {quorum.participants}/{quorum.minimum}
              </Text>
            </View>
            <View
              style={[
                styles.quorumTrack,
                {backgroundColor: t.palette.contrast_100},
              ]}>
              <View
                style={[
                  styles.quorumFill,
                  {
                    backgroundColor: t.palette.primary_500,
                    width: `${quorum.ratio * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.lobbyingFooter}>
          <Text style={[styles.lobbyingVotes, t.atoms.text_contrast_medium]}>
            {delegated} <Trans>delegated</Trans>
          </Text>
          <Text style={[styles.lobbyingVotes, t.atoms.text_contrast_medium]}>
            {item.geoRestricted ? (
              <Trans>residents only</Trans>
            ) : (
              <Trans>open participation</Trans>
            )}
          </Text>
        </View>
      </PressableScale>
    </AnimatedCard>
  )
}

function LobbyingFocusCard({
  item,
  onPress,
  eyebrow,
  copyText,
}: {
  item: CabildeoView
  onPress: () => void
  eyebrow: string
  copyText: React.ReactNode
}) {
  const t = useTheme()
  const phase = getCabildeoPhaseMeta(item.phase)
  const positions = item.positionCounts?.total || 0

  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.focusCard,
        {
          backgroundColor: t.palette.primary_500 + '10',
          borderColor: t.palette.primary_500 + '33',
        },
      ]}>
      <View style={styles.focusHeader}>
        <Text style={[styles.focusEyebrow, {color: t.palette.primary_500}]}>
          {eyebrow}
        </Text>
        <Text style={[styles.focusPhase, {color: phase.color}]}>
          {phase.label}
        </Text>
      </View>
      <Text style={[styles.focusTitle, t.atoms.text]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.focusCopy, t.atoms.text_contrast_medium]}>
        {copyText}
      </Text>
      <View style={styles.focusMetaRow}>
        <Text style={[styles.focusMeta, t.atoms.text_contrast_medium]}>
          {item.voteTotals.total} <Trans>votes</Trans>
        </Text>
        <Text style={[styles.focusMeta, t.atoms.text_contrast_medium]}>
          {positions} <Trans>arguments</Trans>
        </Text>
        <Text style={[styles.focusMeta, t.atoms.text_contrast_medium]}>
          {formatDeadline(item.phaseDeadline)}
        </Text>
      </View>
    </PressableScale>
  )
}

/** Section header with title and optional action */
function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}) {
  const t = useTheme()
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={[
          t.atoms.text,
          {
            fontSize: 14,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 1,
          },
        ]}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={[styles.sectionAction, {color: t.palette.primary_500}]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

/** Community Directory card */
function CommunityDirectoryCard({onPress}: {onPress: () => void}) {
  const t = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.featureCard,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.featureCardHeader}>
        <View
          style={[
            styles.featureIconWrap,
            {backgroundColor: t.palette.primary_100},
          ]}>
          <TreeIcon size="md" style={{color: t.palette.primary_600}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.featureCardTitle, t.atoms.text]}>
            <Trans>Community Directory</Trans>
          </Text>
          <Text
            style={[styles.featureCardSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>Browse and join community Civic Trees</Trans>
          </Text>
        </View>
        <Text style={[styles.featureCardArrow, t.atoms.text_contrast_medium]}>
          →
        </Text>
      </View>
    </PressableScale>
  )
}

/** Your Community Civic Tree card - direct access to your primary community tree */
function YourCommunityCivicTreeCard({onPress}: {onPress: () => void}) {
  const t = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.featureCard,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.featureCardHeader}>
        <View
          style={[
            styles.featureIconWrap,
            {backgroundColor: t.palette.primary_100},
          ]}>
          <TreeIcon size="md" style={{color: t.palette.primary_600}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.featureCardTitle, t.atoms.text]}>
            <Trans>Your Community Civic Tree</Trans>
          </Text>
          <Text
            style={[styles.featureCardSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>
              Your community's proposals, evidence, votes, and arguments
            </Trans>
          </Text>
        </View>
        <Text style={[styles.featureCardArrow, t.atoms.text_contrast_medium]}>
          →
        </Text>
      </View>
    </PressableScale>
  )
}

/** Your Communities quick-access card */
function YourCommunitiesCard({onPress}: {onPress: () => void}) {
  const t = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.featureCard,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.featureCardHeader}>
        <View
          style={[
            styles.featureIconWrap,
            {backgroundColor: t.palette.positive_100},
          ]}>
          <Community size="md" style={{color: t.palette.positive_600}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.featureCardTitle, t.atoms.text]}>
            <Trans>Your Communities</Trans>
          </Text>
          <Text
            style={[styles.featureCardSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>Spaces you participate in</Trans>
          </Text>
        </View>
        <Text style={[styles.featureCardArrow, t.atoms.text_contrast_medium]}>
          →
        </Text>
      </View>
    </PressableScale>
  )
}

/** Regional map card */
function RegionalMapCard({onPress}: {onPress: () => void}) {
  const t = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.featureCard,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.featureCardHeader}>
        <View
          style={[
            styles.featureIconWrap,
            {backgroundColor: t.palette.negative_100},
          ]}>
          <GlobeIcon size="md" style={{color: t.palette.negative_500}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.featureCardTitle, t.atoms.text]}>
            <Trans>Regional Map</Trans>
          </Text>
          <Text
            style={[styles.featureCardSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>Civic initiatives near you</Trans>
          </Text>
        </View>
        <Text style={[styles.featureCardArrow, t.atoms.text_contrast_medium]}>
          →
        </Text>
      </View>
    </PressableScale>
  )
}

/** Self-contained Lobbying subsection with local state */
function LobbyingSection({
  onPressItem,
  onPressSeeAll,
  onPressRegionalSeeAll,
}: {
  onPressItem: (uri: string) => void
  onPressSeeAll: () => void
  onPressRegionalSeeAll: (region?: string) => void
}) {
  const infoDialogControl = Dialog.useDialogControl()
  const t = useTheme()
  const {_} = useLingui()
  const [selectedRegion, setSelectedRegion] =
    useState<RegionFilter>(ALL_REGIONS)
  const [selectedResolution, setSelectedResolution] =
    useState<ResolutionFilter>('all')
  const [partyVisibility, setPartyVisibility] =
    useState<LobbyingVisibility>('public')
  const [selectedPartyId, setSelectedPartyId] = useState<string | undefined>()

  const {data: cabildeos = []} = useCabildeosQuery()

  const resolutionOptions: Array<{key: ResolutionFilter; label: string}> = [
    {key: 'all', label: _(msg`All stages`)},
    {key: 'active', label: _(msg`Active`)},
    {key: 'open', label: _(msg`Open`)},
    {key: 'deliberating', label: _(msg`Deliberating`)},
    {key: 'voting', label: _(msg`Voting`)},
    {key: 'resolved', label: _(msg`Resolved`)},
  ]

  const resolutionScopedAllRegions = useMemo(
    () => filterByResolution(cabildeos, selectedResolution),
    [cabildeos, selectedResolution],
  )

  const regionOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of resolutionScopedAllRegions) {
      if (c.region) {
        counts.set(c.region, (counts.get(c.region) || 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([region, count]) => ({region, count}))
      .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region))
  }, [resolutionScopedAllRegions])

  const entityScoped = useMemo(
    () => filterByRegion(cabildeos, selectedRegion),
    [cabildeos, selectedRegion],
  )

  const regionScoped = useMemo(
    () => filterByResolution(entityScoped, selectedResolution),
    [entityScoped, selectedResolution],
  )

  const publicRegionScoped = useMemo(
    () => filterByAccess(regionScoped, 'public'),
    [regionScoped],
  )

  const stats = useMemo(() => {
    const active = regionScoped.filter(c => c.phase !== 'resolved').length
    const voting = regionScoped.filter(c => c.phase === 'voting').length
    const deliberating = regionScoped.filter(
      c => c.phase === 'deliberating',
    ).length
    const delegated = regionScoped.reduce(
      (sum, c) => sum + (c.voteTotals?.delegated || 0),
      0,
    )
    return {active, voting, deliberating, delegated}
  }, [regionScoped])

  const trending = useMemo(
    () =>
      [...publicRegionScoped]
        .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
        .slice(0, 5),
    [publicRegionScoped],
  )

  const regionalFocus =
    selectedRegion === ALL_REGIONS ? regionOptions[0]?.region : selectedRegion

  const regionalItems = useMemo(() => {
    if (!regionalFocus) return []
    return filterByResolution(
      filterByAccess(cabildeos, 'public'),
      selectedResolution,
    )
      .filter(c => c.region === regionalFocus)
      .sort(compareLobbyingPriority)
      .slice(0, 5)
  }, [cabildeos, regionalFocus, selectedResolution])

  const partyOptions = useMemo(() => {
    const counts = new Map<string, {party: AlignedParty; count: number}>()
    for (const c of regionScoped) {
      const party = getCabildeoAlignedParty(c)
      const existing = counts.get(party.id)
      counts.set(party.id, {
        party,
        count: (existing?.count || 0) + 1,
      })
    }
    return Array.from(counts.values()).sort(
      (a, b) => b.count - a.count || a.party.name.localeCompare(b.party.name),
    )
  }, [regionScoped])

  const viewerParty =
    getVoteBreakdownByParty(regionScoped)[0]?.party || partyOptions[0]?.party
  const selectedParty =
    partyOptions.find(item => item.party.id === selectedPartyId)?.party ||
    viewerParty

  const partyItems = useMemo(() => {
    if (!selectedParty) return []
    return filterByAccess(regionScoped, partyVisibility)
      .filter(c => getCabildeoAlignedParty(c).id === selectedParty.id)
      .sort(compareLobbyingPriority)
      .slice(0, 4)
  }, [partyVisibility, regionScoped, selectedParty])

  const spotlight = trending[0]

  return (
    <View style={styles.sectionWrap}>
      <View style={styles.lobbyingSectionHeader}>
        <View style={styles.lobbyingSectionTitleRow}>
          <MegaphoneIcon style={{color: t.palette.primary_500}} width={20} />
          <Text
            style={[
              t.atoms.text,
              {
                fontSize: 16,
                fontWeight: '900',
              },
            ]}>
            <Trans>Lobbying</Trans>
          </Text>
          <PressableScale
            accessibilityRole="button"
            onPress={infoDialogControl.open}
            hitSlop={10}
            style={{marginLeft: 6}}>
            <InfoIcon size="sm" style={{color: t.palette.primary_500}} />
          </PressableScale>
        </View>
        <View style={styles.lobbyingStatsRow}>
          <Text style={[styles.lobbyingStatPill, t.atoms.text_contrast_medium]}>
            {stats.active} <Trans>active</Trans>
          </Text>
          <Text style={[styles.lobbyingStatPill, t.atoms.text_contrast_medium]}>
            {stats.voting} <Trans>voting</Trans>
          </Text>
          <Text style={[styles.lobbyingStatPill, t.atoms.text_contrast_medium]}>
            {stats.deliberating} <Trans>deliberating</Trans>
          </Text>
          <Text style={[styles.lobbyingStatPill, t.atoms.text_contrast_medium]}>
            {stats.delegated} <Trans>delegated</Trans>
          </Text>
        </View>
      </View>

      <Dialog.Outer control={infoDialogControl}>
        <Dialog.Handle />
        <Dialog.ScrollableInner
          accessibilityDescribedBy="lobbying-info"
          accessibilityLabel={_(msg`Lobbying Information`)}>
          <View style={a.gap_md}>
            <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
              <Trans>Lobbying</Trans>
            </Text>
            <Text style={[a.text_md, t.atoms.text_contrast_high]}>
              <Trans>
                Cabildeos are the working items inside Civic Trees: proposals,
                evidence, arguments, vote windows, and delegated power in one place.
              </Trans>
            </Text>
            <Dialog.Close />
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>

      <View style={styles.filterGroup}>
        <Text style={[styles.filterGroupLabel, t.atoms.text_contrast_medium]}>
          <Trans>Resolution state</Trans>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionFilterRow}>
          {resolutionOptions.map(option => (
            <FilterChip
              key={option.key}
              label={option.label}
              active={selectedResolution === option.key}
              onPress={() => setSelectedResolution(option.key)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterGroup}>
        <Text style={[styles.filterGroupLabel, t.atoms.text_contrast_medium]}>
          <Trans>State entity</Trans>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionFilterRow}>
          <FilterChip
            label={_(msg`All entities`)}
            active={selectedRegion === ALL_REGIONS}
            onPress={() => setSelectedRegion(ALL_REGIONS)}
          />
          {regionOptions.map(option => (
            <FilterChip
              key={option.region}
              label={`${option.region} · ${option.count}`}
              active={selectedRegion === option.region}
              onPress={() => setSelectedRegion(option.region)}
            />
          ))}
        </ScrollView>
      </View>

      {spotlight ? (
        <View style={{marginTop: 12}}>
          <LobbyingFocusCard
            item={spotlight}
            eyebrow={_(msg`Highest momentum`)}
            copyText={
              <Trans>
                This cabildeo is pulling the most attention in the selected
                filters. Read the strongest option, then decide whether to
                argue, delegate, or vote.
              </Trans>
            }
            onPress={() => onPressItem(spotlight.uri)}
          />
        </View>
      ) : null}

      <View style={styles.lobbyingShelf}>
        <LobbyingShelfHeader
          title={_(msg`Trending now`)}
          subtitle={_(
            msg`Fast-moving public cabildeos with votes, arguments, and delegation pressure.`,
          )}
          actionLabel={_(msg`See all`)}
          onAction={onPressSeeAll}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.lobbyingShelfRow}>
          {trending.length === 0 ? (
            <View
              style={[
                styles.emptyShelfCard,
                {borderColor: t.atoms.border_contrast_low.borderColor},
              ]}>
              <Text
                style={[styles.emptyStateText, t.atoms.text_contrast_medium]}>
                <Trans>No public momentum in these filters yet.</Trans>
              </Text>
            </View>
          ) : (
            trending.map((c, i) => (
              <LobbyingCard
                key={c.uri}
                item={c}
                onPress={() => onPressItem(c.uri)}
                index={i}
                shelf
              />
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.lobbyingShelf}>
        <LobbyingShelfHeader
          title={
            regionalFocus ? _(msg`In ${regionalFocus}`) : _(msg`In your region`)
          }
          subtitle={_(
            msg`Region-scoped proposals where place, residency, and local evidence matter.`,
          )}
          actionLabel={_(msg`Open Lobbying`)}
          onAction={() => onPressRegionalSeeAll(regionalFocus)}
        />
        <View style={styles.cardList}>
          {regionalItems.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {borderColor: t.atoms.border_contrast_low.borderColor},
              ]}>
              <Text
                style={[styles.emptyStateText, t.atoms.text_contrast_medium]}>
                <Trans>No regional cabildeos match these filters yet.</Trans>
              </Text>
            </View>
          ) : (
            regionalItems
              .slice(0, 3)
              .map((c, i) => (
                <LobbyingCard
                  key={c.uri}
                  item={c}
                  onPress={() => onPressItem(c.uri)}
                  index={i}
                />
              ))
          )}
        </View>
      </View>

      <View
        style={[
          styles.partyDesk,
          t.atoms.bg_contrast_25,
          {borderColor: t.atoms.border_contrast_low.borderColor},
        ]}>
        <View style={styles.partyDeskHeader}>
          <View style={a.flex_1}>
            <Text
              style={[styles.partyDeskEyebrow, {color: t.palette.primary_500}]}>
              <Trans>Your party desk</Trans>
            </Text>
            <Text style={[styles.partyDeskTitle, t.atoms.text]}>
              {selectedParty?.name || _(msg`Choose a party`)}
            </Text>
            <Text
              style={[styles.partyDeskSubtitle, t.atoms.text_contrast_medium]}>
              <Trans>
                Compare what your political family is carrying publicly with
                what needs internal work.
              </Trans>
            </Text>
          </View>
          {selectedParty ? (
            <View
              style={[
                styles.partyColorSwatch,
                {backgroundColor: selectedParty.color},
              ]}
            />
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.partyChipRow}>
          {partyOptions.map(({party, count}) => (
            <FilterChip
              key={party.id}
              label={`${party.name} · ${count}`}
              active={selectedParty?.id === party.id}
              onPress={() => setSelectedPartyId(party.id)}
            />
          ))}
        </ScrollView>

        <VisibilityToggle
          active={partyVisibility}
          onChange={setPartyVisibility}
        />

        <View style={styles.cardList}>
          {partyItems.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {borderColor: t.atoms.border_contrast_low.borderColor},
              ]}>
              <Text
                style={[styles.emptyStateText, t.atoms.text_contrast_medium]}>
                <Trans>No cabildeos for this party and visibility yet.</Trans>
              </Text>
            </View>
          ) : (
            partyItems.map((c, i) => (
              <LobbyingCard
                key={c.uri}
                item={c}
                onPress={() => onPressItem(c.uri)}
                index={i}
              />
            ))
          )}
        </View>
      </View>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Main Screen ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

export function AgoraScreen() {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const [refreshing, setRefreshing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const howItWorksControl = Dialog.useDialogControl()

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setHasError(false)
    // LobbyingSection handles its own refetch via useCabildeosQuery
    setTimeout(() => setRefreshing(false), 800)
  }, [])

  const handlePressLobbyingItem = useCallback(
    (uri: string) => {
      navigation.navigate('CabildeoDetail', {cabildeoUri: uri})
    },
    [navigation],
  )

  const handlePressLobbyingList = useCallback(() => {
    navigation.navigate('CabildeoList')
  }, [navigation])

  const handlePressRegionalLobbying = useCallback(
    (region?: string) => {
      navigation.navigate('Map', {layer: 'civic', state: region})
    },
    [navigation],
  )

  const handlePressCommunities = useCallback(() => {
    navigation.navigate('MyCommunities')
  }, [navigation])

  const handlePressCommunityDirectory = useCallback(() => {
    navigation.navigate('CommunityDirectory')
  }, [navigation])

  const handlePressYourCommunityCivicTree = useCallback(() => {
    navigation.navigate('CommunityCivicTree')
  }, [navigation])

  const handlePressMap = useCallback(() => {
    navigation.navigate('Map')
  }, [navigation])

  const handlePressCreateLobbying = useCallback(() => {
    navigation.navigate('CreateCabildeo')
  }, [navigation])

  return (
    <Layout.Screen>
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Ágora</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <PressableScale
            onPress={howItWorksControl.open}
            targetScale={0.9}
            style={styles.headerButton}>
            <Text
              style={[styles.headerButtonText, {color: t.palette.primary_500}]}>
              ?
            </Text>
          </PressableScale>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {/* ─── Explore (Discovery) — TOP OF PAGE ─────────────────────── */}
          <View style={styles.sectionWrap}>
            <View style={styles.featureGrid}>
              <YourCommunitiesCard onPress={handlePressCommunities} />
              <CommunityDirectoryCard onPress={handlePressCommunityDirectory} />
              <YourCommunityCivicTreeCard
                onPress={handlePressYourCommunityCivicTree}
              />
              <RegionalMapCard onPress={handlePressMap} />
            </View>
          </View>

          {/* ─── Lobbying Subsection ───────────────────────────────────── */}
          <LobbyingSection
            onPressItem={handlePressLobbyingItem}
            onPressSeeAll={handlePressLobbyingList}
            onPressRegionalSeeAll={handlePressRegionalLobbying}
          />

          {hasError && (
            <EmptyStateError
              message={_(msg`Couldn't load Ágora data. Tap to retry.`)}
              onRetry={onRefresh}
            />
          )}
        </ScrollView>
      </Layout.Center>

      {/* FAB — Create Lobbying */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={i18n._(msg`Create Lobbying`)}
        accessibilityHint={i18n._(
          msg`Opens the screen to create a new policy proposal`,
        )}
        onPress={handlePressCreateLobbying}
        targetScale={0.92}
        style={[styles.fab, {backgroundColor: t.palette.primary_500}]}>
        <Text style={styles.fabText}>＋</Text>
      </PressableScale>

      <Dialog.Outer control={howItWorksControl}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={_(msg`How it works`)}>
          <HowItWorksSheet onClose={howItWorksControl.close} />
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </Layout.Screen>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Styles ════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
  },
  sectionWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ─── Header ─────────────────────────────────────────────────────────────────
  headerButton: {paddingHorizontal: 16, paddingVertical: 8},
  headerButtonText: {fontSize: 18, fontWeight: '700'},

  // ─── Toggle ─────────────────────────────────────────────────────────────────
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── Section Header ─────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 190,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ─── Lobbying Section ───────────────────────────────────────────────────────
  lobbyingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lobbyingSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lobbyingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  lobbyingStatPill: {
    fontSize: 11,
    fontWeight: '600',
  },
  lobbyingIntro: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  filterGroup: {
    marginTop: 12,
    gap: 6,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  regionFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  lobbyingShelf: {
    marginTop: 18,
    gap: 10,
  },
  lobbyingShelfHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  lobbyingShelfTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  lobbyingShelfSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 2,
  },
  lobbyingShelfRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  cardList: {
    gap: 10,
  },
  emptyShelfCard: {
    width: 280,
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  focusEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  focusPhase: {
    fontSize: 11,
    fontWeight: '800',
  },
  focusTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  focusCopy: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  focusMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusMeta: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Lobbying Card ──────────────────────────────────────────────────────────
  lobbyingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  lobbyingCardShelf: {
    width: 286,
  },
  lobbyingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  phaseBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accessPill: {
    fontSize: 11,
    fontWeight: '700',
  },
  lobbyingCommunity: {
    fontSize: 11,
    fontWeight: '500',
  },
  lobbyingTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  lobbyingDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  leadingOption: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    marginTop: 2,
  },
  leadingOptionLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  leadingOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lobbyingSignalGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  lobbyingSignal: {
    flex: 1,
    minWidth: 0,
  },
  signalValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  signalLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  quorumWrap: {
    gap: 6,
    marginTop: 2,
  },
  quorumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quorumLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  quorumTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  quorumFill: {
    height: 5,
    borderRadius: 999,
  },
  lobbyingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  lobbyingVotes: {
    fontSize: 12,
    fontWeight: '600',
  },
  partyDesk: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginTop: 20,
  },
  partyDeskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  partyDeskEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  partyDeskTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  partyDeskSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  partyColorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  partyChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 12,
  },

  // ─── Empty State ────────────────────────────────────────────────────────────
  emptyState: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ─── Feature Cards ──────────────────────────────────────────────────────────
  featureGrid: {
    gap: 10,
    marginTop: 10,
  },
  featureCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  featureCardArrow: {
    fontSize: 18,
    fontWeight: '400',
  },

  // ─── FAB ────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    lineHeight: 32,
  },
})
