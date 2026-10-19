import {useMemo, useRef, useState} from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {type CabildeoPhase} from '#/lib/api/para-lexicons'
import {filterCabildeos, toCabildeoRouteParams} from '#/lib/cabildeo-client'
import {getCabildeoTotalParticipants} from '#/lib/cabildeo-display'
import {type NavigationProp} from '#/lib/routes/types'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {useTheme} from '#/alf'
import {SearchInput} from '#/components/forms/SearchInput'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {Text} from '#/components/Typography'
import {WebScrollControls} from '#/components/WebScrollControls'
import {LobbyingCard} from './LobbyingCard'

const FEATURED_COUNT = 5

export function CabildeoListScreen() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<{
    key: string
    name: 'CabildeoList'
    params?: {communityId?: string; communityName?: string}
  }>()
  const contextCommunity = route.params?.communityName
  const [activeFilter, setActiveFilter] = useState<CabildeoPhase | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCommunity, setSelectedCommunity] = useState('All')
  const communityScrollRef = useRef<React.ComponentRef<
    typeof ScrollView
  > | null>(null)
  const {
    data: cabildeos = [],
    isFetched,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useCabildeosQuery()

  // The context community scopes everything, filters' counts included.
  const scoped = useMemo(
    () => filterCabildeos(cabildeos, {communityName: contextCommunity}),
    [cabildeos, contextCommunity],
  )

  const phaseCounts = useMemo(() => {
    const counts: Record<CabildeoPhase | 'all', number> = {
      all: scoped.length,
      draft: 0,
      open: 0,
      deliberating: 0,
      voting: 0,
      resolved: 0,
    }
    for (const cabildeo of scoped) counts[cabildeo.phase] += 1
    return counts
  }, [scoped])

  const communities = useMemo(
    () => [...new Set(scoped.map(c => c.community).filter(Boolean))].sort(),
    [scoped],
  )

  const filtered = useMemo(() => {
    const phased = filterCabildeos(scoped, {phase: activeFilter})
    const q = searchQuery.trim().toLowerCase()
    return phased.filter(cabildeo => {
      if (
        selectedCommunity !== 'All' &&
        cabildeo.community !== selectedCommunity
      )
        return false
      if (!q) return true
      return [cabildeo.title, cabildeo.description, cabildeo.community]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [activeFilter, scoped, searchQuery, selectedCommunity])

  // A shelf only helps when there is enough to choose from.
  const isBrowsing = !searchQuery.trim() && selectedCommunity === 'All'
  const featured = useMemo(() => {
    if (!isBrowsing || filtered.length <= FEATURED_COUNT) return []
    return [...filtered]
      .filter(c => c.phase !== 'draft')
      .sort(
        (a, b) =>
          getCabildeoTotalParticipants(b) - getCabildeoTotalParticipants(a),
      )
      .slice(0, FEATURED_COUNT)
  }, [filtered, isBrowsing])
  const featuredUris = new Set(featured.map(c => c.uri))
  const rest = filtered.filter(c => !featuredUris.has(c.uri))

  const filters: Array<{key: CabildeoPhase | 'all'; label: string}> = [
    {key: 'all', label: 'Todos'},
    {key: 'voting', label: '🗳️ Votación'},
    {key: 'deliberating', label: '🗣️ Deliberando'},
    {key: 'resolved', label: '✅ Resueltos'},
  ]

  const open = (uri: string) =>
    navigation.navigate('CabildeoDetail', toCabildeoRouteParams({uri}))

  return (
    <Layout.Screen testID="cabildeoListScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Lobbying</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {contextCommunity
              ? `Deliberación cívica en ${contextCommunity}`
              : 'Deliberación Cívica'}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      {/* Resolution-state filters stay pinned above the content. */}
      <Layout.Center>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterRow}>
          {filters.map(f => {
            const selected = activeFilter === f.key
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{selected}}
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterPill,
                  selected
                    ? {backgroundColor: t.palette.primary_500}
                    : t.atoms.bg_contrast_25,
                ]}>
                <Text
                  style={[
                    styles.filterText,
                    selected
                      ? {color: '#FFFFFF'}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {f.label} · {phaseCounts[f.key]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </Layout.Center>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={async () => {
              await refetch()
            }}
            tintColor={t.palette.primary_500}
          />
        }>
        <Layout.Center style={styles.center}>
          {contextCommunity ? (
            <View
              style={[
                styles.contextCard,
                t.atoms.bg_contrast_25,
                {borderColor: t.palette.primary_200},
              ]}>
              <Text
                style={[styles.contextEyebrow, {color: t.palette.primary_500}]}>
                Comunidad activa
              </Text>
              <Text style={[styles.contextTitle, t.atoms.text]}>
                {contextCommunity}
              </Text>
              <Text
                style={[styles.contextSubtitle, t.atoms.text_contrast_medium]}>
                Esta vista solo muestra cabildeos relacionados con esta
                comunidad o partido.
              </Text>
            </View>
          ) : null}

          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClearText={() => setSearchQuery('')}
            placeholder="Buscar cabildeos"
          />

          {communities.length > 1 ? (
            <View style={styles.communityWrap}>
              <WebScrollControls
                scrollViewRef={communityScrollRef}
                iconSize={16}
              />
              <ScrollView
                ref={communityScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.communityRow}>
                {['All', ...communities].map(name => {
                  const selected = selectedCommunity === name
                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{selected}}
                      key={name}
                      onPress={() => setSelectedCommunity(name)}
                      style={[
                        styles.communityPill,
                        selected
                          ? {backgroundColor: t.palette.primary_500}
                          : [
                              t.atoms.bg_contrast_25,
                              t.atoms.border_contrast_low,
                              {borderWidth: 1},
                            ],
                      ]}>
                      <Text
                        style={[
                          styles.communityText,
                          selected ? {color: '#FFFFFF'} : t.atoms.text,
                        ]}>
                        {name === 'All' ? 'Todas las comunidades' : name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          ) : null}

          {featured.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                Destacados
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.shelf}
                contentContainerStyle={styles.shelfContent}>
                {featured.map(cabildeo => (
                  <LobbyingCard
                    key={cabildeo.uri}
                    cabildeo={cabildeo}
                    onPress={() => open(cabildeo.uri)}
                    featured
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.cardList}>
            {featured.length > 0 && rest.length > 0 ? (
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                Todos los cabildeos
              </Text>
            ) : null}
            {!filtered.length ? (
              <ListMaybePlaceholder
                isLoading={isLoading || !isFetched}
                isError={isError}
                onRetry={refetch}
                emptyType="results"
                emptyMessage="No hay cabildeos disponibles para este filtro todavía."
              />
            ) : (
              rest.map(cabildeo => (
                <LobbyingCard
                  key={cabildeo.uri}
                  cabildeo={cabildeo}
                  onPress={() => open(cabildeo.uri)}
                />
              ))
            )}
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 100},
  center: {paddingHorizontal: 16, paddingTop: 4, gap: 12},
  filterBar: {flexGrow: 0},
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {fontSize: 13, fontWeight: '700'},
  contextCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  contextEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contextTitle: {fontSize: 20, fontWeight: '800', marginBottom: 4},
  contextSubtitle: {fontSize: 13, lineHeight: 18},
  communityWrap: {position: 'relative'},
  communityRow: {flexDirection: 'row', gap: 8},
  communityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  communityText: {fontSize: 13, fontWeight: '600'},
  section: {gap: 10},
  sectionTitle: {fontSize: 19, fontWeight: '900'},
  shelf: {marginHorizontal: -16, overflow: 'visible'},
  shelfContent: {gap: 12, paddingHorizontal: 16},
  cardList: {gap: 12},
})
