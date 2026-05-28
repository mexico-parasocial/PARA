import {useMemo, useState} from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {OFFICIAL_CIVIC_SCOPES} from '#/lib/official-civic-accounts'
import {type RepresentativeNomination} from '#/lib/representatives/participation'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {
  type RepresentativeItem,
  useRepresentativesQuery,
} from '#/state/queries/data-tab'
import {useOfficialCivicAccountQuery} from '#/state/queries/official-civic-accounts'
import {
  useCreateRepresentativeNominationMutation,
  useRepresentativeParticipationIndexQuery,
} from '#/state/queries/representative-participation'
import {useSession} from '#/state/session'
import {useBaseFilter} from '#/state/shell/base-filter'
import {useTheme} from '#/alf'
import {ActiveFiltersStackButton} from '#/components/BaseFilterControls'
import {Button, ButtonText} from '#/components/Button'
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
  const {currentAccount} = useSession()

  const [selectedCategory, setSelectedCategory] = useState(
    route.params?.category || 'All',
  )
  const [searchQuery, setSearchQuery] = useState(route.params?.q || '')
  const [sortMode, setSortMode] = useState<SortMode>('impact')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedRep, setSelectedRep] = useState<RepresentativeItem | null>(
    null,
  )
  const [nominationMode, setNominationMode] = useState<'public' | 'private'>(
    'public',
  )
  const [nominationReason, setNominationReason] = useState('')
  const {activeFilters} = useBaseFilter()
  const {data: participationIndex} = useRepresentativeParticipationIndexQuery()
  const createNomination = useCreateRepresentativeNominationMutation()

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
  const officialCount = filteredReps.filter(rep => rep.type === 'Party').length
  const communityCount = filteredReps.filter(
    rep => rep.type === 'Community',
  ).length
  const totalReach = filteredReps.reduce(
    (sum, rep) => sum + (rep.followersCount ?? 0),
    0,
  )
  const coveredStates = new Set(filteredReps.map(rep => rep.state)).size

  const onPressRep = (rep: RepresentativeItem) => {
    setSelectedRep(rep)
  }

  const submitNomination = () => {
    if (!selectedRep || !currentAccount?.did || !nominationReason.trim()) return
    createNomination.mutate(
      {
        representativeId: selectedRep.id,
        mode: nominationMode,
        nominatorDid: currentAccount.did,
        nomineeHandle: selectedRep.handle,
        communityUri: selectedRep.areaScope?.communityUri,
        reason: nominationReason.trim(),
      },
      {
        onSuccess: () => setNominationReason(''),
      },
    )
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
          <Layout.Header.SubtitleText>
            <Trans>Mandatos, alcance y confianza</Trans>
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <ActiveFiltersStackButton />
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}>
          <View
            style={[
              styles.overview,
              {
                backgroundColor: t.palette.primary_500,
              },
            ]}>
            <Text style={styles.overviewEyebrow}>
              <Trans>Mapa de representación</Trans>
            </Text>
            <Text style={styles.overviewTitle}>
              <Trans>Quién puede hablar por quién, y con qué mandato.</Trans>
            </Text>
            <Text style={styles.overviewBody}>
              <Trans>
                Encuentra representantes oficiales, roles comunitarios y voces
                delegables antes de ceder voto o revisar una decisión pública.
              </Trans>
            </Text>
            <View style={styles.overviewStats}>
              <Metric label={_(msg`Alcance`)} value={formatCount(totalReach)} />
              <Metric label={_(msg`Oficiales`)} value={`${officialCount}`} />
              <Metric label={_(msg`Comunidad`)} value={`${communityCount}`} />
              <Metric label={_(msg`Estados`)} value={`${coveredStates}`} />
            </View>
          </View>

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

          {selectedRep && (
            <RepresentativeNominationPanel
              representative={selectedRep}
              mode={nominationMode}
              setMode={setNominationMode}
              reason={nominationReason}
              setReason={setNominationReason}
              onClose={() => setSelectedRep(null)}
              onSubmit={submitNomination}
              isSubmitting={createNomination.isPending}
              canSubmit={Boolean(currentAccount?.did)}
              viewerDid={currentAccount?.did}
              onOpenProfile={() =>
                navigation.navigate('Profile', {name: selectedRep.handle})
              }
              nominations={
                participationIndex?.nominationsByRepresentative[
                  selectedRep.id
                ] ?? []
              }
            />
          )}

          {!isLoading && !error && featuredReps.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, t.atoms.text]}>
                    <Trans>Representantes clave</Trans>
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>Ordenados por señal de mandato y alcance.</Trans>
                  </Text>
                </View>
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
                    nominations={
                      participationIndex?.nominationsByRepresentative[rep.id]
                        ?.length ?? 0
                    }
                    pajareoCount={
                      participationIndex?.pajareoByRepresentative[rep.id]
                        ?.length ?? 0
                    }
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
                <Text style={[styles.resultCount, t.atoms.text_contrast_medium]}>
                  {filteredReps.length} <Trans>resultados</Trans>
                </Text>
              </View>
              {filteredReps.map(rep => (
                <RepCard
                  key={rep.id}
                  rep={rep}
                  onPress={() => onPressRep(rep)}
                  formatCount={formatCount}
                  nominations={
                    participationIndex?.nominationsByRepresentative[rep.id]
                      ?.length ?? 0
                  }
                  pajareoCount={
                    participationIndex?.pajareoByRepresentative[rep.id]
                      ?.length ?? 0
                  }
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

function Metric({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
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

function RepresentativeNominationPanel({
  representative,
  mode,
  setMode,
  reason,
  setReason,
  onClose,
  onSubmit,
  isSubmitting,
  canSubmit,
  viewerDid,
  onOpenProfile,
  nominations,
}: {
  representative: RepresentativeItem
  mode: 'public' | 'private'
  setMode: (mode: 'public' | 'private') => void
  reason: string
  setReason: (reason: string) => void
  onClose: () => void
  onSubmit: () => void
  isSubmitting: boolean
  canSubmit: boolean
  viewerDid?: string
  onOpenProfile: () => void
  nominations: RepresentativeNomination[]
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {data: officialAccount} = useOfficialCivicAccountQuery(
    representative,
    viewerDid,
  )
  const activeControllers =
    officialAccount?.controllers.filter(item => item.status === 'active') ?? []
  const viewerController = officialAccount?.viewerController
  const isVerifiedOfficial = officialAccount?.account.status === 'verified'
  const isRetired = officialAccount?.account.status === 'retired'
  const panelMode = isVerifiedOfficial
    ? 'verified'
    : isRetired
      ? 'retired'
      : 'unclaimed'
  return (
    <View
      style={[
        styles.nominationPanel,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleWrap}>
          <Text style={[styles.panelEyebrow, {color: t.palette.primary_500}]}>
            {panelMode === 'verified' ? (
              <Trans>Cuenta cívica oficial</Trans>
            ) : panelMode === 'retired' ? (
              <Trans>Perfil histórico</Trans>
            ) : (
              <Trans>Perfil reservado</Trans>
            )}
          </Text>
          <Text style={[styles.panelTitle, t.atoms.text]}>
            {representative.name}
          </Text>
          <Text style={[styles.panelSub, t.atoms.text_contrast_medium]}>
            {representative.office || representative.category} ·{' '}
            {representative.jurisdiction || representative.state}
          </Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={onClose}>
          <Text style={{color: t.palette.primary_500, fontWeight: '800'}}>
            <Trans>Cerrar</Trans>
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.panelBody, t.atoms.text_contrast_medium]}>
        {panelMode === 'verified' ? (
          <Trans>
            Esta cuenta representa a la entidad oficial. Las acciones públicas
            salen a nombre de la entidad; el controlador humano queda privado y
            auditable.
          </Trans>
        ) : panelMode === 'retired' ? (
          <Trans>
            Este perfil queda como archivo histórico. No puede publicar,
            responder Pajareo ni firmar cabildeos.
          </Trans>
        ) : (
          <Trans>
            Este perfil está reservado y visible, pero todavía no puede actuar.
            Puedes iniciar una nominación pública o privada para activarlo.
          </Trans>
        )}
      </Text>

      <View style={styles.officialFacts}>
        <View style={[styles.officialFact, t.atoms.bg_contrast_50]}>
          <Text style={[styles.officialFactLabel, t.atoms.text_contrast_medium]}>
            <Trans>Estado</Trans>
          </Text>
          <Text style={[styles.officialFactValue, t.atoms.text]}>
            {panelMode === 'verified'
              ? 'verified'
              : panelMode === 'retired'
                ? 'retired'
                : 'unclaimed'}
          </Text>
        </View>
        <View style={[styles.officialFact, t.atoms.bg_contrast_50]}>
          <Text style={[styles.officialFactLabel, t.atoms.text_contrast_medium]}>
            <Trans>Controladores</Trans>
          </Text>
          <Text style={[styles.officialFactValue, t.atoms.text]}>
            {activeControllers.length}
          </Text>
        </View>
      </View>

      {isVerifiedOfficial && (
        <View style={styles.officialScopeWrap}>
          <Text style={[styles.panelHint, t.atoms.text_contrast_medium]}>
            {viewerController ? (
              <Trans>Tu cockpit oficial activo</Trans>
            ) : (
              <Trans>Scopes disponibles para controladores aprobados</Trans>
            )}
          </Text>
          <View style={styles.signalRow}>
            {(
              viewerController?.scopes ??
              OFFICIAL_CIVIC_SCOPES.map(scope => scope.value)
            ).map(scope => (
              <SignalPill
                key={scope}
                label={scope.replace('official.', '')}
                icon="Community"
              />
            ))}
          </View>
          <Button
            label={_(msg`Open representative profile`)}
            variant="outline"
            color="secondary"
            size="small"
            onPress={onOpenProfile}>
            <ButtonText>
              <Trans>Abrir perfil</Trans>
            </ButtonText>
          </Button>
        </View>
      )}

      {!isVerifiedOfficial && !isRetired && (
        <>
          <View style={styles.nominationModeRow}>
            {(['public', 'private'] as const).map(option => {
              const selected = mode === option
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={option}
                  onPress={() => setMode(option)}
                  style={[
                    styles.nominationMode,
                    selected
                      ? {backgroundColor: t.palette.primary_500}
                      : t.atoms.bg_contrast_50,
                  ]}>
                  <Text
                    style={[
                      styles.nominationModeText,
                      selected ? {color: 'white'} : t.atoms.text,
                    ]}>
                    {option === 'public' ? (
                      <Trans>Pública</Trans>
                    ) : (
                      <Trans>Privada</Trans>
                    )}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TextInput
            accessibilityLabel={_(msg`Nomination reason input`)}
            accessibilityHint={_(
              msg`Write why this representative profile should be activated.`,
            )}
            value={reason}
            onChangeText={setReason}
            placeholder={_(
              msg`Explica brevemente por qué debe activarse este perfil...`,
            )}
            placeholderTextColor={t.palette.contrast_400}
            multiline
            style={[
              styles.nominationInput,
              t.atoms.text,
              {
                borderColor: t.palette.contrast_200,
                backgroundColor: t.palette.contrast_0,
              },
            ]}
          />

          {!canSubmit && (
            <Text style={[styles.panelHint, t.atoms.text_contrast_medium]}>
              <Trans>Inicia sesión para crear nominaciones.</Trans>
            </Text>
          )}

          <Button
            label={_(msg`Create nomination`)}
            variant="solid"
            color="primary"
            size="small"
            disabled={!canSubmit || !reason.trim() || isSubmitting}
            onPress={onSubmit}>
            <ButtonText>
              {isSubmitting ? (
                <Trans>Enviando...</Trans>
              ) : mode === 'public' ? (
                <Trans>Reclamar perfil oficial</Trans>
              ) : (
                <Trans>Nominar en privado</Trans>
              )}
            </ButtonText>
          </Button>
        </>
      )}

      {nominations.length > 0 && (
        <View style={styles.nominationList}>
          {nominations.slice(0, 2).map(nomination => (
            <View
              key={nomination.id}
              style={[styles.nominationItem, t.atoms.bg_contrast_50]}>
              <Text style={[styles.nominationReason, t.atoms.text]}>
                {nomination.reason}
              </Text>
              <Text style={[styles.panelHint, t.atoms.text_contrast_medium]}>
                {nomination.supportCount} <Trans>apoyos</Trans> ·{' '}
                {nomination.status}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function FeaturedRepCard({
  rep,
  onPress,
  formatCount,
  nominations,
  pajareoCount,
}: {
  rep: RepresentativeItem
  onPress: () => void
  formatCount: (n: number) => string
  nominations: number
  pajareoCount: number
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
        <Text style={[styles.openText, t.atoms.text_contrast_medium]}>
          {nominations + pajareoCount} <Trans>señales</Trans>
        </Text>
        <Text style={[styles.openText, t.atoms.text]}>
          {rep.status === 'verified' ? (
            <Trans>Ver</Trans>
          ) : (
            <Trans>Nominar</Trans>
          )}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function RepCard({
  rep,
  onPress,
  formatCount,
  nominations,
  pajareoCount,
}: {
  rep: RepresentativeItem
  onPress: () => void
  formatCount: (n: number) => string
  nominations: number
  pajareoCount: number
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
          <SignalPill
            label="cuenta oficial"
            icon={rep.type}
          />
          <SignalPill label={`${nominations} nominaciones`} icon="reach" />
          <SignalPill label={`${pajareoCount} pajareos`} icon="Community" />
        </View>
      </View>
      <View style={styles.viewButton}>
        <Text style={{color: t.palette.primary_500, fontWeight: '800'}}>
          {rep.status === 'verified' ? (
            <Trans>Gestionar</Trans>
          ) : (
            <Trans>Nominar</Trans>
          )}
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
        <Text style={[styles.officialBadgeText, {color: t.palette.primary_500}]}>
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
          backgroundColor:
            isVerified
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
              color:
                isVerified
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
  overview: {
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
  },
  overviewEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  overviewTitle: {
    color: 'white',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  overviewBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  overviewStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  metric: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricValue: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
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
    gap: 12,
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
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
  nominationPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelTitleWrap: {
    flex: 1,
  },
  panelEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  panelSub: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  panelBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  nominationModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  nominationMode: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 9,
  },
  nominationModeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  nominationInput: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 78,
    padding: 12,
    fontSize: 14,
    marginTop: 10,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  panelHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  officialFacts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  officialFact: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
  },
  officialFactLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  officialFactValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  officialScopeWrap: {
    gap: 10,
    marginTop: 12,
  },
  nominationList: {
    gap: 8,
    marginTop: 12,
  },
  nominationItem: {
    borderRadius: 8,
    padding: 10,
  },
  nominationReason: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
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
