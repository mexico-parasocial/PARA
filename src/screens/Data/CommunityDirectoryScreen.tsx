import {useMemo, useState} from 'react'
import {Pressable, RefreshControl, ScrollView, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {type RouteProp, useNavigation, useRoute} from '@react-navigation/native'

import {
  ACTIVITY_STATUSES,
  formatMinor,
  getActivityKindMeta,
} from '#/lib/community-activities'
import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {useCommunityOrganizers} from '#/state/queries/community-activities'
import {useCommunityActivityExplorerQuery} from '#/state/queries/community-activity-explorer'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {SearchInput} from '#/components/forms/SearchInput'
import {Calendar_Stroke2_Corner0_Rounded as CalendarIcon} from '#/components/icons/Calendar'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon,
  ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon,
} from '#/components/icons/Chevron'
import {CommunityIcon_Stroke as CommunityIcon} from '#/components/icons/Community'
import {Megaphone_Stroke2_Corner0_Rounded as MegaphoneIcon} from '#/components/icons/Megaphone'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {CommunityFilterDialog} from '#/features/communityActivities/components/CommunityFilterDialog'
import {
  type ActivityCategoryFilter,
  type ActivityTimeFilter,
  type ExplorerEntry,
  filterActivityEntries,
} from '#/features/communityActivities/explorer'

function FilterButton({
  label,
  selected,
  onPress,
  compact = false,
}: {
  label: string
  selected: boolean
  onPress: () => void
  compact?: boolean
}) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={label}
      accessibilityState={{selected}}
      aria-pressed={selected}
      onPress={onPress}
      style={({pressed}) => [
        a.px_md,
        a.py_sm,
        compact ? a.rounded_sm : a.border_b,
        compact
          ? selected && t.atoms.bg_contrast_100
          : {
              borderBottomWidth: 2,
              borderColor: selected ? t.palette.primary_500 : 'transparent',
            },
        pressed && {opacity: 0.7},
      ]}>
      <Text
        style={[
          compact ? a.text_xs : a.text_sm,
          selected && a.font_bold,
          selected ? t.atoms.text : t.atoms.text_contrast_medium,
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}

function ActivityCard({
  entry,
  onPress,
}: {
  entry: ExplorerEntry
  onPress: () => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const {activity, board} = entry
  const {record} = activity
  const plan =
    activity.category === 'economic' ? activity.record.financialPlan : undefined
  const financial = activity.category === 'economic'
  const accent = financial ? t.palette.positive_600 : t.palette.primary_600
  const kind = getActivityKindMeta(record.details?.$type)
  const status = ACTIVITY_STATUSES.find(item => item.value === record.status)
  const date = new Date(record.startsAt)
  const validDate = Number.isFinite(date.getTime())
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={record.title}
      accessibilityHint={
        financial
          ? l`Opens the activity and its public ledger`
          : l`Opens the activity details`
      }
      onPress={onPress}
      targetScale={0.99}
      style={[
        a.flex_row,
        a.gap_md,
        a.p_lg,
        a.border,
        a.rounded_md,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.align_center, a.gap_xs, a.pt_xs, {width: 52}]}>
        <View
          style={[
            a.w_full,
            a.align_center,
            a.py_sm,
            a.rounded_sm,
            financial
              ? {backgroundColor: t.palette.positive_100}
              : {backgroundColor: t.palette.primary_100},
          ]}>
          {validDate ? (
            <>
              <Text style={[a.text_xs, a.font_bold, {color: accent}]}>
                {i18n.date(date, {month: 'short'})}
              </Text>
              <Text style={[a.text_2xl, a.font_bold, {color: accent}]}>
                {i18n.date(date, {day: 'numeric'})}
              </Text>
            </>
          ) : (
            <CalendarIcon size="lg" style={{color: accent}} />
          )}
        </View>
        {validDate ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {i18n.date(date, {year: 'numeric'})}
          </Text>
        ) : null}
      </View>
      <View style={[a.flex_1, a.gap_sm, {minWidth: 0}]}>
        <View style={[a.flex_row, a.align_center, a.justify_between, a.gap_sm]}>
          <Text
            style={[a.text_xs, a.flex_1, t.atoms.text_contrast_medium]}
            numberOfLines={1}
            emoji>
            {board.name}
          </Text>
          <ChevronRightIcon size="xs" style={t.atoms.text_contrast_medium} />
        </View>
        <Text
          style={[a.text_md, a.font_bold, a.leading_snug]}
          numberOfLines={2}
          emoji>
          {record.title}
        </Text>
        {record.description ? (
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}
            numberOfLines={2}
            emoji>
            {record.description}
          </Text>
        ) : null}
        <View style={[a.flex_row, a.flex_wrap, a.align_center, a.gap_sm]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {kind.emoji} {i18n._(kind.label)}
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {validDate
              ? i18n.date(date, {hour: 'numeric', minute: '2-digit'})
              : l`Date pending`}
          </Text>
          {status ? (
            <Text
              style={[
                a.text_xs,
                a.px_xs,
                a.py_2xs,
                a.rounded_xs,
                t.atoms.bg_contrast_50,
                t.atoms.text_contrast_medium,
              ]}>
              {i18n._(status.label)}
            </Text>
          ) : null}
        </View>
        {record.location ? (
          <Text
            style={[a.text_xs, t.atoms.text_contrast_medium]}
            numberOfLines={1}
            emoji>
            {record.location}
          </Text>
        ) : null}
        {financial ? (
          <View
            style={[
              a.border_t,
              a.pt_sm,
              a.flex_row,
              a.flex_wrap,
              a.gap_sm,
              a.justify_between,
              t.atoms.border_contrast_low,
            ]}>
            <Text style={[a.text_xs, a.font_bold, {color: accent}]}>
              <Trans>Public financial ledger</Trans>
            </Text>
            {plan && plan.fundingGoalMinor && plan.fundingGoalMinor > 0 ? (
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>
                  Goal {formatMinor(plan.fundingGoalMinor, plan.currency)}
                </Trans>
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </PressableScale>
  )
}

function CabildeosEntry({onPress}: {onPress: () => void}) {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={l`Cabildeos`}
      accessibilityHint={l`Explore cabildeos across communities`}
      onPress={onPress}
      targetScale={0.99}
      style={[
        a.p_lg,
        a.rounded_md,
        a.border,
        a.flex_row,
        a.align_center,
        a.gap_md,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View
        style={[
          a.p_sm,
          a.rounded_sm,
          {backgroundColor: t.palette.primary_100},
        ]}>
        <MegaphoneIcon size="md" style={{color: t.palette.primary_600}} />
      </View>
      <View style={[a.flex_1, a.gap_xs]}>
        <Text style={[a.text_md, a.font_bold]}>
          <Trans>Cabildeos</Trans>
        </Text>
        <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>Deliberate and vote on proposals across communities.</Trans>
        </Text>
      </View>
      <ChevronRightIcon size="sm" style={t.atoms.text_contrast_medium} />
    </PressableScale>
  )
}

export function CommunityDirectoryScreen() {
  const t = useTheme()
  const {t: l} = useLingui()
  const {gtMobile} = useBreakpoints()
  const navigation = useNavigation<NavigationProp>()
  const route =
    useRoute<RouteProp<CommonNavigatorParams, 'CommunityDirectory'>>()
  const query = useCommunityActivityExplorerQuery()
  const category: ActivityCategoryFilter =
    route.params?.category === 'social' || route.params?.category === 'economic'
      ? route.params.category
      : 'all'
  const time: ActivityTimeFilter =
    route.params?.time === 'past' || route.params?.time === 'all'
      ? route.params.time
      : 'upcoming'
  const communityUri = route.params?.communityUri ?? null
  const [search, setSearch] = useState('')
  const communityControl = Dialog.useDialogControl()
  const registrationControl = Dialog.useDialogControl()
  const {boards, entries} = useMemo(() => {
    const boards = new Map<string, CommunityBoardView>()
    const entries = new Map<string, ExplorerEntry>()
    for (const page of query.data?.pages ?? []) {
      for (const board of page.boards) boards.set(board.uri, board)
      for (const entry of page.entries) entries.set(entry.activity.uri, entry)
    }
    return {
      boards: [...boards.values()].sort((a, b) => a.name.localeCompare(b.name)),
      entries: [...entries.values()],
    }
  }, [query.data])
  const selectedBoard = boards.find(board => board.uri === communityUri)
  const {canOrganize} = useCommunityOrganizers({
    communityUri: selectedBoard?.uri,
    communityName: selectedBoard?.name,
    communityId: selectedBoard?.communityId,
  })
  const filter = {category, communityUri, search, time, now: Date.now()}
  const visibleEntries = filterActivityEntries(entries, filter)
  const pastEntries = filterActivityEntries(entries, {...filter, time: 'past'})
  const hasFilters = !!communityUri || !!search.trim()
  const clearFilters = () => {
    setSearch('')
    navigation.setParams({communityUri: undefined, time: 'upcoming'})
  }
  const openCommunity = () => {
    if (selectedBoard)
      navigation.navigate('CommunityProfile', {
        communityId: selectedBoard.communityId,
        communityName: selectedBoard.name,
      })
  }
  const register = (nextCategory: 'social' | 'economic') => {
    registrationControl.close()
    if (selectedBoard)
      navigation.navigate('CreateCommunityActivity', {
        communityUri: selectedBoard.uri,
        communityName: selectedBoard.name,
        communityId: selectedBoard.communityId,
        category: nextCategory,
      })
  }
  const loadMore = () => void query.fetchNextPage()
  return (
    <Layout.Screen>
      <Layout.Header.Outer>
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
          contentContainerStyle={[a.p_lg, a.gap_xl, {paddingBottom: 100}]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refresh()}
            />
          }>
          <View style={[a.gap_lg]}>
            <View style={[a.flex_row, a.border_b, t.atoms.border_contrast_low]}>
              <FilterButton
                label={l`All activities`}
                selected={category === 'all'}
                onPress={() => navigation.setParams({category: 'all'})}
              />
              <FilterButton
                label={l`Social`}
                selected={category === 'social'}
                onPress={() => navigation.setParams({category: 'social'})}
              />
              <FilterButton
                label={l`Financial`}
                selected={category === 'economic'}
                onPress={() => navigation.setParams({category: 'economic'})}
              />
            </View>
            <View
              style={[
                a.gap_sm,
                gtMobile && a.flex_row,
                gtMobile && a.align_center,
              ]}>
              <View style={[gtMobile && a.flex_1]}>
                <SearchInput
                  label={l`Search activities`}
                  placeholder={l`Search activities`}
                  value={search}
                  onChangeText={setSearch}
                  onClearText={() => setSearch('')}
                />
              </View>
              <Button
                label={l`Choose a community`}
                accessibilityHint={l`Filters activity by community`}
                size="small"
                variant="outline"
                color="secondary"
                onPress={communityControl.open}
                style={[gtMobile ? {maxWidth: 210} : a.align_start]}>
                <ButtonIcon icon={CommunityIcon} size="sm" />
                <ButtonText numberOfLines={1}>
                  {selectedBoard?.name ??
                    (communityUri ? l`Selected community` : l`All communities`)}
                </ButtonText>
                <ButtonIcon icon={ChevronDownIcon} size="xs" />
              </Button>
            </View>
            {hasFilters ? (
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.justify_between,
                  a.gap_sm,
                ]}>
                {selectedBoard ? (
                  <Button
                    label={l`Open community`}
                    size="tiny"
                    variant="ghost"
                    color="secondary"
                    onPress={openCommunity}>
                    <ButtonText numberOfLines={1}>
                      {selectedBoard.name} ↗
                    </ButtonText>
                  </Button>
                ) : (
                  <View />
                )}
                <Button
                  label={l`Clear filters`}
                  size="tiny"
                  variant="ghost"
                  color="secondary"
                  onPress={clearFilters}>
                  <ButtonText>
                    <Trans>Clear filters</Trans>
                  </ButtonText>
                </Button>
              </View>
            ) : null}
          </View>
          {category !== 'economic' ? (
            <View style={[a.gap_sm]}>
              <Text
                style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
                <Trans>Civic participation</Trans>
              </Text>
              <CabildeosEntry
                onPress={() => navigation.navigate('Cabildeos')}
              />
            </View>
          ) : null}
          <View style={[a.gap_lg]}>
            <View style={[a.gap_md]}>
              <View
                style={[
                  a.flex_row,
                  a.flex_wrap,
                  a.align_center,
                  a.justify_between,
                  a.gap_sm,
                ]}>
                <Text
                  style={[a.text_lg, a.font_bold, a.flex_1, {minWidth: 150}]}>
                  {category === 'economic' ? (
                    <Trans>Financial activities</Trans>
                  ) : category === 'social' ? (
                    <Trans>Social activities</Trans>
                  ) : (
                    <Trans>Community events</Trans>
                  )}
                </Text>
                {canOrganize && selectedBoard ? (
                  <Button
                    label={l`Register activity`}
                    size="small"
                    color="primary"
                    variant="outline"
                    onPress={() =>
                      category === 'all'
                        ? registrationControl.open()
                        : register(category)
                    }>
                    <ButtonIcon icon={PlusIcon} size="xs" />
                    <ButtonText>
                      <Trans>Register activity</Trans>
                    </ButtonText>
                  </Button>
                ) : null}
              </View>
              <View style={[a.flex_row, a.align_start]}>
                <View
                  style={[
                    a.flex_row,
                    a.gap_2xs,
                    a.p_2xs,
                    a.rounded_md,
                    t.atoms.bg_contrast_25,
                  ]}>
                  <FilterButton
                    label={l`Upcoming`}
                    compact
                    selected={time === 'upcoming'}
                    onPress={() => navigation.setParams({time: 'upcoming'})}
                  />
                  <FilterButton
                    label={l`Past`}
                    compact
                    selected={time === 'past'}
                    onPress={() => navigation.setParams({time: 'past'})}
                  />
                  <FilterButton
                    label={l`Any time`}
                    compact
                    selected={time === 'all'}
                    onPress={() => navigation.setParams({time: 'all'})}
                  />
                </View>
              </View>
            </View>
            {query.isPending ? (
              <View style={[a.py_5xl, a.align_center]}>
                <Loader size="lg" />
              </View>
            ) : query.isError ? (
              <View
                style={[
                  a.p_xl,
                  a.gap_md,
                  a.rounded_md,
                  t.atoms.bg_contrast_25,
                ]}>
                <Text style={[a.text_md, a.font_bold]}>
                  <Trans>Activities could not load</Trans>
                </Text>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  <Trans>Try again to explore community records.</Trans>
                </Text>
                <Button
                  label={l`Retry`}
                  onPress={() => void query.refetch()}
                  size="small"
                  color="secondary"
                  style={a.align_start}>
                  <ButtonText>
                    <Trans>Retry</Trans>
                  </ButtonText>
                </Button>
              </View>
            ) : visibleEntries.length ? (
              <View style={[a.gap_md]}>
                {visibleEntries.map(entry => (
                  <ActivityCard
                    key={entry.activity.uri}
                    entry={entry}
                    onPress={() =>
                      navigation.navigate('CommunityActivity', {
                        activityUri: entry.activity.uri,
                      })
                    }
                  />
                ))}
              </View>
            ) : (
              <View
                style={[
                  a.p_xl,
                  a.gap_md,
                  a.rounded_md,
                  a.border,
                  t.atoms.border_contrast_low,
                ]}>
                <CalendarIcon size="lg" style={t.atoms.text_contrast_medium} />
                <Text style={[a.text_md, a.font_bold]}>
                  {search.trim() ? (
                    <Trans>No matching activities</Trans>
                  ) : time === 'upcoming' ? (
                    <Trans>No upcoming activities</Trans>
                  ) : time === 'past' ? (
                    <Trans>No past activities</Trans>
                  ) : (
                    <Trans>No activities published yet</Trans>
                  )}
                </Text>
                <Text
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {search.trim() ? (
                    <Trans>Try another search or clear the filters.</Trans>
                  ) : selectedBoard ? (
                    <Trans>
                      Activities from {selectedBoard.name} will appear here as
                      organizers publish them.
                    </Trans>
                  ) : (
                    <Trans>
                      Choose a community to explore its events and projects, or
                      explore more communities below.
                    </Trans>
                  )}
                </Text>
                <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
                  {time === 'upcoming' && pastEntries.length > 0 ? (
                    <Button
                      label={l`View past activities`}
                      size="small"
                      color="secondary"
                      variant="outline"
                      onPress={() => navigation.setParams({time: 'past'})}>
                      <ButtonText>
                        <Trans>View past activities</Trans>
                      </ButtonText>
                    </Button>
                  ) : null}
                  {hasFilters ? (
                    <Button
                      label={l`Clear filters`}
                      size="small"
                      color="secondary"
                      variant="outline"
                      onPress={clearFilters}>
                      <ButtonText>
                        <Trans>Clear filters</Trans>
                      </ButtonText>
                    </Button>
                  ) : (
                    <Button
                      label={l`Choose a community`}
                      size="small"
                      color="secondary"
                      variant="outline"
                      onPress={communityControl.open}>
                      <ButtonText>
                        <Trans>Choose a community</Trans>
                      </ButtonText>
                    </Button>
                  )}
                </View>
              </View>
            )}
            {query.hasNextPage ? (
              <Button
                label={l`Explore more communities`}
                onPress={loadMore}
                disabled={query.isFetchingNextPage}
                size="small"
                color="secondary"
                variant="ghost"
                style={a.align_center}>
                <ButtonText>
                  {query.isFetchingNextPage ? (
                    <Trans>Loading…</Trans>
                  ) : (
                    <Trans>Explore more communities</Trans>
                  )}
                </ButtonText>
              </Button>
            ) : null}
            {query.isFetchNextPageError ? (
              <Text
                accessibilityRole="alert"
                style={[a.text_sm, {color: t.palette.negative_500}]}>
                <Trans>More communities could not load. Try again.</Trans>
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </Layout.Center>
      <CommunityFilterDialog
        control={communityControl}
        boards={boards}
        selectedUri={communityUri}
        onSelect={uri => navigation.setParams({communityUri: uri ?? undefined})}
        hasMore={!!query.hasNextPage}
        isLoadingMore={query.isFetchingNextPage}
        loadMoreError={query.isFetchNextPageError}
        onLoadMore={loadMore}
      />
      <Dialog.Outer control={registrationControl}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={l`Register activity`}>
          <View style={[a.gap_lg]}>
            <Text style={[a.text_xl, a.font_bold]}>
              <Trans>Register activity</Trans>
            </Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              {selectedBoard?.name}
            </Text>
            <Button
              label={l`Social activity`}
              color="secondary"
              variant="outline"
              onPress={() => register('social')}>
              <ButtonText>
                <Trans>Social activity</Trans>
              </ButtonText>
            </Button>
            <Button
              label={l`Financial activity`}
              color="secondary"
              variant="outline"
              onPress={() => register('economic')}>
              <ButtonText>
                <Trans>Financial activity</Trans>
              </ButtonText>
            </Button>
          </View>
          <Dialog.Close />
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </Layout.Screen>
  )
}
