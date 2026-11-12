import {useMemo, useState} from 'react'
import {Pressable, ScrollView, StyleSheet, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {ROOM_ORDER, ROOM_PURPOSES} from '#/lib/chat/roomPurposes'
import {BridgeAuthError} from '#/lib/matrix/bridge'
import {chatFailureMessage} from '#/lib/matrix/failure'
import {type NavigationProp} from '#/lib/routes/types'
import {
  type CommunityBoardView,
  useCommunityBoardsQuery,
} from '#/state/queries/community-boards'
import {
  type MatrixRoomKind,
  type MatrixRoomSummary,
  useMatrixRoomsQuery,
  useUnreadCountQuery,
} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {atoms as a, useTheme, web} from '#/alf'
import {DARK_SCHEME_LINK_COLOR} from '#/alf/themes'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {type DialogControlProps, useDialogControl} from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon,
  ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon,
} from '#/components/icons/Chevron'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'
import {Eye_Stroke2_Corner0_Rounded as EyeIcon} from '#/components/icons/Eye'
import {Group3_Stroke2_Corner0_Rounded as GroupIcon} from '#/components/icons/Group3'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {
  buildCommunityChatSections,
  type CommunityChatSectionKey,
  communityIdentity,
} from './communityChatOrder'

type RoomsByKind = Map<MatrixRoomKind, MatrixRoomSummary>

// Below these sizes every section stays open and the search field is hidden:
// a short list is faster to scan than to filter.
const SEARCH_THRESHOLD = 6
const COLLAPSE_THRESHOLD = 8

const COLLAPSIBLE: CommunityChatSectionKey[] = [
  'party',
  'ninth',
  'state',
  'other',
]

/**
 * Where a member finds the chats of every community they belong to. The
 * viewer's own party and ninth come first, then anything with unread
 * messages, then the rest by community type. Room purposes are explained once
 * in the info dialog rather than repeated on every community.
 */
export function CommunityChatsScreen() {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const navigation = useNavigation<NavigationProp>()
  const infoControl = useDialogControl()
  const {affiliations} = usePoliticalAffiliation()
  const [query, setQuery] = useState('')
  const [toggled, setToggled] = useState<Set<CommunityChatSectionKey>>(
    () => new Set(),
  )

  const boards = useCommunityBoardsQuery({limit: 100}, !!did)
  const rooms = useMatrixRoomsQuery({enabled: !!did})
  const unread = useUnreadCountQuery({enabled: !!did})
  const bridgeDown = unread.data?.unavailable ?? false

  const roomsByCommunity = useMemo(() => {
    const map = new Map<string, RoomsByKind>()
    for (const room of rooms.data?.rooms ?? []) {
      const byKind = map.get(room.communityUri) ?? new Map()
      byKind.set(room.kind, room)
      map.set(room.communityUri, byKind)
    }
    return map
  }, [rooms.data])

  const unreadByCommunity = useMemo(() => {
    const map = new Map<string, number>()
    for (const room of rooms.data?.rooms ?? []) {
      map.set(
        room.communityUri,
        (map.get(room.communityUri) ?? 0) + room.unread,
      )
    }
    return map
  }, [rooms.data])

  const allSections = useMemo(
    () =>
      buildCommunityChatSections({
        boards: boards.data?.boards ?? [],
        affiliations,
        unreadByCommunity,
      }),
    [boards.data, affiliations, unreadByCommunity],
  )
  const joinedCount = allSections.reduce((n, s) => n + s.boards.length, 0)

  const needle = query.trim().toLowerCase()
  const sections = needle
    ? allSections
        .map(s => ({
          ...s,
          boards: s.boards.filter(b =>
            [b.name, b.region ?? ''].some(v =>
              v.toLowerCase().includes(needle),
            ),
          ),
        }))
        .filter(s => s.boards.length > 0)
    : allSections

  // Type groups start collapsed only in a long list; a tap flips the default.
  const collapsedByDefault = joinedCount > COLLAPSE_THRESHOLD
  const isCollapsed = (key: CommunityChatSectionKey) =>
    !needle &&
    COLLAPSIBLE.includes(key) &&
    collapsedByDefault !== toggled.has(key)
  const toggle = (key: CommunityChatSectionKey) =>
    setToggled(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const sectionLabel: Record<CommunityChatSectionKey, string> = {
    affiliations: l`Tus afiliaciones`,
    unread: l`Con mensajes nuevos`,
    party: l`Partidos`,
    ninth: l`Novenos`,
    state: l`Estados`,
    other: l`Otras comunidades`,
  }

  // Rooms only add chambers and unread counts, so the list renders from the
  // boards alone while the bridge is slow or unavailable.
  const isLoading = boards.isLoading
  const failure = rooms.error ?? boards.error
  const needsIdentity =
    rooms.error instanceof BridgeAuthError && rooms.error.statusCode === 401

  return (
    <Layout.Screen testID="communityChatsScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Chats de comunidades</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <Button
            label={l`Cómo funcionan las salas`}
            size="small"
            color="secondary"
            shape="round"
            onPress={() => infoControl.open()}>
            <ButtonIcon icon={InfoIcon} size="md" />
          </Button>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <Layout.Center style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {(failure || bridgeDown) && (
            <View
              style={[
                a.flex_row,
                a.align_center,
                a.gap_md,
                a.p_md,
                a.mb_lg,
                a.rounded_md,
                t.atoms.bg_contrast_25,
              ]}>
              <Text
                style={[
                  a.flex_1,
                  a.text_sm,
                  a.leading_snug,
                  t.atoms.text_contrast_high,
                ]}>
                {i18n._(chatFailureMessage(failure))}
              </Text>
              <Button
                label={needsIdentity ? l`Conectar identidad` : l`Reintentar`}
                color="secondary"
                size="small"
                onPress={() => {
                  if (needsIdentity) {
                    navigation.navigate('IdentityHub')
                  } else {
                    void rooms.refetch()
                    void boards.refetch()
                    void unread.refetch()
                  }
                }}>
                <ButtonText>
                  {needsIdentity ? (
                    <Trans>Conectar identidad</Trans>
                  ) : (
                    <Trans>Reintentar</Trans>
                  )}
                </ButtonText>
              </Button>
            </View>
          )}

          {joinedCount >= SEARCH_THRESHOLD && (
            <View style={a.mb_lg}>
              <TextField.Root>
                <TextField.Icon icon={SearchIcon} />
                <TextField.Input
                  label={l`Buscar comunidad`}
                  placeholder={l`Buscar comunidad`}
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
              </TextField.Root>
            </View>
          )}

          {isLoading && <LoadingRows />}

          {!isLoading && !boards.error && joinedCount === 0 && (
            <EmptyState
              onBrowse={() => navigation.navigate('Communities')}
              onCreate={() => navigation.navigate('CreateCommunity')}
            />
          )}

          {!isLoading && needle && sections.length === 0 && (
            <Text
              style={[
                a.text_md,
                a.text_center,
                a.py_2xl,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>Ninguna de tus comunidades coincide con “{query}”.</Trans>
            </Text>
          )}

          {sections.map(section => {
            const collapsible = !needle && COLLAPSIBLE.includes(section.key)
            const collapsed = isCollapsed(section.key)
            return (
              <View key={section.key} style={a.mb_xl}>
                <SectionHeader
                  label={sectionLabel[section.key]}
                  count={section.boards.length}
                  collapsible={collapsible}
                  collapsed={collapsed}
                  onToggle={() => toggle(section.key)}
                />
                {!collapsed && (
                  <View
                    style={[
                      a.rounded_lg,
                      a.overflow_hidden,
                      a.border,
                      t.atoms.bg,
                      t.atoms.border_contrast_low,
                    ]}>
                    {section.boards.map((board, index) => (
                      <CommunityRow
                        key={board.uri}
                        board={board}
                        rooms={roomsByCommunity.get(board.uri)}
                        unread={unreadByCommunity.get(board.uri) ?? 0}
                        first={index === 0}
                      />
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      </Layout.Center>

      <RoomsInfoDialog
        control={infoControl}
        onCreate={() => navigation.navigate('CreateCommunity')}
      />
    </Layout.Screen>
  )
}

function SectionHeader({
  label,
  count,
  collapsible,
  collapsed,
  onToggle,
}: {
  label: string
  count: number
  collapsible: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const content = (
    <View style={[a.flex_row, a.align_center, a.gap_xs, a.px_xs, a.pb_sm]}>
      <Text style={[a.text_sm, a.font_semi_bold, t.atoms.text_contrast_high]}>
        {label}
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_low]}>{count}</Text>
      {collapsible && (
        <View style={[a.ml_auto, collapsed && styles.rotated]}>
          <ChevronDownIcon size="sm" style={t.atoms.text_contrast_medium} />
        </View>
      )}
    </View>
  )
  if (!collapsible) return content
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        collapsed ? l`Muestra esta sección` : l`Oculta esta sección`
      }
      accessibilityState={{expanded: !collapsed}}
      onPress={onToggle}
      style={web({cursor: 'pointer'})}>
      {content}
    </Pressable>
  )
}

function CommunityRow({
  board,
  rooms,
  unread,
  first,
}: {
  board: CommunityBoardView
  rooms: RoomsByKind | undefined
  unread: number
  first: boolean
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const hover = useInteractionState()
  const bicameral = board.chamberMode === 'bicameral'
  // The bridge provisions chambers only after the main room has been opened.
  const chambers = ROOM_ORDER.filter(
    kind => kind !== 'main' && rooms?.has(kind),
  )
  const meta = [
    plural(board.memberCount, {one: '# miembro', other: '# miembros'}),
    board.region,
    bicameral ? l`Bicameral` : undefined,
  ]
    .filter(Boolean)
    .join(' · ')

  const open = (roomId?: string) =>
    navigation.navigate('CommunityChat', {
      communityUri: board.uri,
      communityName: board.name,
      roomId,
    })

  return (
    <View
      style={[
        !first && [styles.divider, t.atoms.border_contrast_low],
        hover.state && t.atoms.bg_contrast_25,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread > 0
            ? l`${board.name}, ${unread} mensajes sin leer`
            : board.name
        }
        accessibilityHint={l`Abre la sala principal`}
        onPress={() => open(rooms?.get('main')?.roomId || undefined)}
        onHoverIn={hover.onIn}
        onHoverOut={hover.onOut}
        style={[
          a.flex_row,
          a.align_center,
          a.gap_md,
          a.px_md,
          a.pt_md,
          bicameral ? a.pb_sm : a.pb_md,
          web({cursor: 'pointer'}),
        ]}>
        <CommunityAvatar board={board} />
        <View style={[a.flex_1, styles.minZero]}>
          <Text
            emoji
            numberOfLines={1}
            style={[a.text_md, unread > 0 ? a.font_bold : a.font_semi_bold]}>
            {board.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[a.text_sm, a.pt_2xs, t.atoms.text_contrast_medium]}>
            {meta}
          </Text>
        </View>
        {unread > 0 ? (
          <UnreadPill count={unread} />
        ) : (
          <ChevronRightIcon size="sm" style={t.atoms.text_contrast_low} />
        )}
      </Pressable>

      {bicameral && (
        <View
          style={[styles.rooms, a.flex_row, a.flex_wrap, a.gap_xs, a.pb_md]}>
          {chambers.length === 0 ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>Las cámaras se activan al abrir la sala principal.</Trans>
            </Text>
          ) : (
            chambers.map(kind => {
              const room = rooms!.get(kind)!
              const label = i18n._(ROOM_PURPOSES[kind].label)
              return (
                <Button
                  key={kind}
                  label={
                    room.unread > 0
                      ? l`${label}, ${room.unread} mensajes sin leer`
                      : label
                  }
                  accessibilityHint={i18n._(ROOM_PURPOSES[kind].purpose)}
                  size="tiny"
                  color={room.unread > 0 ? 'primary_subtle' : 'secondary'}
                  onPress={() => open(room.roomId)}>
                  <ButtonIcon
                    icon={kind === 'observers' ? EyeIcon : HashtagIcon}
                  />
                  <ButtonText>
                    {room.unread > 0
                      ? `${label} · ${room.unread > 99 ? '99+' : room.unread}`
                      : label}
                  </ButtonText>
                </Button>
              )
            })
          )}
        </View>
      )}
    </View>
  )
}

const AVATAR = 44

export function CommunityAvatar({
  board,
  size = AVATAR,
}: {
  board: CommunityBoardView
  size?: number
}) {
  const t = useTheme()
  const identity = communityIdentity(board)
  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor:
            identity.background ??
            (t.scheme === 'dark'
              ? DARK_SCHEME_LINK_COLOR + '29'
              : t.palette.primary_500 + '1F'),
        },
      ]}>
      <Text
        style={[
          a.font_bold,
          {
            fontSize: size * 0.42,
            lineHeight: size * 0.5,
            color:
              identity.foreground ??
              (t.scheme === 'dark'
                ? DARK_SCHEME_LINK_COLOR
                : t.palette.primary_600),
          },
        ]}>
        {identity.monogram}
      </Text>
    </View>
  )
}

function UnreadPill({count}: {count: number}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        a.rounded_full,
        styles.pill,
        {backgroundColor: t.palette.primary_500},
      ]}>
      <Text style={[a.text_xs, a.font_bold, {color: t.palette.white}]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  )
}

function LoadingRows() {
  const t = useTheme()
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[a.rounded_lg, a.border, t.atoms.border_contrast_low]}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[
            a.flex_row,
            a.align_center,
            a.gap_md,
            a.p_md,
            i > 0 && [styles.divider, t.atoms.border_contrast_low],
          ]}>
          <View
            style={[
              {width: AVATAR, height: AVATAR, borderRadius: AVATAR * 0.3},
              t.atoms.bg_contrast_50,
            ]}
          />
          <View style={[a.flex_1, a.gap_sm]}>
            <View
              style={[
                styles.skeletonTitle,
                a.rounded_xs,
                t.atoms.bg_contrast_50,
              ]}
            />
            <View
              style={[
                styles.skeletonMeta,
                a.rounded_xs,
                t.atoms.bg_contrast_25,
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  )
}

function EmptyState({
  onBrowse,
  onCreate,
}: {
  onBrowse: () => void
  onCreate: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <View style={[a.align_center, a.px_xl, a.py_3xl, a.gap_md]}>
      <View
        style={[
          a.align_center,
          a.justify_center,
          a.rounded_full,
          styles.emptyIcon,
          {backgroundColor: t.palette.primary_500 + '1A'},
        ]}>
        <GroupIcon size="xl" style={{color: t.palette.primary_500}} />
      </View>
      <Text style={[a.text_xl, a.font_bold, a.text_center]}>
        <Trans>Aún no estás en ninguna comunidad</Trans>
      </Text>
      <Text
        style={[
          a.text_md,
          a.text_center,
          a.leading_snug,
          t.atoms.text_contrast_medium,
        ]}>
        <Trans>
          Cada comunidad trae su propia sala de chat. Únete a una o crea la tuya
          para empezar a conversar.
        </Trans>
      </Text>
      <View style={[a.flex_row, a.gap_sm, a.pt_sm]}>
        <Button
          label={l`Explorar comunidades`}
          size="small"
          color="primary"
          onPress={onBrowse}>
          <ButtonText>
            <Trans>Explorar comunidades</Trans>
          </ButtonText>
        </Button>
        <Button
          label={l`Crear comunidad`}
          size="small"
          color="secondary"
          onPress={onCreate}>
          <ButtonText>
            <Trans>Crear comunidad</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

function RoomsInfoDialog({
  control,
  onCreate,
}: {
  control: DialogControlProps
  onCreate: () => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={l`Cómo funcionan las salas`}
        style={web({maxWidth: 440})}>
        <Text style={[a.text_xl, a.font_bold, a.pb_xs]}>
          <Trans>Salas de una comunidad</Trans>
        </Text>
        <Text
          style={[
            a.text_sm,
            a.leading_snug,
            a.pb_lg,
            t.atoms.text_contrast_medium,
          ]}>
          <Trans>
            Las salas nacen con la comunidad y cada una tiene un propósito fijo.
            Toda comunidad tiene sala principal; las bicamerales suman dos
            cámaras y un consejo observador.
          </Trans>
        </Text>
        <View style={[a.gap_md, a.pb_lg]}>
          {ROOM_ORDER.map(kind => (
            <View key={kind} style={[a.flex_row, a.gap_md, a.align_start]}>
              <View
                style={[
                  a.align_center,
                  a.justify_center,
                  a.rounded_sm,
                  styles.infoIcon,
                  t.atoms.bg_contrast_25,
                ]}>
                {kind === 'observers' ? (
                  <EyeIcon size="sm" style={t.atoms.text_contrast_high} />
                ) : (
                  <HashtagIcon size="sm" style={t.atoms.text_contrast_high} />
                )}
              </View>
              <View style={[a.flex_1]}>
                <Text style={[a.text_sm, a.font_semi_bold]}>
                  {i18n._(ROOM_PURPOSES[kind].label)}
                </Text>
                <Text
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {i18n._(ROOM_PURPOSES[kind].purpose)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View
          style={[
            a.p_md,
            a.rounded_md,
            a.gap_xs,
            a.mb_lg,
            t.atoms.bg_contrast_25,
          ]}>
          <Text style={[a.text_sm, a.font_semi_bold]}>
            <Trans>¿Cómo se crea un grupo de chat?</Trans>
          </Text>
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>
              No hay grupos sueltos: crea una comunidad y abre su sala
              principal. Si es bicameral, las demás salas aparecen aquí en
              cuanto estén listas.
            </Trans>
          </Text>
        </View>
        <Button
          label={l`Crear comunidad`}
          size="medium"
          color="primary"
          onPress={() => control.close(onCreate)}>
          <ButtonText>
            <Trans>Crear comunidad</Trans>
          </ButtonText>
        </Button>
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  minZero: {minWidth: 0},
  content: {padding: 16, paddingBottom: 100},
  divider: {borderTopWidth: StyleSheet.hairlineWidth},
  // Chips line up with the community name, past the avatar and its gap.
  rooms: {paddingLeft: 12 + AVATAR + 12, paddingRight: 12},
  rotated: {transform: [{rotate: '-90deg'}]},
  pill: {minWidth: 22, height: 22, paddingHorizontal: 7},
  skeletonTitle: {height: 14, width: '55%'},
  skeletonMeta: {height: 10, width: '35%'},
  emptyIcon: {width: 72, height: 72},
  infoIcon: {width: 32, height: 32},
})
