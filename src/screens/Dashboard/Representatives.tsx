import {useMemo, useState} from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {
  type RepresentativeItem,
  useRepresentativesQuery,
} from '#/state/queries/data-tab'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {ActiveFiltersStackButton} from '#/components/CompassFilterControls'
import {EmptyStateError, EmptyStateNoData} from '#/components/EmptyStates'
import {SearchInput} from '#/components/forms/SearchInput'
import {ArrowsDiagonalIn_Stroke2_Corner0_Rounded as SortIcon} from '#/components/icons/ArrowsDiagonal'
import {Globe_Stroke2_Corner0_Rounded as CommunityIcon} from '#/components/icons/Globe'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

const CATEGORIES = [
  'All',
  'President',
  'Governor',
  'Senator',
  'Federal Deputy',
  'Leader',
  'Spokesperson',
  'Treasurer',
  'City Council',
  'Activist',
]

type SortMode = 'impact' | 'name' | 'office'
type ViewMode = 'all' | 'official' | 'community'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Representatives'>

export function RepresentativesScreen({route}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()

  const [selectedCategory, setSelectedCategory] = useState(
    route.params?.category || 'All',
  )
  const [searchQuery, setSearchQuery] = useState(route.params?.q || '')
  const [sortMode, setSortMode] = useState<SortMode>('impact')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const {activeFilters} = useCompassFilter()

  const {
    data,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useRepresentativesQuery({
    category: selectedCategory,
    query: searchQuery,
  })

  const reps = data?.pages.flatMap(page => page.items) || []

  const filteredReps = useMemo(() => {
    let result = reps.filter(rep => {
      if (activeFilters.length > 0) {
        const matchesFilter = activeFilters.some(
          filter => filter === rep.affiliate || filter === rep.state,
        )
        if (!matchesFilter) return false
      }
      if (viewMode === 'official') return rep.type === 'Party'
      if (viewMode === 'community') return rep.type === 'Community'
      return true
    })

    result = [...result].sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name)
      if (sortMode === 'office') return a.category.localeCompare(b.category)
      return representativeScore(b) - representativeScore(a)
    })

    return result
  }, [activeFilters, reps, sortMode, viewMode])

  const featuredReps = filteredReps.slice(0, 3)

  const onPressRep = (rep: RepresentativeItem) => {
    navigation.navigate('Profile', {name: rep.handle})
  }

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return `${n}`
  }

  return (
    <Layout.Screen testID="representativesScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Representatives</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <ActiveFiltersStackButton />
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}>
          <View style={styles.searchPanel}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClearText={() => setSearchQuery('')}
              placeholder={_(msg`Search names, handles, offices...`)}
              style={styles.searchInput}
            />
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                {value: 'all', label: _(msg`Todos`)},
                {value: 'official', label: _(msg`Oficiales`)},
                {value: 'community', label: _(msg`Comunidad`)},
              ]}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}>
            {CATEGORIES.map(category => (
              <FilterPill
                key={category}
                label={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
              />
            ))}
          </ScrollView>

          {!isLoading && !error && featuredReps.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, t.atoms.text]}>
                  <Trans>Representantes clave</Trans>
                </Text>
                <SortToggle value={sortMode} onChange={setSortMode} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}>
                {featuredReps.map(rep => (
                  <FeaturedRepCard
                    key={`featured-${rep.id}`}
                    rep={rep}
                    onPress={() => onPressRep(rep)}
                    formatCount={formatCount}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {isLoading && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={t.palette.primary_500} />
            </View>
          )}

          {error && (
            <EmptyStateError
              message={_(msg`Couldn't load representatives. Tap to retry.`)}
              onRetry={refetch}
            />
          )}

          {!isLoading && !error && filteredReps.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderCompact}>
                <Text style={[styles.sectionTitle, t.atoms.text]}>
                  <Trans>Directorio verificable</Trans>
                </Text>
                <Text
                  style={[styles.resultCount, t.atoms.text_contrast_medium]}>
                  {filteredReps.length} <Trans>resultados</Trans>
                </Text>
              </View>
              {filteredReps.map(rep => (
                <RepCard
                  key={rep.id}
                  rep={rep}
                  onPress={() => onPressRep(rep)}
                  formatCount={formatCount}
                />
              ))}
              {hasNextPage && (
                <Button
                  label={_(msg`Load more representatives`)}
                  variant="ghost"
                  color="secondary"
                  size="large"
                  onPress={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}>
                  <ButtonText>
                    {isFetchingNextPage ? (
                      <Trans>Cargando...</Trans>
                    ) : (
                      <Trans>Cargar más</Trans>
                    )}
                  </ButtonText>
                </Button>
              )}
            </View>
          ) : (
            !isLoading &&
            !error && (
              <EmptyStateNoData
                icon="🏛️"
                title={_(msg`No representatives found`)}
                message={_(msg`Try adjusting your filters or search terms.`)}
              />
            )
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

function representativeScore(rep: RepresentativeItem) {
  const reach = Math.log10((rep.followersCount ?? 0) + 1) * 10
  const hasMandate = rep.description ? 16 : 0
  const typeWeight = rep.type === 'Party' ? 14 : 10
  const activity =
    Math.log10((rep.postsCount ?? 0) + 1) * 3 +
    Math.log10((rep.followingCount ?? 0) + 1)
  return reach + hasMandate + typeWeight + activity
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: ViewMode
  onChange: (value: ViewMode) => void
  options: Array<{value: ViewMode; label: string}>
}) {
  const t = useTheme()
  return (
    <View style={[styles.segmented, t.atoms.bg_contrast_25]}>
      {options.map(option => {
        const selected = option.value === value
        return (
          <TouchableOpacity
            accessibilityRole="button"
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && {backgroundColor: t.palette.primary_500},
            ]}>
            <Text
              style={[
                styles.segmentText,
                selected ? {color: 'white'} : t.atoms.text_contrast_medium,
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function FilterPill({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.categoryPill,
        selected
          ? {backgroundColor: t.palette.primary_500}
          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_low],
      ]}>
      <Text
        style={[
          styles.categoryPillText,
          selected ? {color: 'white'} : t.atoms.text,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function SortToggle({
  value,
  onChange,
}: {
  value: SortMode
  onChange: (value: SortMode) => void
}) {
  const t = useTheme()
  const options: Array<{value: SortMode; label: string}> = [
    {value: 'impact', label: 'Impacto'},
    {value: 'office', label: 'Cargo'},
    {value: 'name', label: 'A-Z'},
  ]
  return (
    <View style={styles.sortGroup}>
      {options.map(option => {
        const selected = value === option.value
        return (
          <TouchableOpacity
            accessibilityRole="button"
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.sortButton,
              selected
                ? {backgroundColor: t.palette.primary_500}
                : t.atoms.bg_contrast_25,
            ]}>
            {option.value === 'impact' && (
              <SortIcon
                size="xs"
                style={{color: selected ? 'white' : t.palette.contrast_500}}
              />
            )}
            <Text
              style={[
                styles.sortText,
                selected ? {color: 'white'} : t.atoms.text_contrast_medium,
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function FeaturedRepCard({
  rep,
  onPress,
  formatCount,
}: {
  rep: RepresentativeItem
  onPress: () => void
  formatCount: (n: number) => string
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.featuredCard, t.atoms.bg_contrast_25]}>
      <View style={styles.featuredTopRow}>
        <Avatar rep={rep} size={46} />
        <View style={styles.badgeStack}>
          <OfficialCivicBadge />
          <TrustBadge rep={rep} />
        </View>
      </View>
      <Text style={[styles.featuredName, t.atoms.text]} numberOfLines={2}>
        {rep.name}
      </Text>
      <Text
        style={[styles.featuredOffice, t.atoms.text_contrast_medium]}
        numberOfLines={1}>
        {rep.category}
      </Text>
      <Text
        style={[styles.featuredMandate, t.atoms.text_contrast_medium]}
        numberOfLines={3}>
        {rep.description || `${rep.affiliate} · ${rep.state}`}
      </Text>
      <View style={styles.featuredFooter}>
        <Text style={[styles.reachText, {color: t.palette.primary_500}]}>
          {formatCount(rep.followersCount ?? 0)} <Trans>alcance</Trans>
        </Text>
        <Text style={[styles.openText, t.atoms.text]}>
          <Trans>Ver perfil</Trans>
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function RepCard({
  rep,
  onPress,
  formatCount,
}: {
  rep: RepresentativeItem
  onPress: () => void
  formatCount: (n: number) => string
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.repCard,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[styles.repAccent, {backgroundColor: rep.avatarColor}]} />
      <Avatar rep={rep} size={52} />
      <View style={styles.repInfo}>
        <View style={styles.repTitleRow}>
          <Text style={[styles.repName, t.atoms.text]} numberOfLines={1}>
            {rep.name}
          </Text>
          <OfficialCivicBadge compact />
          <TrustBadge rep={rep} compact />
        </View>
        <Text style={[styles.repHandle, t.atoms.text_contrast_medium]}>
          {rep.handle} · {rep.category}
        </Text>
        <Text style={[styles.repScope, t.atoms.text_contrast_medium]}>
          {rep.affiliate} · {rep.state}
        </Text>
        {rep.description ? (
          <Text
            style={[styles.repMandate, t.atoms.text_contrast_medium]}
            numberOfLines={2}>
            {rep.description}
          </Text>
        ) : null}
        <View style={styles.signalRow}>
          <SignalPill
            label={`${formatCount(rep.followersCount ?? 0)} alcance`}
            icon="reach"
          />
          <SignalPill label="cuenta oficial" icon={rep.type} />
        </View>
      </View>
      <View style={styles.viewButton}>
        <Text style={{color: t.palette.primary_500, fontWeight: '800'}}>
          <Trans>Ver perfil</Trans>
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function Avatar({rep, size}: {rep: RepresentativeItem; size: number}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.max(8, size * 0.22),
          backgroundColor: rep.avatarColor,
        },
      ]}>
      <Text style={styles.avatarInitial}>
        {rep.name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}

function OfficialCivicBadge({compact = false}: {compact?: boolean}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.officialBadge,
        compact && styles.officialBadgeCompact,
        {backgroundColor: t.palette.primary_500 + '14'},
      ]}>
      <CommunityIcon size="xs" style={{color: t.palette.primary_500}} />
      {!compact && (
        <Text
          style={[styles.officialBadgeText, {color: t.palette.primary_500}]}>
          <Trans>Cuenta oficial</Trans>
        </Text>
      )}
    </View>
  )
}

function TrustBadge({
  rep,
  compact = false,
}: {
  rep: RepresentativeItem
  compact?: boolean
}) {
  const t = useTheme()
  const isVerified = rep.status === 'verified'
  return (
    <View
      style={[
        styles.trustBadge,
        compact && styles.trustBadgeCompact,
        {
          backgroundColor: isVerified
            ? t.palette.positive_500 + '18'
            : rep.status === 'retired'
              ? t.palette.contrast_100
              : t.palette.primary_500 + '14',
        },
      ]}>
      {isVerified ? (
        <VerifiedIcon size="xs" style={{color: t.palette.positive_500}} />
      ) : (
        <CommunityIcon
          size="xs"
          style={{
            color:
              rep.status === 'retired'
                ? t.palette.contrast_500
                : t.palette.primary_500,
          }}
        />
      )}
      {!compact && (
        <Text
          style={[
            styles.trustText,
            {
              color: isVerified
                ? t.palette.positive_500
                : rep.status === 'retired'
                  ? t.palette.contrast_500
                  : t.palette.primary_500,
            },
          ]}>
          {isVerified ? (
            <Trans>Verificado</Trans>
          ) : rep.status === 'retired' ? (
            <Trans>Retirado</Trans>
          ) : (
            <Trans>Reservado</Trans>
          )}
        </Text>
      )}
    </View>
  )
}

function SignalPill({
  label,
  icon,
}: {
  label: string
  icon: 'reach' | RepresentativeItem['type']
}) {
  const t = useTheme()
  const Icon = icon === 'reach' ? PersonIcon : CommunityIcon
  return (
    <View style={[styles.signalPill, {backgroundColor: t.palette.contrast_50}]}>
      <Icon size="xs" style={{color: t.palette.contrast_500}} />
      <Text style={[styles.signalText, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  searchPanel: {
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    borderRadius: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryList: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '800',
  },
  featuredList: {
    gap: 10,
    paddingRight: 16,
  },
  featuredCard: {
    width: 238,
    borderRadius: 8,
    padding: 14,
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeStack: {
    alignItems: 'flex-end',
    gap: 6,
  },
  featuredName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  featuredOffice: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  featuredMandate: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    minHeight: 54,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  reachText: {
    fontSize: 12,
    fontWeight: '900',
  },
  openText: {
    fontSize: 12,
    fontWeight: '900',
  },
  repCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  repAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    color: 'white',
    fontWeight: '900',
    fontSize: 18,
  },
  repInfo: {
    flex: 1,
    gap: 3,
  },
  repTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  repHandle: {
    fontSize: 12,
    fontWeight: '700',
  },
  repScope: {
    fontSize: 12,
  },
  repMandate: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '800',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  trustBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '900',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  officialBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  officialBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  viewButton: {
    paddingLeft: 10,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
})
