import {useMemo, useState} from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {RouteProp, useRoute} from '@react-navigation/native'

import {CommonNavigatorParams} from '#/lib/routes/types'
import {
  type CommunityMemberView,
  useCommunityMembersQuery,
} from '#/state/queries/community-boards'
import {List} from '#/view/com/util/List'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'

type FilterMode = 'all' | 'representatives' | 'participants'
type SortMode = 'joined' | 'participation'

const REPRESENTATIVE_ROLES = new Set([
  'delegate',
  'delegado',
  'representative',
  'representante',
  'moderator',
  'official',
  'deputy',
  'subdelegate',
  'agent',
])

function MemberRow({item}: {item: CommunityMemberView}) {
  const t = useTheme()
  const name = item.displayName || item.handle || item.did
  const participation =
    item.votesCast +
    item.delegationsReceived +
    item.policyPosts +
    item.matterPosts

  return (
    <View style={[a.border_t, t.atoms.border_contrast_low]}>
      <View style={[a.flex_row, a.align_center, a.py_md, a.px_xl]}>
        <UserAvatar type="user" avatar={item.avatar} size={44} />
        <View style={[a.flex_1, a.ml_md]}>
          <Text style={[a.font_bold, a.text_md, t.atoms.text]}>{name}</Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {item.handle ? `@${item.handle}` : item.did}
          </Text>
          <View style={[a.flex_row, a.align_center, a.mt_xs, a.gap_sm]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {item.membershipState}
            </Text>
            {item.roles?.length ? (
              <Text style={[a.text_xs, {color: t.palette.primary_500}]}>
                {item.roles.slice(0, 2).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.metricColumn}>
          <Text style={[styles.metricValue, t.atoms.text]}>
            {participation.toLocaleString()}
          </Text>
          <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
            activity
          </Text>
        </View>
      </View>
    </View>
  )
}

export function CommunityVotersScreen() {
  const t = useTheme()
  const route = useRoute<RouteProp<CommonNavigatorParams, 'CommunityVoters'>>()
  const {communityId, communityName = 'Community'} = route.params || {}
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('participation')
  const {data, isLoading, isError, refetch} = useCommunityMembersQuery({
    communityId,
    sort: sortMode,
    limit: 100,
  })
  const members = data?.members ?? []
  const filteredMembers = useMemo(() => {
    if (filterMode === 'all') return members
    if (filterMode === 'participants') {
      return members.filter(
        member =>
          member.votesCast +
            member.delegationsReceived +
            member.policyPosts +
            member.matterPosts >
          0,
      )
    }
    return members.filter(member =>
      member.roles?.some(role => REPRESENTATIVE_ROLES.has(role)),
    )
  }, [filterMode, members])
  const totalActivity = members.reduce(
    (sum, member) =>
      sum +
      member.votesCast +
      member.delegationsReceived +
      member.policyPosts +
      member.matterPosts,
    0,
  )
  const representativeCount = members.filter(member =>
    member.roles?.some(role => REPRESENTATIVE_ROLES.has(role)),
  ).length

  const renderHeader = (
    <View style={[a.p_md, a.border_b, t.atoms.border_contrast_low]}>
      <View style={[a.flex_row, a.gap_md, a.mb_lg]}>
        <SummaryCard label="Active members" value={members.length} />
        <SummaryCard label="Representatives" value={representativeCount} />
        <SummaryCard label="Activity" value={totalActivity} />
      </View>

      <View style={[a.flex_row, a.gap_sm, a.mb_md]}>
        <FilterButton
          label="All"
          selected={filterMode === 'all'}
          onPress={() => setFilterMode('all')}
        />
        <FilterButton
          label="Roles"
          selected={filterMode === 'representatives'}
          onPress={() => setFilterMode('representatives')}
        />
        <FilterButton
          label="Active"
          selected={filterMode === 'participants'}
          onPress={() => setFilterMode('participants')}
        />
      </View>

      <View style={[a.flex_row, a.gap_sm]}>
        <FilterButton
          label="Participation"
          selected={sortMode === 'participation'}
          onPress={() => setSortMode('participation')}
        />
        <FilterButton
          label="Joined"
          selected={sortMode === 'joined'}
          onPress={() => setSortMode('joined')}
        />
      </View>
    </View>
  )

  return (
    <Layout.Screen testID="communityVotersScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {communityName} <Trans>Members</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      {isLoading || isError || filteredMembers.length === 0 ? (
        <>
          {renderHeader}
          <ListMaybePlaceholder
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            emptyType="results"
            emptyTitle="No active members yet"
            emptyMessage="This community does not have active members matching this view yet."
          />
        </>
      ) : (
        <List
          data={filteredMembers}
          renderItem={({item}) => <MemberRow item={item} />}
          keyExtractor={item => item.did}
          ListHeaderComponent={renderHeader}
        />
      )}
    </Layout.Screen>
  )
}

function SummaryCard({label, value}: {label: string; value: number}) {
  const t = useTheme()
  return (
    <View style={[styles.summaryCard, t.atoms.bg_contrast_25]}>
      <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
        {value.toLocaleString()}
      </Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>{label}</Text>
    </View>
  )
}

function FilterButton({
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
        styles.filterButton,
        {
          backgroundColor: selected
            ? t.palette.primary_500
            : t.palette.contrast_25,
        },
      ]}>
      <Text
        style={[
          styles.filterButtonText,
          {color: selected ? '#fff' : t.atoms.text.color},
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metricColumn: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
})
