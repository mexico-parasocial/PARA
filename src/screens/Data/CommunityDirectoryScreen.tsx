import {useMemo, useState} from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  ACTIVITY_STATUSES,
  formatMinor,
  getActivityKindMeta,
} from '#/lib/community-activities'
import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {type NavigationProp} from '#/lib/routes/types'
import {type CommunityActivityView} from '#/state/queries/community-activities'
import {useCommunityActivityExplorerQuery} from '#/state/queries/community-activity-explorer'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

type CategoryFilter = 'all' | 'social' | 'economic'
type ExplorerEntry = {
  board: CommunityBoardView
  activity: CommunityActivityView
}

function isUpcoming(activity: CommunityActivityView, now: number) {
  if (
    activity.record.status === 'cancelled' ||
    activity.record.status === 'completed'
  ) {
    return false
  }
  if (activity.record.status === 'active') return true
  const end = Date.parse(activity.record.endsAt ?? activity.record.startsAt)
  return Number.isFinite(end) && end >= now
}

function CategoryChip({
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={label}
      accessibilityState={{selected}}
      onPress={onPress}
      style={[
        styles.categoryChip,
        {
          backgroundColor: selected
            ? t.palette.primary_500
            : t.palette.contrast_100,
        },
      ]}>
      <Text
        style={[
          styles.categoryChipText,
          {color: selected ? '#fff' : t.atoms.text.color},
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}

function CommunityChip({
  board,
  selected,
  onPress,
}: {
  board?: CommunityBoardView
  selected: boolean
  onPress: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const label = board?.name ?? _(msg`All communities`)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={_(msg`Filters activities by community`)}
      accessibilityState={{selected}}
      onPress={onPress}
      style={[
        styles.communityChip,
        {
          borderColor: selected
            ? t.palette.primary_500
            : t.atoms.border_contrast_low.borderColor,
          backgroundColor: selected
            ? t.palette.primary_100
            : t.atoms.bg.backgroundColor,
        },
      ]}>
      <Text
        style={[styles.communityChipText, t.atoms.text]}
        numberOfLines={1}
        emoji>
        {label}
      </Text>
    </Pressable>
  )
}

function ActivityCard({
  entry,
  featured,
  onPress,
}: {
  entry: ExplorerEntry
  featured: boolean
  onPress: () => void
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const {activity, board} = entry
  const {record} = activity
  const financial = activity.category === 'economic'
  const plan =
    activity.category === 'economic' ? activity.record.financialPlan : undefined
  const accent = financial ? t.palette.positive_600 : t.palette.primary_600
  const kind = getActivityKindMeta(record.details?.$type)
  const status = ACTIVITY_STATUSES.find(item => item.value === record.status)
  const startsAt = new Date(record.startsAt)
  const dateLabel = Number.isNaN(startsAt.getTime())
    ? _(msg`Date pending`)
    : i18n.date(startsAt, {dateStyle: 'medium', timeStyle: 'short'})
  const goal = plan?.fundingGoalMinor

  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={record.title}
      accessibilityHint={
        financial
          ? _(msg`Opens the activity and its public ledger`)
          : _(msg`Opens the activity details`)
      }
      onPress={onPress}
      targetScale={0.985}
      style={[
        styles.activityCard,
        featured && styles.featuredCard,
        {
          backgroundColor: featured
            ? financial
              ? t.palette.positive_100
              : t.palette.primary_100
            : t.atoms.bg.backgroundColor,
          borderColor: featured
            ? accent + '45'
            : t.atoms.border_contrast_low.borderColor,
        },
      ]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.kindIcon, {backgroundColor: accent + '20'}]}>
          <Text style={styles.kindEmoji}>{kind.emoji}</Text>
        </View>
        <View style={a.flex_1}>
          <Text
            style={[styles.communityName, {color: accent}]}
            numberOfLines={1}
            emoji>
            {board.name}
          </Text>
          <Text style={[styles.kindLabel, t.atoms.text_contrast_medium]}>
            {i18n._(kind.label)}
          </Text>
        </View>
        <Text style={[styles.cardArrow, {color: accent}]}>↗</Text>
      </View>
      <Text
        style={[
          featured ? styles.featuredTitle : styles.cardTitle,
          t.atoms.text,
        ]}
        numberOfLines={2}
        emoji>
        {record.title}
      </Text>
      {record.description ? (
        <Text
          style={[styles.description, t.atoms.text_contrast_medium]}
          numberOfLines={featured ? 3 : 2}
          emoji>
          {record.description}
        </Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={[styles.metaText, t.atoms.text_contrast_medium]}>
          {dateLabel}
        </Text>
        {status ? (
          <Text
            style={[
              styles.statusPill,
              {color: accent, backgroundColor: accent + '18'},
            ]}>
            {i18n._(status.label)}
          </Text>
        ) : null}
      </View>
      {record.location ? (
        <Text
          style={[styles.metaText, t.atoms.text_contrast_medium]}
          numberOfLines={1}
          emoji>
          📍 {record.location}
        </Text>
      ) : null}
      {financial ? (
        <View style={[styles.ledgerRow, {borderTopColor: accent + '30'}]}>
          <Text style={[styles.ledgerLabel, {color: accent}]}>
            <Trans>Public financial ledger</Trans>
          </Text>
          {plan && typeof goal === 'number' && goal > 0 ? (
            <Text style={[styles.metaText, t.atoms.text_contrast_medium]}>
              <Trans>Goal {formatMinor(goal, plan.currency)}</Trans>
            </Text>
          ) : null}
        </View>
      ) : null}
    </PressableScale>
  )
}

export function CommunityDirectoryScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const query = useCommunityActivityExplorerQuery()
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [communityUri, setCommunityUri] = useState<string | null>(null)
  const pages = query.data?.pages ?? []
  const boards = useMemo(() => {
    const unique = new Map<string, CommunityBoardView>()
    for (const page of pages) {
      for (const board of page.boards) unique.set(board.uri, board)
    }
    return [...unique.values()]
  }, [pages])
  const allEntries = useMemo(() => {
    const unique = new Map<string, ExplorerEntry>()
    for (const page of pages) {
      for (const entry of page.entries) unique.set(entry.activity.uri, entry)
    }
    return [...unique.values()]
  }, [pages])
  const visibleEntries = useMemo(
    () =>
      allEntries.filter(
        entry =>
          (category === 'all' || entry.activity.category === category) &&
          (!communityUri || entry.board.uri === communityUri),
      ),
    [allEntries, category, communityUri],
  )
  const {upcoming, past} = useMemo(() => {
    const now = Date.now()
    const future: ExplorerEntry[] = []
    const previous: ExplorerEntry[] = []
    for (const entry of visibleEntries) {
      ;(isUpcoming(entry.activity, now) ? future : previous).push(entry)
    }
    future.sort(
      (a, b) =>
        Date.parse(a.activity.record.startsAt) -
        Date.parse(b.activity.record.startsAt),
    )
    previous.sort(
      (a, b) =>
        Date.parse(b.activity.record.startsAt) -
        Date.parse(a.activity.record.startsAt),
    )
    return {upcoming: future, past: previous}
  }, [visibleEntries])
  const socialCount = allEntries.filter(
    entry => entry.activity.category === 'social',
  ).length
  const financialCount = allEntries.length - socialCount
  const openActivity = (uri: string) =>
    navigation.navigate('CommunityActivity', {activityUri: uri})

  return (
    <Layout.Screen>
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Community activities</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>
      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refresh()}
            />
          }>
          <View style={[styles.hero, {backgroundColor: t.palette.primary_500}]}>
            <Text style={styles.heroEyebrow}>
              <Trans>THE COMMONS</Trans>
            </Text>
            <Text style={styles.heroTitle}>
              <Trans>See what communities are doing</Trans>
            </Text>
            <Text style={styles.heroCopy}>
              <Trans>
                Explore gatherings, civic action, fundraisers, sales, and the
                public records behind them.
              </Trans>
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{boards.length}</Text>
                <Text style={styles.heroStatLabel}>
                  <Trans>communities loaded</Trans>
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{socialCount}</Text>
                <Text style={styles.heroStatLabel}>
                  <Trans>social</Trans>
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{financialCount}</Text>
                <Text style={styles.heroStatLabel}>
                  <Trans>financial</Trans>
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={_(msg`Browse communities`)}
              accessibilityHint={_(msg`Opens the community directory`)}
              onPress={() => navigation.navigate('Communities')}
              style={styles.heroLink}>
              <Text style={styles.heroLinkText}>
                <Trans>Browse communities →</Trans>
              </Text>
            </Pressable>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.sectionLabel, t.atoms.text_contrast_medium]}>
              <Trans>Explore by activity</Trans>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}>
              <CategoryChip
                label={_(msg`All activities`)}
                selected={category === 'all'}
                onPress={() => setCategory('all')}
              />
              <CategoryChip
                label={_(msg`Social`)}
                selected={category === 'social'}
                onPress={() => setCategory('social')}
              />
              <CategoryChip
                label={_(msg`Financial`)}
                selected={category === 'economic'}
                onPress={() => setCategory('economic')}
              />
            </ScrollView>
            {boards.length > 0 ? (
              <>
                <Text
                  style={[styles.sectionLabel, t.atoms.text_contrast_medium]}>
                  <Trans>Communities</Trans>
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}>
                  <CommunityChip
                    selected={!communityUri}
                    onPress={() => setCommunityUri(null)}
                  />
                  {boards.map(board => (
                    <CommunityChip
                      key={board.uri}
                      board={board}
                      selected={communityUri === board.uri}
                      onPress={() => setCommunityUri(board.uri)}
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}
          </View>

          {query.isPending ? (
            <View style={styles.loading}>
              <Loader size="lg" />
            </View>
          ) : query.isError ? (
            <View style={[styles.stateCard, t.atoms.bg_contrast_25]}>
              <Text style={[styles.stateTitle, t.atoms.text]}>
                <Trans>Activities could not load</Trans>
              </Text>
              <Text style={[styles.stateCopy, t.atoms.text_contrast_medium]}>
                <Trans>Try again to explore community records.</Trans>
              </Text>
              <Button
                label={_(msg`Retry`)}
                onPress={() => void query.refetch()}
                size="small"
                color="secondary">
                <ButtonText>
                  <Trans>Retry</Trans>
                </ButtonText>
              </Button>
            </View>
          ) : (
            <>
              {upcoming.length > 0 ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <Text style={[styles.sectionTitle, t.atoms.text]}>
                      <Trans>Happening and ahead</Trans>
                    </Text>
                    <Text
                      style={[
                        styles.sectionCount,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {upcoming.length}
                    </Text>
                  </View>
                  {upcoming.map((entry, index) => (
                    <ActivityCard
                      key={entry.activity.uri}
                      entry={entry}
                      featured={index === 0}
                      onPress={() => openActivity(entry.activity.uri)}
                    />
                  ))}
                </View>
              ) : null}
              {past.length > 0 ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <Text style={[styles.sectionTitle, t.atoms.text]}>
                      <Trans>Past activity</Trans>
                    </Text>
                    <Text
                      style={[
                        styles.sectionCount,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {past.length}
                    </Text>
                  </View>
                  {past.map(entry => (
                    <ActivityCard
                      key={entry.activity.uri}
                      entry={entry}
                      featured={false}
                      onPress={() => openActivity(entry.activity.uri)}
                    />
                  ))}
                </View>
              ) : null}
              {visibleEntries.length === 0 ? (
                <View style={[styles.stateCard, t.atoms.bg_contrast_25]}>
                  <Text style={[styles.stateTitle, t.atoms.text]}>
                    {boards.length === 0 ? (
                      <Trans>No communities available yet</Trans>
                    ) : (
                      <Trans>No activities in this view yet</Trans>
                    )}
                  </Text>
                  <Text
                    style={[styles.stateCopy, t.atoms.text_contrast_medium]}>
                    {boards.length === 0 ? (
                      <Trans>
                        Community activities will appear here as communities
                        publish them.
                      </Trans>
                    ) : (
                      <Trans>
                        Choose another filter or load more communities to keep
                        exploring.
                      </Trans>
                    )}
                  </Text>
                </View>
              ) : null}
              {query.hasNextPage ? (
                <View style={styles.loadMore}>
                  <Button
                    label={_(msg`Explore more communities`)}
                    onPress={() => void query.fetchNextPage()}
                    disabled={query.isFetchingNextPage}
                    size="small"
                    color="secondary"
                    variant="outline">
                    <ButtonText>
                      {query.isFetchingNextPage ? (
                        <Trans>Loading…</Trans>
                      ) : (
                        <Trans>Explore more communities</Trans>
                      )}
                    </ButtonText>
                  </Button>
                </View>
              ) : null}
              {query.isFetchNextPageError ? (
                <Text style={[styles.stateCopy, t.atoms.text_contrast_medium]}>
                  <Trans>More communities could not load. Try again.</Trans>
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  content: {padding: 16, paddingBottom: 64, gap: 18},
  hero: {borderRadius: 20, padding: 22, gap: 10, overflow: 'hidden'},
  heroEyebrow: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    maxWidth: 300,
  },
  heroCopy: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 360,
  },
  heroStats: {flexDirection: 'row', gap: 8, marginTop: 10},
  heroStat: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#ffffff25',
  },
  heroStatValue: {color: '#fff', fontSize: 19, fontWeight: '800'},
  heroStatLabel: {color: '#fff', fontSize: 10, fontWeight: '600', opacity: 0.9},
  heroLink: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff80',
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 6,
  },
  heroLinkText: {color: '#fff', fontSize: 12, fontWeight: '800'},
  filterSection: {gap: 10},
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipRow: {flexDirection: 'row', gap: 8, paddingRight: 16},
  categoryChip: {paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999},
  categoryChipText: {fontSize: 13, fontWeight: '700'},
  communityChip: {
    maxWidth: 190,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  communityChipText: {fontSize: 12, fontWeight: '700'},
  section: {gap: 10},
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {fontSize: 19, fontWeight: '800'},
  sectionCount: {fontSize: 13, fontWeight: '700'},
  activityCard: {borderRadius: 16, borderWidth: 1, padding: 16, gap: 11},
  featuredCard: {padding: 19},
  cardTopRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  kindIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindEmoji: {fontSize: 19},
  communityName: {fontSize: 12, fontWeight: '800'},
  kindLabel: {fontSize: 11, fontWeight: '600'},
  cardArrow: {fontSize: 20, fontWeight: '800'},
  cardTitle: {fontSize: 16, lineHeight: 21, fontWeight: '800'},
  featuredTitle: {fontSize: 20, lineHeight: 26, fontWeight: '800'},
  description: {fontSize: 13, lineHeight: 19},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaText: {fontSize: 11, fontWeight: '600'},
  statusPill: {
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ledgerRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  ledgerLabel: {fontSize: 11, fontWeight: '800'},
  stateCard: {padding: 22, borderRadius: 16, gap: 10},
  stateTitle: {fontSize: 17, fontWeight: '800'},
  stateCopy: {fontSize: 13, lineHeight: 18},
  loading: {paddingVertical: 60, alignItems: 'center'},
  loadMore: {alignItems: 'center', paddingVertical: 10},
})
