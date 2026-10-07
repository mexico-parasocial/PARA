import {useMemo} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {useLingui} from '@lingui/react'
import {msg, Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {ROOM_ORDER, ROOM_PURPOSES} from '#/lib/chat/roomPurposes'
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
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {classifyCommunityBoard} from '../Communities/communityGrouping'

type Group = 'party' | 'ninth' | 'state' | 'other'
const GROUP_ORDER: Group[] = ['party', 'ninth', 'state', 'other']

/**
 * Where a member finds the chats of every community they belong to. Each
 * community lists its rooms by purpose, so "Cámara A" and "Consejo observador"
 * read as different places rather than as copies of one chat.
 */
export function CommunityChatsScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const did = currentAccount?.did

  const boards = useCommunityBoardsQuery({limit: 100}, !!did)
  const rooms = useMatrixRoomsQuery({enabled: !!did})
  const unread = useUnreadCountQuery({enabled: !!did})
  const bridgeDown = unread.data?.unavailable ?? false

  const roomsByCommunity = useMemo(() => {
    const map = new Map<string, Map<MatrixRoomKind, MatrixRoomSummary>>()
    for (const room of rooms.data?.rooms ?? []) {
      const byKind = map.get(room.communityUri) ?? new Map()
      byKind.set(room.kind, room)
      map.set(room.communityUri, byKind)
    }
    return map
  }, [rooms.data])

  const sections = useMemo(() => {
    const joined = (boards.data?.boards ?? []).filter(
      board => board.viewerMembershipState === 'active',
    )
    return GROUP_ORDER.map(group => ({
      group,
      boards: joined
        .filter(board => classifyCommunityBoard(board).group === group)
        .sort((x, y) => x.name.localeCompare(y.name)),
    })).filter(section => section.boards.length > 0)
  }, [boards.data])

  const sectionLabel: Record<Group, string> = {
    party: _(msg`Partidos`),
    ninth: _(msg`Novenos`),
    state: _(msg`Estados`),
    other: _(msg`Otras comunidades`),
  }

  const isLoading = boards.isLoading || rooms.isLoading

  return (
    <Layout.Screen testID="communityChatsScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Chats de comunidades</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          {bridgeDown && (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.pb_md]}>
              <Trans>
                No se pudo conectar con el chat de comunidades. Las salas se
                abrirán cuando el servicio esté disponible.
              </Trans>
            </Text>
          )}

          {isLoading && (
            <View style={[a.align_center, a.py_xl]}>
              <Loader size="lg" />
            </View>
          )}

          {!isLoading && sections.length === 0 && (
            <Text style={[a.text_md, t.atoms.text_contrast_medium, a.py_lg]}>
              <Trans>
                Aún no perteneces a ninguna comunidad. Únete a una para ver sus
                chats aquí.
              </Trans>
            </Text>
          )}

          {sections.map(section => (
            <View key={section.group} style={styles.section}>
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  t.atoms.text_contrast_medium,
                  styles.sectionLabel,
                ]}>
                {sectionLabel[section.group].toUpperCase()}
              </Text>
              {section.boards.map(board => (
                <CommunityCard
                  key={board.uri}
                  board={board}
                  rooms={roomsByCommunity.get(board.uri)}
                />
              ))}
            </View>
          ))}

          <HowToCreate />
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

function CommunityCard({
  board,
  rooms,
}: {
  board: CommunityBoardView
  rooms: Map<MatrixRoomKind, MatrixRoomSummary> | undefined
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const bicameral = board.chamberMode === 'bicameral'
  // A unicameral community has only its main room; a bicameral one also has
  // both chambers and the observer council.
  const kinds = ROOM_ORDER.filter(kind => kind === 'main' || bicameral)
  const subtitle = [
    `${board.memberCount} ${_(msg`miembros`)}`,
    board.region,
    bicameral ? _(msg`Bicameral`) : _(msg`Unicameral`),
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
      style={[styles.card, t.atoms.bg, {borderColor: t.palette.contrast_100}]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.avatar,
            {backgroundColor: t.palette.primary_500 + '20'},
          ]}>
          <Text
            style={[a.text_lg, a.font_bold, {color: t.palette.primary_600}]}>
            {board.name.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={[a.flex_1, styles.minZero]}>
          <Text numberOfLines={1} style={[a.text_md, a.font_semi_bold]}>
            {board.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {subtitle}
          </Text>
        </View>
      </View>

      {kinds.map(kind => {
        const room = rooms?.get(kind)
        // Chamber rooms exist only once the bridge has provisioned them.
        const available = kind === 'main' || !!room
        const count = room?.unread ?? 0
        return (
          <Button
            key={kind}
            label={i18n._(ROOM_PURPOSES[kind].label)}
            accessibilityHint={i18n._(ROOM_PURPOSES[kind].purpose)}
            disabled={!available}
            onPress={() => open(room?.roomId || undefined)}
            variant="ghost"
            color="secondary"
            size="small"
            style={styles.roomButton}>
            <View style={styles.roomRow}>
              <HashtagIcon
                size="sm"
                style={[t.atoms.text_contrast_medium, styles.roomIcon]}
              />
              <View style={[a.flex_1, styles.minZero]}>
                <Text
                  numberOfLines={1}
                  style={[
                    a.text_sm,
                    count > 0 ? a.font_bold : a.font_medium,
                    !available && t.atoms.text_contrast_medium,
                  ]}>
                  {i18n._(ROOM_PURPOSES[kind].label)}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {available
                    ? i18n._(ROOM_PURPOSES[kind].purpose)
                    : _(msg`Se activa al abrir la sala principal.`)}
                </Text>
              </View>
              {count > 0 && (
                <View
                  style={[
                    styles.badge,
                    {backgroundColor: t.palette.primary_500},
                  ]}>
                  <Text style={[a.text_xs, a.font_bold, styles.badgeText]}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </View>
          </Button>
        )
      })}
    </View>
  )
}

function HowToCreate() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.palette.primary_500 + '12',
          borderColor: t.palette.primary_500 + '33',
        },
      ]}>
      <Text style={[a.text_md, a.font_bold, {color: t.palette.primary_600}]}>
        <Trans>¿Cómo se crea un grupo de chat?</Trans>
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.pt_sm]}>
        <Trans>
          Los grupos de chat nacen con la comunidad y cada uno tiene un
          propósito fijo. Al crear una comunidad se abre su sala principal. Si
          la comunidad es bicameral, también se crean la Cámara A, la Cámara B y
          el Consejo observador.
        </Trans>
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.pt_sm]}>
        <Trans>
          1. Crea la comunidad. 2. Abre su sala principal: eso une tu cuenta al
          chat. 3. Las demás salas aparecen aquí en cuanto estén disponibles.
        </Trans>
      </Text>
      <View style={a.pt_md}>
        <Button
          label="Crear comunidad"
          size="small"
          color="primary"
          onPress={() => navigation.navigate('CreateCommunity')}>
          <ButtonText>
            <Trans>Crear comunidad</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  minZero: {minWidth: 0},
  content: {padding: 16, paddingBottom: 100, gap: 8},
  section: {gap: 8, marginBottom: 8},
  sectionLabel: {letterSpacing: 0.6, paddingTop: 8},
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomButton: {justifyContent: 'flex-start', height: 'auto', minHeight: 44},
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 4,
  },
  roomIcon: {marginTop: 2},
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: '#fff'},
})
