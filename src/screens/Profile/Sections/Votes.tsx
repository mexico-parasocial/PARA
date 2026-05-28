import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import {
  ActivityIndicator,
  findNodeHandle,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {
  type ProfileVoteItem,
  useProfileVotesQuery,
} from '#/state/queries/profile-votes'
import {EmptyState} from '#/view/com/util/EmptyState'
import {List} from '#/view/com/util/List'
import {type ListRef} from '#/view/com/util/List'
import {atoms as a, useTheme} from '#/alf'
import {EditBig_Stroke1_Corner0_Rounded as EditIcon} from '#/components/icons/EditBig'
import {Text} from '#/components/Typography'
import {IS_IOS} from '#/env'
import {type SectionRef} from './types'

interface Props {
  did?: string
  headerHeight: number
  scrollElRef: ListRef
  setScrollViewTag: (tag: number | null) => void
  isFocused: boolean
}

type FilterKey = 'all' | 'support' | 'oppose' | 'neutral' | 'option'

const FILTERS: Array<{key: FilterKey; label: string}> = [
  {key: 'all', label: 'All'},
  {key: 'support', label: 'Support'},
  {key: 'oppose', label: 'Oppose'},
  {key: 'neutral', label: 'Neutral'},
  {key: 'option', label: 'Options'},
]

export const ProfileVotesSection = forwardRef<SectionRef, Props>(
  function ProfileVotesSection(
    {did, headerHeight, scrollElRef, setScrollViewTag, isFocused},
    ref,
  ) {
    const t = useTheme()
    const {_} = useLingui()
    const {data: votes = [], isLoading} = useProfileVotesQuery(did || '')
    const [filter, setFilter] = useState<FilterKey>('all')

    const stats = useMemo(() => {
      const support = votes.filter(item => item.voteColor === 'positive').length
      const oppose = votes.filter(item => item.voteColor === 'negative').length
      const neutral = votes.filter(item => item.voteColor === 'warning').length
      const option = votes.filter(item => item.vote.startsWith('Option')).length

      return {
        support,
        oppose,
        neutral,
        option,
        total: votes.length,
      }
    }, [votes])

    const filteredVotes = useMemo(() => {
      if (filter === 'all') return votes
      if (filter === 'support') {
        return votes.filter(item => item.voteColor === 'positive')
      }
      if (filter === 'oppose') {
        return votes.filter(item => item.voteColor === 'negative')
      }
      if (filter === 'neutral') {
        return votes.filter(item => item.voteColor === 'warning')
      }
      return votes.filter(item => item.vote.startsWith('Option'))
    }, [filter, votes])

    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        scrollElRef.current?.scrollToOffset({
          offset: -headerHeight,
          animated: true,
        })
      },
    }))

    useEffect(() => {
      if (IS_IOS && isFocused && scrollElRef.current) {
        // @ts-ignore
        const nativeTag = findNodeHandle(scrollElRef.current)
        setScrollViewTag(nativeTag)
      }
    }, [isFocused, scrollElRef, setScrollViewTag])

    const renderItem = ({item}: {item: unknown}) => {
      const voteItem = item as ProfileVoteItem
      const voteColor =
        voteItem.voteColor === 'positive'
          ? t.palette.positive_600
          : voteItem.voteColor === 'negative'
            ? t.palette.negative_600
            : voteItem.voteColor === 'warning'
              ? t.palette.yellow
              : t.atoms.text_contrast_medium.color
      const date = voteItem.date
        ? new Date(voteItem.date).toLocaleDateString()
        : ''

      return (
        <View
          style={[
            styles.voteCard,
            a.border,
            t.atoms.border_contrast_low,
            t.atoms.bg,
          ]}>
          <View style={[a.flex_row, a.justify_between, a.gap_sm]}>
            <View style={[styles.voteTextBlock]}>
              <Text style={[a.text_md, a.font_bold]} numberOfLines={2}>
                {voteItem.subject || 'Vote'}
              </Text>
              {voteItem.subjectType ? (
                <Text
                  style={[styles.subjectType, t.atoms.text_contrast_medium]}
                  numberOfLines={1}>
                  {voteItem.subjectType}
                </Text>
              ) : null}
            </View>
            <View style={[styles.votePill, {borderColor: voteColor}]}>
              <Text
                style={[styles.votePillText, {color: voteColor}]}
                numberOfLines={1}>
                {voteItem.vote}
              </Text>
            </View>
          </View>
          <View
            style={[a.flex_row, a.justify_between, a.align_center, a.mt_sm]}>
            <Text style={[styles.metaText, t.atoms.text_contrast_medium]}>
              Public vote
            </Text>
            <Text style={[styles.metaText, t.atoms.text_contrast_low]}>
              {date}
            </Text>
          </View>
          {voteItem.reason ? (
            <Text
              style={[styles.reason, t.atoms.text_contrast_medium]}
              numberOfLines={3}>
              {voteItem.reason}
            </Text>
          ) : null}
        </View>
      )
    }

    const renderHeader = () => {
      if (votes.length === 0) return null

      return (
        <View style={styles.header}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, {backgroundColor: '#10B981'}]}>
              <Text style={styles.summaryValue}>{stats.support}</Text>
              <Text style={styles.summaryLabel}>Support</Text>
            </View>
            <View style={[styles.summaryCard, {backgroundColor: '#EF4444'}]}>
              <Text style={styles.summaryValue}>{stats.oppose}</Text>
              <Text style={styles.summaryLabel}>Oppose</Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                {backgroundColor: t.palette.primary_500},
              ]}>
              <Text style={styles.summaryValue}>{stats.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>

          <View
            style={[
              styles.breakdownCard,
              a.border,
              t.atoms.border_contrast_low,
            ]}>
            <View>
              <Text
                style={[styles.breakdownLabel, t.atoms.text_contrast_medium]}>
                Neutral
              </Text>
              <Text style={[styles.breakdownValue, t.atoms.text]}>
                {stats.neutral}
              </Text>
            </View>
            <View
              style={[
                styles.breakdownDivider,
                {backgroundColor: t.atoms.bg_contrast_25.backgroundColor},
              ]}
            />
            <View>
              <Text
                style={[styles.breakdownLabel, t.atoms.text_contrast_medium]}>
                Option votes
              </Text>
              <Text style={[styles.breakdownValue, t.atoms.text]}>
                {stats.option}
              </Text>
            </View>
          </View>

          <View style={styles.filters}>
            {FILTERS.map(item => {
              const selected = filter === item.key
              return (
                <TouchableOpacity
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Filter by ${item.label}`)}
                  accessibilityHint={_(msg`Filter public votes`)}
                  style={[
                    styles.filterChip,
                    a.border,
                    t.atoms.border_contrast_low,
                    selected && {
                      backgroundColor: t.palette.primary_500,
                      borderColor: t.palette.primary_500,
                    },
                  ]}
                  onPress={() => setFilter(item.key)}>
                  <Text
                    style={[
                      styles.filterText,
                      t.atoms.text,
                      selected && styles.filterTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    const renderEmpty = () => {
      if (isLoading) {
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={t.palette.primary_500} />
          </View>
        )
      }

      return (
        <EmptyState
          icon={EditIcon}
          message={
            votes.length > 0
              ? _(msg`No votes match this filter`)
              : _(msg`No public votes yet`)
          }
          style={{width: '100%'}}
        />
      )
    }

    return (
      <List
        ref={scrollElRef}
        data={filteredVotes}
        renderItem={renderItem}
        keyExtractor={item => (item as ProfileVoteItem).id}
        headerOffset={headerHeight}
        refreshing={isLoading}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{
          minHeight: '100%',
          paddingBottom: 100,
          paddingHorizontal: 16,
        }}
      />
    )
  },
)

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  breakdownCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  breakdownDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  breakdownValue: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextSelected: {
    color: '#fff',
  },
  voteCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
  },
  voteTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  subjectType: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  votePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    maxWidth: 132,
  },
  votePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reason: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  loading: {
    paddingVertical: 48,
  },
})
