import {useCallback, useMemo, useState} from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {
  deleteHighlight,
  getAllHighlights,
  saveHighlight,
} from '#/state/highlights/highlightStorage'
import {type HighlightColor} from '#/state/highlights/highlightTypes'
import {useHighlightsQuery} from '#/state/queries/highlights'
import {useSession} from '#/state/session'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {List} from '#/view/com/util/List'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {ActiveFiltersStackButton} from '#/components/CompassFilterControls'
import {EmptyStateNoData} from '#/components/EmptyStates'
import {SearchInput} from '#/components/forms/SearchInput'
import {ArrowShareRight_Stroke2_Corner2_Rounded as ShareIcon} from '#/components/icons/ArrowShareRight'
import {Bookmark, BookmarkFilled} from '#/components/icons/Bookmark'
import {CommunityIcon_Stroke as CommunityIcon} from '#/components/icons/Community'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {Flame_Stroke2_Corner1_Rounded as FlameIcon} from '#/components/icons/Flame'
import {Globe_Stroke2_Corner0_Rounded as GlobeIcon} from '#/components/icons/Globe'
import {UserCircle_Stroke2_Corner0_Rounded as UserIcon} from '#/components/icons/UserCircle'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {
  buildHighlightCardViews,
  filterHighlightCards,
  getHighlightsForScope,
  getSignalSummaries,
  type HighlightCardView,
  type HighlightScope,
  type HighlightSort,
  originalHighlightId,
  savedHighlightId,
  sortHighlightCards,
} from './highlightsViewModel'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Highlights'>
type ScopeMeta = {
  key: HighlightScope
  label: string
  description: string
}

const SCOPES: ScopeMeta[] = [
  {
    key: 'signals',
    label: 'Signals',
    description: 'Public civic annotations across PARA',
  },
  {
    key: 'map',
    label: 'Map',
    description: 'Attention by community and place',
  },
  {
    key: 'saved',
    label: 'Saved',
    description: 'Private reading queue',
  },
  {
    key: 'mine',
    label: 'Mine',
    description: 'Annotations you created',
  },
]

const SORTS: Array<{key: HighlightSort; label: string}> = [
  {key: 'recent', label: 'Recent'},
  {key: 'popular', label: 'Signal'},
  {key: 'saved', label: 'Saved'},
]

export function HighlightsScreen({route, navigation}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {activeFilters} = useCompassFilter()
  const routeParams = route.params

  const [scope, setScope] = useState<HighlightScope>(
    normalizeScope(routeParams?.scope),
  )
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<HighlightSort>('recent')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [localHighlights, setLocalHighlights] = useState(() =>
    getAllHighlights(),
  )

  const {
    data: publicHighlights = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useHighlightsQuery()

  const savedIds = useMemo(() => {
    return new Set(
      localHighlights
        .filter(item => item.id.startsWith('saved:'))
        .map(item => originalHighlightId(item.id)),
    )
  }, [localHighlights])

  const allCards = useMemo(() => {
    return buildHighlightCardViews({
      publicHighlights,
      localHighlights,
      savedIds,
      viewerDid: currentAccount?.did,
    })
  }, [currentAccount?.did, localHighlights, publicHighlights, savedIds])

  const summaries = useMemo(() => getSignalSummaries(allCards), [allCards])

  const visibleCards = useMemo(() => {
    const scoped = getHighlightsForScope(allCards, scope, currentAccount?.did)
    const filtered = filterHighlightCards({
      highlights: scoped,
      query,
      verifiedOnly,
      activeFilters,
      routeFilters: {
        community: routeParams?.community,
        state: routeParams?.state,
        subject: routeParams?.subject,
        creator: routeParams?.creator,
      },
    })
    return sortHighlightCards(filtered, sort)
  }, [
    activeFilters,
    allCards,
    currentAccount?.did,
    query,
    routeParams?.community,
    routeParams?.creator,
    routeParams?.state,
    routeParams?.subject,
    scope,
    sort,
    verifiedOnly,
  ])

  const onRefresh = useCallback(async () => {
    setLocalHighlights(getAllHighlights())
    await refetch()
  }, [refetch])

  const toggleSave = useCallback(
    (highlight: HighlightCardView) => {
      const id = originalHighlightId(highlight.id)
      const subjectUri = highlight.sourcePostUri || highlight.id
      const savedId = savedHighlightId(id)

      if (savedIds.has(id)) {
        deleteHighlight(subjectUri, savedId)
      } else {
        const text = highlight.postPreview || highlight.text
        const start =
          typeof highlight.start === 'number'
            ? highlight.start
            : Math.max(0, text.indexOf(highlight.text))
        const end =
          typeof highlight.end === 'number'
            ? highlight.end
            : start + highlight.text.length

        saveHighlight(subjectUri, {
          id: savedId,
          start,
          end,
          color: (highlight.color || '#FEF08A') as HighlightColor,
          text: highlight.text,
          isPublic: false,
          tag: highlight.community,
        })
      }

      setLocalHighlights(getAllHighlights())
    },
    [savedIds],
  )

  const renderItem = useCallback(
    ({item}: {item: unknown}) => {
      const highlight = item as HighlightCardView
      return (
        <HighlightCard
          highlight={highlight}
          onOpen={() =>
            navigation.navigate('SeeHighlightDetails', {
              highlightId: originalHighlightId(highlight.id),
            })
          }
          onSave={() => toggleSave(highlight)}
        />
      )
    },
    [navigation, toggleSave],
  )

  const header = (
    <View style={styles.header}>
      <View style={styles.kickerRow}>
        <View
          style={[
            styles.kickerIcon,
            {backgroundColor: t.palette.primary_500 + '18'},
          ]}>
          <FlameIcon
            width={18}
            height={18}
            style={{color: t.palette.primary_500}}
          />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.kicker, t.atoms.text_contrast_medium]}>
            CIVIC INTEL
          </Text>
          <Text style={[styles.title, t.atoms.text]}>Highlights</Text>
        </View>
        <ActiveFiltersStackButton />
      </View>

      <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
        What people are noticing across communities, places, and debates.
      </Text>

      <View style={styles.scopeTabs}>
        {SCOPES.map(item => {
          const selected = scope === item.key
          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={item.key}
              onPress={() => setScope(item.key)}
              style={[
                styles.scopeTab,
                selected ? t.atoms.bg_contrast_100 : t.atoms.bg_contrast_25,
              ]}>
              <ScopeIcon scope={item.key} selected={selected} />
              <View style={a.flex_1}>
                <Text
                  style={[
                    styles.scopeLabel,
                    selected ? t.atoms.text : t.atoms.text_contrast_medium,
                  ]}>
                  {item.label}
                </Text>
                <Text
                  style={[styles.scopeDescription, t.atoms.text_contrast_low]}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={_(msg`Search highlights, people, places`)}
        onClearText={() => setQuery('')}
        style={styles.search}
      />

      <View style={styles.controls}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setVerifiedOnly(value => !value)}
          style={[
            styles.iconToggle,
            verifiedOnly
              ? {backgroundColor: t.palette.primary_500 + '20'}
              : t.atoms.bg_contrast_25,
          ]}>
          <VerifiedIcon
            width={17}
            height={17}
            style={
              verifiedOnly
                ? {color: t.palette.primary_500}
                : t.atoms.text_contrast_medium
            }
          />
          <Text
            style={[
              styles.controlText,
              verifiedOnly
                ? {color: t.palette.primary_500}
                : t.atoms.text_contrast_medium,
            ]}>
            Verified
          </Text>
        </TouchableOpacity>

        {SORTS.map(item => {
          const selected = sort === item.key
          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={item.key}
              onPress={() => setSort(item.key)}
              style={[
                styles.sortButton,
                selected
                  ? {backgroundColor: t.palette.primary_500 + '20'}
                  : t.atoms.bg_contrast_25,
              ]}>
              <Text
                style={[
                  styles.controlText,
                  selected
                    ? {color: t.palette.primary_500}
                    : t.atoms.text_contrast_medium,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {scope === 'map' && summaries.length > 0 && (
        <View style={styles.summaryGrid}>
          {summaries.map(summary => (
            <TouchableOpacity
              accessibilityRole="button"
              key={summary.key}
              onPress={() =>
                summary.kind === 'state'
                  ? navigation.navigate('Map', {
                      state: summary.label,
                      layer: 'states',
                    })
                  : navigation.navigate('Highlights', {
                      scope: 'signals',
                      community: summary.label,
                    })
              }
              style={[styles.summaryCard, t.atoms.bg_contrast_25]}>
              <View
                style={[styles.summaryDot, {backgroundColor: summary.color}]}
              />
              <Text
                style={[styles.summaryLabel, t.atoms.text]}
                numberOfLines={1}>
                {summary.label}
              </Text>
              <Text style={[styles.summaryCount, t.atoms.text_contrast_medium]}>
                {summary.count} signals
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )

  return (
    <Layout.Screen testID="highlightsScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {_(msg`Highlights`)}
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={a.flex_1}>
        <List
          data={visibleCards}
          renderItem={renderItem}
          keyExtractor={item => {
            const highlight = item as HighlightCardView
            return `${highlight.source}:${highlight.id}`
          }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <HighlightEmptyState
              isLoading={isLoading}
              isError={isError}
              scope={scope}
              onRetry={() => {
                void onRefresh()
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={() => {
            void onRefresh()
          }}
        />
      </Layout.Center>
    </Layout.Screen>
  )
}

function HighlightCard({
  highlight,
  onOpen,
  onSave,
}: {
  highlight: HighlightCardView
  onOpen: () => void
  onSave: () => void
}) {
  const t = useTheme()
  const primaryColor = Array.isArray(highlight.color)
    ? highlight.color[0]
    : highlight.color

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({pressed}) => [
        styles.card,
        t.atoms.bg_contrast_25,
        pressed && {opacity: 0.86},
      ]}>
      <View style={[styles.cardStripe, {backgroundColor: primaryColor}]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.chipRow}>
            <MetaChip label={highlight.community} color={primaryColor} />
            {highlight.state ? <MetaChip label={highlight.state} /> : null}
            {highlight.party ? <MetaChip label={highlight.party} /> : null}
          </View>
          {highlight.isVerified ? (
            <VerifiedIcon
              width={17}
              height={17}
              style={{color: t.palette.primary_500}}
            />
          ) : null}
        </View>

        <Text style={[styles.quote, t.atoms.text]}>
          “{highlight.text.trim()}”
        </Text>

        <Text
          style={[styles.preview, t.atoms.text_contrast_medium]}
          numberOfLines={3}>
          {highlight.postPreview || highlight.text}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.author}>
            <Image
              accessibilityIgnoresInvertColors
              source={{uri: highlight.avatarUrl}}
              style={styles.avatar}
            />
            <View style={a.flex_1}>
              <Text style={[styles.authorName, t.atoms.text]} numberOfLines={1}>
                {highlight.authorName}
              </Text>
              <Text
                style={[styles.authorMeta, t.atoms.text_contrast_low]}
                numberOfLines={1}>
                @{highlight.postAuthor} · {formatAge(highlight.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                highlight.savedLocally ? 'Unsave highlight' : 'Save highlight'
              }
              accessibilityHint="Adds or removes this highlight from your saved highlights"
              onPress={onSave}
              hitSlop={10}>
              {highlight.savedLocally ? (
                <BookmarkFilled
                  width={20}
                  height={20}
                  style={{color: t.palette.primary_500}}
                />
              ) : (
                <Bookmark
                  width={20}
                  height={20}
                  style={t.atoms.text_contrast_medium}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Share highlight"
              accessibilityHint="Opens sharing options for this highlight"
              onPress={() => Toast.show('Highlight sharing coming soon')}
              hitSlop={10}>
              <ShareIcon
                width={20}
                height={20}
                style={t.atoms.text_contrast_medium}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

function HighlightEmptyState({
  isLoading,
  isError,
  scope,
  onRetry,
}: {
  isLoading: boolean
  isError: boolean
  scope: HighlightScope
  onRetry: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  if (isLoading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator />
        <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
          Loading civic signals...
        </Text>
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, t.atoms.text]}>
          Could not load highlights
        </Text>
        <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
          Check the backend connection and try again.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onRetry}
          style={[
            styles.retryButton,
            {backgroundColor: t.palette.primary_500},
          ]}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <EmptyStateNoData
      icon={scope === 'saved' ? '🔖' : '◌'}
      title={_(msg`No highlights yet`)}
      message={_(
        msg`New civic annotations will appear here as people publish them.`,
      )}
    />
  )
}

function ScopeIcon({
  scope,
  selected,
}: {
  scope: HighlightScope
  selected: boolean
}) {
  const t = useTheme()
  const color = selected
    ? t.palette.primary_500
    : t.atoms.text_contrast_medium.color
  const props = {width: 18, height: 18, style: {color}}

  switch (scope) {
    case 'map':
      return <GlobeIcon {...props} />
    case 'saved':
      return <Bookmark {...props} />
    case 'mine':
      return <UserIcon {...props} />
    case 'signals':
    default:
      return <CompassIcon {...props} />
  }
}

function MetaChip({label, color}: {label: string; color?: string}) {
  const t = useTheme()
  return (
    <View style={[styles.metaChip, t.atoms.bg_contrast_50]}>
      {color ? (
        <View style={[styles.metaDot, {backgroundColor: color}]} />
      ) : null}
      {!color ? (
        <CommunityIcon
          width={12}
          height={12}
          style={t.atoms.text_contrast_medium}
        />
      ) : null}
      <Text
        style={[styles.metaChipText, t.atoms.text_contrast_medium]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function normalizeScope(value: unknown): HighlightScope {
  switch (value) {
    case 'map':
    case 'saved':
    case 'mine':
    case 'signals':
      return value
    default:
      return 'signals'
  }
}

function formatAge(timestamp: number) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 30) return `${days}d`
  return new Date(timestamp).toLocaleDateString()
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 96,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kickerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  scopeTabs: {
    gap: 8,
  },
  scopeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scopeLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  scopeDescription: {
    fontSize: 12,
    marginTop: 1,
  },
  search: {
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sortButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  controlText: {
    fontSize: 12,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 8,
    padding: 10,
    gap: 5,
  },
  summaryDot: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  summaryCount: {
    fontSize: 12,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardStripe: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    maxWidth: 180,
  },
  metaDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  quote: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '800',
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D1D5DB',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
  },
  authorMeta: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryText: {
    color: '#fff',
    fontWeight: '800',
  },
})
