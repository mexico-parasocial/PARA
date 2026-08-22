import {useState} from 'react'
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
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {EmptyStateError, EmptyStateNoData} from '#/components/EmptyStates'
import {SearchInput} from '#/components/forms/SearchInput'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

const ALL_OFFICES = 'All'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Representatives'>

export function RepresentativesScreen({route}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()

  const [searchQuery, setSearchQuery] = useState(route.params?.q || '')
  const [office, setOffice] = useState(route.params?.category || ALL_OFFICES)

  const {
    data,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useRepresentativesQuery({
    category: 'All',
    query: searchQuery,
  })

  const allReps = data?.pages.flatMap(page => page.items) || []

  /*
   * Offices come from the data rather than a fixed list, so a chip is never
   * offered when it would render an empty directory. Most-common first.
   */
  const officeCounts = new Map<string, number>()
  for (const rep of allReps) {
    officeCounts.set(rep.category, (officeCounts.get(rep.category) ?? 0) + 1)
  }
  const offices = [
    ALL_OFFICES,
    ...[...officeCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([category]) => category),
  ]

  const reps = allReps
    .filter(rep => office === ALL_OFFICES || rep.category === office)
    .sort((a, b) => representativeScore(b) - representativeScore(a))

  const onPressRep = (rep: RepresentativeItem) => {
    navigation.navigate('Profile', {name: rep.handle})
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
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClearText={() => setSearchQuery('')}
            placeholder={_(msg`Search names, handles, offices...`)}
            style={styles.searchInput}
          />

          {offices.length > 2 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.officeRow}>
              {offices.map(item => (
                <OfficeChip
                  key={item}
                  label={item}
                  selected={item === office}
                  onPress={() => setOffice(item)}
                />
              ))}
            </ScrollView>
          )}

          {isLoading && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={t.palette.primary_500} />
            </View>
          )}

          {error && (
            <EmptyStateError
              message={_(msg`Couldn't load representatives. Tap to retry.`)}
              onRetry={() => {
                void refetch()
              }}
            />
          )}

          {!isLoading &&
            !error &&
            (reps.length > 0 ? (
              <>
                <Text
                  style={[styles.resultCount, t.atoms.text_contrast_medium]}>
                  {reps.length} <Trans>resultados</Trans>
                </Text>
                {reps.map(rep => (
                  <RepCard
                    key={rep.id}
                    rep={rep}
                    onPress={() => onPressRep(rep)}
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
              </>
            ) : (
              <EmptyStateNoData
                icon="🏛️"
                title={_(msg`No representatives found`)}
                message={_(msg`Try a different search term.`)}
              />
            ))}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

/**
 * Ranks the directory so the most consequential accounts surface first. The
 * ordering is fixed - reach and mandate are the only signals that matter for
 * a list the reader scans top-down.
 */
function representativeScore(rep: RepresentativeItem) {
  const reach = Math.log10((rep.followersCount ?? 0) + 1) * 10
  const hasMandate = rep.description ? 16 : 0
  const typeWeight = rep.type === 'Party' ? 14 : 10
  const activity =
    Math.log10((rep.postsCount ?? 0) + 1) * 3 +
    Math.log10((rep.followingCount ?? 0) + 1)
  return reach + hasMandate + typeWeight + activity
}

function OfficeChip({
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
      accessibilityState={{selected}}
      onPress={onPress}
      style={[
        styles.officeChip,
        selected
          ? {backgroundColor: t.palette.primary_500}
          : t.atoms.bg_contrast_25,
      ]}>
      <Text
        style={[
          styles.officeChipText,
          selected ? {color: t.palette.white} : t.atoms.text_contrast_medium,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function RepCard({
  rep,
  onPress,
}: {
  rep: RepresentativeItem
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.repCard, t.atoms.border_contrast_low]}>
      <View style={[styles.avatar, {backgroundColor: rep.avatarColor}]}>
        <Text style={styles.avatarInitial}>
          {rep.name.trim().charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.repInfo}>
        <View style={styles.repTitleRow}>
          <Text style={[styles.repName, t.atoms.text]} numberOfLines={1}>
            {rep.name}
          </Text>
          {rep.status === 'verified' && (
            <VerifiedIcon size="xs" style={{color: t.palette.positive_500}} />
          )}
        </View>
        <Text
          style={[styles.repMeta, t.atoms.text_contrast_medium]}
          numberOfLines={1}>
          {rep.category} · {rep.affiliate}
        </Text>
        {rep.description ? (
          <Text
            style={[styles.repMandate, t.atoms.text_contrast_medium]}
            numberOfLines={2}>
            {rep.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
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
  searchInput: {
    borderRadius: 8,
  },
  officeRow: {
    gap: 8,
    paddingTop: 12,
    paddingRight: 16,
  },
  officeChip: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  officeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
  },
  repCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 11,
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
    gap: 6,
  },
  repName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  repMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  repMandate: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
})
