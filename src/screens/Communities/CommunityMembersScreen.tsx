import {useCallback, useMemo, useState} from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useRoute} from '@react-navigation/native'

import {
  useChatMemberListQuery,
  useUpdateUserChatPreferencesMutation,
  useUserChatPreferencesQuery,
} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {ChatBadge} from '#/components/ChatBadge'
import {useDialogControl} from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {MemberProfileModal} from './MemberProfileModal'

interface MemberListParams {
  communityUri: string
  communityName: string
}

type FilterType = 'all' | 'reported' | 'newcomer' | 'lurker' | 'sanctioned'

export function CommunityMembersScreen() {
  const route = useRoute<{
    key: string
    name: 'CommunityMembers'
    params: MemberListParams
  }>()
  const t = useTheme()
  const {currentAccount} = useSession()
  const {communityUri, communityName} = route.params

  const [filter, setFilter] = useState<FilterType>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDid, setSelectedDid] = useState<string | null>(null)
  const profileDialog = useDialogControl()

  const {data, isLoading, refetch} = useChatMemberListQuery(communityUri)
  const {data: prefs} = useUserChatPreferencesQuery(currentAccount?.did)
  const updatePrefs = useUpdateUserChatPreferencesMutation()
  const showBadges = prefs?.showChatBadges ?? false

  const filteredMembers = useMemo(() => {
    if (!data?.members) return []
    if (filter === 'all') return data.members
    return data.members.filter(m =>
      m.badges.some(b => b.visibleInChat && b.type === filter),
    )
  }, [data, filter])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const filters: {key: FilterType; label: string}[] = [
    {key: 'all', label: 'Todos'},
    {key: 'reported', label: 'Reportados'},
    {key: 'newcomer', label: 'Nuevos'},
    {key: 'lurker', label: 'Inactivos'},
    {key: 'sanctioned', label: 'Sancionados'},
  ]

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>{communityName}</Layout.Header.TitleText>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {filteredMembers.length} miembros
          </Text>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <TouchableOpacity accessibilityRole="button"
            onPress={() => {
              if (!currentAccount?.did) return
              updatePrefs.mutate({
                did: currentAccount.did,
                showChatBadges: !showBadges,
              })
            }}
            style={[styles.toggleBtn, showBadges && styles.toggleBtnActive]}>
            <Text
              style={[
                a.text_xs,
                showBadges ? t.atoms.text : t.atoms.text_contrast_medium,
              ]}>
              {showBadges ? '🔴 Badges ON' : '⚪ Badges OFF'}
            </Text>
          </TouchableOpacity>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[a.px_md, a.py_sm]}
        contentContainerStyle={[a.gap_sm]}>
        {filters.map(f => (
          <TouchableOpacity accessibilityRole="button"
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.chip,
              filter === f.key && {
                backgroundColor: t.atoms.bg_contrast_100.backgroundColor,
              },
            ]}>
            <Text
              style={[
                a.text_sm,
                filter === f.key ? t.atoms.text : t.atoms.text_contrast_medium,
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Member list */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {isLoading ? (
          <View style={[a.p_xl]}>
            <Text style={t.atoms.text_contrast_medium}>Cargando...</Text>
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={[a.p_xl]}>
            <Text style={t.atoms.text_contrast_medium}>
              No hay miembros en este filtro.
            </Text>
          </View>
        ) : (
          <View style={[a.gap_0]}>
            {filteredMembers.map(member => (
              <MemberRow
                key={member.did}
                member={member}
                communityUri={communityUri}
                showBadges={showBadges}
                onPress={() => {
                  setSelectedDid(member.did)
                  profileDialog.open()
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {selectedDid && (
        <MemberProfileModal
          control={profileDialog}
          did={selectedDid}
          communityUri={communityUri}
        />
      )}
    </Layout.Screen>
  )
}

function MemberRow({
  member,
  communityUri: _communityUri,
  showBadges,
  onPress,
}: {
  member: {
    did: string
    matrixUserId?: string
    badges: unknown[]
    participation?: {
      messageCount: number
      votesCast: number
    }
    lastActiveAt?: string
  }
  communityUri: string
  showBadges: boolean
  onPress: () => void
}) {
  const t = useTheme()

  const riskBadge = member.badges.find(
    (b: unknown) =>
      b.visibleInChat &&
      (b.severity === 'warning' || b.severity === 'critical'),
  )
  const contextBadge = member.badges.find(
    (b: unknown) => b.visibleInChat && b.severity === 'info',
  )

  return (
    <TouchableOpacity accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.row,
        a.px_md,
        a.py_md,
        a.border_t,
        t.atoms.border_contrast_low,
      ]}>
      <View style={styles.avatarWrap}>
        <UserAvatar size={44} type="user" avatar={null} />
        {showBadges && riskBadge && (
          <ChatBadge severity={riskBadge.severity} size={12} />
        )}
      </View>

      <View style={[a.flex_1, a.gap_xs]}>
        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <Text
            style={[a.text_md, a.font_bold, t.atoms.text]}
            numberOfLines={1}>
            {member.matrixUserId?.split(':')[0]?.replace('@', '') ??
                member.did.slice(-8)}
          </Text>

          {contextBadge && (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {contextBadge.icon} {contextBadge.label}
            </Text>
          )}
        </View>

        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {member.participation?.messageCount ?? 0} msgs ·{' '}
            {member.participation?.votesCast ?? 0} votos
          </Text>
          {member.lastActiveAt && (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              · Activo recientemente
            </Text>
          )}
        </View>
      </View>

      {/* Positive badges count */}
      {member.badges.filter((b: unknown) => !b.visibleInChat).length > 0 && (
        <View style={styles.badgePill}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {member.badges.filter((b: unknown) => !b.visibleInChat).length} 🏅
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.10)',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255,59,48,0.10)',
  },
})
