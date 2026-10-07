import {useMemo} from 'react'
import {
  Pressable,
  type PressableProps,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type ChatBadge,
  type MatrixRoomKind,
  type MatrixRoomSummary,
  type MemberListItem,
} from '#/state/queries/matrix'
import {useProfilesQuery} from '#/state/queries/profile'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {Text} from '#/components/Typography'

const ONLINE_WINDOW_MS = 15 * 60 * 1000
// `app.bsky.actor.getProfiles` accepts at most 25 actors per call.
const MAX_PROFILE_LOOKUPS = 25

export const CHAT_PANEL_WIDTH = 240

/**
 * Left rail listing the rooms of one community (main room, debate chambers,
 * observers). Selecting a room swaps the route's `roomId`.
 */
export function ChatRoomsRail({
  rooms,
  activeRoomId,
  mainRoomId,
  liveUnread,
  onSelect,
}: {
  rooms: MatrixRoomSummary[]
  activeRoomId: string
  /** The community space id, used when the route carries no explicit room. */
  mainRoomId?: string
  /** Live per-room unread counts from the Matrix client; they override the bridge's. */
  liveUnread?: Record<string, number>
  onSelect: (room: MatrixRoomSummary) => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  const labels: Record<MatrixRoomKind, string> = {
    main: _(msg`Sala principal`),
    'chamber-a': _(msg`Cámara A`),
    'chamber-b': _(msg`Cámara B`),
    observers: _(msg`Consejo observador`),
  }
  const order: MatrixRoomKind[] = [
    'main',
    'chamber-a',
    'chamber-b',
    'observers',
  ]
  const sorted = [...rooms].sort(
    (x, y) => order.indexOf(x.kind) - order.indexOf(y.kind),
  )
  const hasExactMatch = sorted.some(r => r.roomId === activeRoomId)

  return (
    <View
      style={[
        styles.panel,
        {borderRightColor: t.palette.contrast_100},
        {backgroundColor: t.palette.contrast_0},
      ]}>
      <Text
        style={[
          a.text_xs,
          a.font_bold,
          t.atoms.text_contrast_medium,
          styles.heading,
        ]}>
        <Trans>SALAS</Trans>
      </Text>
      <ScrollView>
        {sorted.map(room => {
          const active =
            room.roomId === activeRoomId ||
            (!hasExactMatch &&
              room.kind === 'main' &&
              activeRoomId === mainRoomId)
          const unread = liveUnread?.[room.roomId] ?? room.unread
          return (
            <HoverRow
              key={room.roomId}
              accessibilityRole="button"
              accessibilityLabel={labels[room.kind]}
              accessibilityState={{selected: active}}
              onPress={() => onSelect(room)}
              style={hovered => [
                styles.row,
                (active || hovered) && {
                  backgroundColor:
                    t.palette.primary_500 + (active ? '1f' : '0f'),
                },
              ]}>
              <HashtagIcon
                size="sm"
                style={{
                  color: active
                    ? t.palette.primary_500
                    : t.palette.contrast_500,
                }}
              />
              <Text
                numberOfLines={1}
                style={[
                  a.flex_1,
                  a.text_sm,
                  active ? a.font_bold : a.font_medium,
                  active ? {color: t.palette.primary_600} : t.atoms.text,
                ]}>
                {labels[room.kind]}
              </Text>
              {unread > 0 && !active && (
                <View
                  style={[
                    styles.unread,
                    {backgroundColor: t.palette.primary_500},
                  ]}>
                  <Text style={styles.unreadText}>
                    {unread > 99 ? '99+' : unread}
                  </Text>
                </View>
              )}
            </HoverRow>
          )
        })}
        {sorted.length === 0 && (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, styles.empty]}>
            <Trans>No hay otras salas disponibles.</Trans>
          </Text>
        )}
      </ScrollView>
    </View>
  )
}

function badgeColor(
  t: ReturnType<typeof useTheme>,
  severity: ChatBadge['severity'],
) {
  if (severity === 'critical') return t.palette.negative_500
  if (severity === 'warning') return t.palette.negative_400
  return t.palette.primary_500
}

/**
 * Right panel with the community's members: civic role first, then most
 * recently active. Names and avatars come from the public profiles of the
 * first batch of members; the rest fall back to a shortened DID.
 */
export function ChatMembersPanel({
  members,
  total,
  isModerator,
  presence,
  onOpenMember,
  onOpenAll,
}: {
  members: MemberListItem[]
  total: number
  isModerator: boolean
  /** Live Matrix presence by Matrix user id; falls back to last activity. */
  presence?: Record<string, string>
  onOpenMember: (did: string) => void
  onOpenAll: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  const sorted = useMemo(() => {
    const rank = (m: MemberListItem) =>
      m.participation?.isModerator ? 0 : m.participation?.isDelegate ? 1 : 2
    return [...members].sort((x, y) => {
      const byRole = rank(x) - rank(y)
      if (byRole !== 0) return byRole
      return (
        (Date.parse(y.lastActiveAt ?? '') || 0) -
        (Date.parse(x.lastActiveAt ?? '') || 0)
      )
    })
  }, [members])

  const dids = useMemo(
    () => sorted.slice(0, MAX_PROFILE_LOOKUPS).map(m => m.did),
    [sorted],
  )
  const {data: profileData} = useProfilesQuery({handles: dids})
  const profiles = useMemo(
    () =>
      new Map<string, NonNullable<typeof profileData>['profiles'][number]>(
        (profileData?.profiles ?? []).map(p => [p.did, p]),
      ),
    [profileData],
  )

  const now = Date.now()

  return (
    <View
      style={[
        styles.panel,
        styles.membersPanel,
        {borderLeftColor: t.palette.contrast_100},
        {backgroundColor: t.palette.contrast_0},
      ]}>
      <Text
        style={[
          a.text_xs,
          a.font_bold,
          t.atoms.text_contrast_medium,
          styles.heading,
        ]}>
        <Trans>MIEMBROS — {total}</Trans>
      </Text>
      <ScrollView>
        {sorted.map(member => {
          const profile = profiles.get(member.did)
          const name =
            profile?.displayName || profile?.handle || shortDid(member.did)
          const livePresence = member.matrixUserId
            ? presence?.[member.matrixUserId]
            : undefined
          const online = livePresence
            ? livePresence === 'online'
            : !!member.lastActiveAt &&
              now - Date.parse(member.lastActiveAt) < ONLINE_WINDOW_MS
          const chips = [
            member.participation?.isModerator
              ? {label: _(msg`Moderador`), color: t.palette.primary_500}
              : undefined,
            member.participation?.isDelegate
              ? {label: _(msg`Delegado`), color: t.palette.primary_500}
              : undefined,
            ...member.badges
              .filter(
                b =>
                  b.visibleInChat &&
                  (isModerator ||
                    (b.severity !== 'warning' && b.severity !== 'critical')),
              )
              .slice(0, 2)
              .map(b => ({label: b.label, color: badgeColor(t, b.severity)})),
          ].filter(Boolean) as {label: string; color: string}[]

          return (
            <HoverRow
              key={member.did}
              accessibilityRole="button"
              accessibilityLabel={name}
              onPress={() => onOpenMember(member.did)}
              style={hovered => [
                styles.memberRow,
                hovered && {backgroundColor: t.palette.contrast_50},
              ]}>
              <View>
                <UserAvatar type="user" size={32} avatar={profile?.avatar} />
                {online && (
                  <View
                    style={[
                      styles.onlineDot,
                      {
                        backgroundColor: t.palette.positive_500,
                        borderColor: t.palette.contrast_0,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={[a.flex_1, {minWidth: 0}]}>
                <Text numberOfLines={1} style={[a.text_sm, a.font_medium]}>
                  {name}
                </Text>
                {chips.length > 0 && (
                  <View style={styles.chips}>
                    {chips.map(chip => (
                      <Text
                        key={chip.label}
                        numberOfLines={1}
                        style={[
                          styles.chip,
                          {color: chip.color, borderColor: chip.color + '55'},
                        ]}>
                        {chip.label}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </HoverRow>
          )
        })}
        {sorted.length === 0 && (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, styles.empty]}>
            <Trans>Aún no hay miembros para mostrar.</Trans>
          </Text>
        )}
        {total > sorted.length && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={_(msg`Ver todos los miembros`)}
            onPress={onOpenAll}
            style={styles.viewAll}>
            <Text
              style={[a.text_sm, a.font_bold, {color: t.palette.primary_500}]}>
              <Trans>Ver todos</Trans>
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  )
}

function HoverRow({
  style,
  ...props
}: Omit<PressableProps, 'style'> & {
  style: (hovered: boolean) => StyleProp<ViewStyle>
}) {
  const {state: hovered, onIn, onOut} = useInteractionState()
  return (
    <Pressable
      {...props}
      onHoverIn={onIn}
      onHoverOut={onOut}
      style={style(hovered)}
    />
  )
}

function shortDid(did: string) {
  return did.length > 18 ? `${did.slice(0, 12)}…${did.slice(-4)}` : did
}

const styles = StyleSheet.create({
  panel: {
    width: CHAT_PANEL_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  membersPanel: {
    borderRightWidth: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unread: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2},
  chip: {
    fontSize: 10,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  empty: {paddingHorizontal: 16, paddingVertical: 8},
  viewAll: {paddingHorizontal: 16, paddingVertical: 12},
})
