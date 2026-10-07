import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {type ListRenderItem, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useAppState} from '#/lib/appState'
import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {useRequireEmailVerification} from '#/lib/hooks/useRequireEmailVerification'
import {
  type MessagesTabNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {listenSoftReset} from '#/state/events'
import {MESSAGE_SCREEN_POLL_INTERVAL} from '#/state/messages/convo/const'
import {useMessagesEventBus} from '#/state/messages/events'
import {useCommunityBoardsQuery} from '#/state/queries/community-boards'
import {useMatrixRoomsQuery, useUnreadCountQuery} from '#/state/queries/matrix'
import {useChatActorStatusQuery} from '#/state/queries/messages/get-status'
import {useUnreadCountsQuery} from '#/state/queries/messages/get-unread-counts'
import {useListConvosQuery} from '#/state/queries/messages/list-conversations'
import {useUpdateAllRead} from '#/state/queries/messages/update-all-read'
import {useSession} from '#/state/session'
import {EmptyState} from '#/view/com/util/EmptyState'
import {List, type ListRef} from '#/view/com/util/List'
import {ChatListLoadingPlaceholder} from '#/view/com/util/LoadingPlaceholder'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {AgeRestrictedScreen} from '#/components/ageAssurance/AgeRestrictedScreen'
import {useAgeAssuranceCopy} from '#/components/ageAssurance/useAgeAssuranceCopy'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {type DialogControlProps, useDialogControl} from '#/components/Dialog'
import {NewChat} from '#/components/dms/dialogs/NewChatDialog'
import {useRefreshOnFocus} from '#/components/hooks/useRefreshOnFocus'
import {ArrowRotateCounterClockwise_Stroke2_Corner0_Rounded as RetryIcon} from '#/components/icons/ArrowRotate'
import {BubbleSmile_Stroke2_Corner2_Rounded_Large as BubbleSmileIcon} from '#/components/icons/Bubble'
import {CircleCheck_Stroke2_Corner0_Rounded as CircleCheckIcon} from '#/components/icons/CircleCheck'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfoIcon} from '#/components/icons/CircleInfo'
import {Group3_Stroke2_Corner0_Rounded as CommunitiesIcon} from '#/components/icons/Group'
import {
  Inbox_Stroke2_Corner2_Rounded as InboxIcon,
  Inbox_Stroke2_Corner2_Rounded_Large as InboxLargeIcon,
} from '#/components/icons/Inbox'
import {
  MessagePlus_Stroke2_Corner0_Rounded as MessagePlusIcon,
  MessagePlus_Stroke2_Corner0_Rounded as NewChatIcon,
} from '#/components/icons/Message'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/SettingsGear2'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {ListFooter} from '#/components/Lists'
import * as Menu from '#/components/Menu'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {useAgeAssurance} from '#/ageAssurance'
import {IS_NATIVE, IS_WEB} from '#/env'
import {chat} from '#/lexicons'
import {AgentSelection} from './components/AgentSelection'
import {ChatDisabled} from './components/ChatDisabled'
import {ChatListItem} from './components/ChatListItem'
import {CommunityStrip, type CommunityTile} from './components/CommunityStrip'
import {InboxRequests} from './components/InboxRequests'
import {useIsWithinSplitView} from './components/splitView/context'

type ChatStatus = chat.bsky.actor.getStatus.$OutputBody

type ListItem =
  | {
      type: 'SECTION'
      label: string
    }
  | {
      type: 'AGENT_SELECTION'
    }
  | {
      type: 'CONVERSATION'
      conversation: chat.bsky.convo.defs.ConvoView
      selected: boolean
    }
  | {
      type: 'MATRIX_ROOM'
      roomId: string
      communityUri: string
      slug: string
      unread: number
      kind: 'main' | 'chamber-a' | 'chamber-b' | 'observers'
      name?: string
      memberCount?: number
      region?: string
    }
  | {
      type: 'COMMUNITY_STRIP'
      communities: CommunityTile[]
    }
  | {
      type: 'MATRIX_UNAVAILABLE'
    }

function renderItem({item}: {item: ListItem}) {
  switch (item.type) {
    case 'SECTION':
      return <SectionHeader label={item.label} />
    case 'AGENT_SELECTION':
      return <AgentSelection />
    case 'CONVERSATION':
      return <ChatListItem convo={item.conversation} selected={item.selected} />
    case 'MATRIX_ROOM':
      return <ChatListItem type="matrix-room" room={item} />
    case 'COMMUNITY_STRIP':
      return <CommunityStrip communities={item.communities} />
    case 'MATRIX_UNAVAILABLE':
      return <MatrixUnavailableNotice />
  }
}

function keyExtractor(item: ListItem) {
  switch (item.type) {
    case 'SECTION':
      return `SECTION:${item.label}`
    case 'AGENT_SELECTION':
      return 'AGENT_SELECTION'
    case 'CONVERSATION':
      return item.conversation.id
    case 'MATRIX_ROOM':
      return `MATRIX_ROOM:${item.roomId || item.communityUri}`
    case 'COMMUNITY_STRIP':
      return 'COMMUNITY_STRIP'
    case 'MATRIX_UNAVAILABLE':
      return 'MATRIX_UNAVAILABLE'
  }
}

type Props = NativeStackScreenProps<MessagesTabNavigatorParams, 'Messages'>

export function MessagesScreen(props: Props) {
  const {t: l} = useLingui()
  const aaCopy = useAgeAssuranceCopy()
  const aa = useAgeAssurance()

  return (
    <AgeRestrictedScreen
      screenTitle={l`Chats`}
      infoText={aaCopy.chatsInfoText}
      rightHeaderSlot={
        aa.flags.chatDisabled ? null : (
          <Link
            to="/messages/settings"
            label={l`Chat settings`}
            size="small"
            color="secondary">
            <ButtonText>
              <Trans>Chat settings</Trans>
            </ButtonText>
          </Link>
        )
      }>
      <MessagesScreenInner {...props} />
    </AgeRestrictedScreen>
  )
}

export function MessagesScreenInner({navigation, route}: Props) {
  const {isWithinSplitView} = useIsWithinSplitView()
  const {t: l} = useLingui()
  const t = useTheme()
  const newChatControl = useDialogControl()
  const {data: chatStatus} = useChatActorStatusQuery()
  const pushToConversation = route.params?.pushToConversation
  const pushToNewGroupChat = route.params?.pushToNewGroupChat
  // Tracks whether the next new-chat dialog open should start directly on the
  // group-chat creation step. Set when deep-linked via `pushToNewGroupChat`,
  // and reset to `false` whenever the dialog is opened through the normal FAB/
  // button path so it never gets stuck in group mode.
  const [startNewChatInGroupChat, setStartNewChatInGroupChat] = useState(false)

  useEffect(() => {
    if (pushToConversation) {
      navigation.navigate('MessagesConversation', {
        conversation: pushToConversation,
      })
      navigation.setParams({pushToConversation: undefined})
    }
  }, [navigation, pushToConversation])

  const messagesBus = useMessagesEventBus()
  const state = useAppState()
  const isActive = state === 'active'

  useFocusEffect(
    useCallback(() => {
      if (isActive) {
        const unsub = messagesBus.requestPollInterval(
          MESSAGE_SCREEN_POLL_INTERVAL,
        )
        return () => unsub()
      }
    }, [messagesBus, isActive]),
  )

  const onNewChat = useCallback(
    (conversation: string) =>
      navigation.navigate('MessagesConversation', {conversation}),
    [navigation],
  )

  const openChatControl = useCallback(() => {
    setStartNewChatInGroupChat(false)
    newChatControl.open()
  }, [newChatControl])

  const requireEmailVerification = useRequireEmailVerification()
  const wrappedOpenChatControl = requireEmailVerification(openChatControl, {
    instructions: [
      <Trans key="new-chat">
        Before you can message another user, you must first verify your email.
      </Trans>,
    ],
  })

  // Deep link into the group-chat creation step of the new-chat dialog. Mirrors
  // the `pushToConversation` pattern: open the dialog (respecting the same
  // email-verification gating as the normal new-chat button) starting directly
  // in group mode, then clear the param so it can fire again later.
  const openGroupChatControl = useCallback(() => {
    setStartNewChatInGroupChat(true)
    newChatControl.open()
  }, [newChatControl])
  const wrappedOpenGroupChatControl = requireEmailVerification(
    openGroupChatControl,
    {
      instructions: [
        <Trans key="new-group-chat">
          Before you can message another user, you must first verify your email.
        </Trans>,
      ],
    },
  )
  // Stable reference to the (otherwise per-render) opener so the effect below
  // doesn't list it as a dependency - if it did, clearing the param would
  // re-run the effect and its cleanup would cancel the pending open.
  const openGroupChat = useNonReactiveCallback(wrappedOpenGroupChatControl)
  // Deep link into the group-chat creation step of the new-chat dialog. The
  // dialog control isn't attached synchronously when navigating onto this
  // screen, so defer the open by a tick. We clear the param *after* opening
  // (inside the timeout) so clearing doesn't cancel the pending open.
  useEffect(() => {
    if (!pushToNewGroupChat) return
    const timeout = setTimeout(() => {
      openGroupChat()
      if (IS_WEB) {
        // `navigation.setParams({pushToNewGroupChat: undefined})` serializes the
        // literal string "undefined" into the query on web (see router build()),
        // so strip the param with the history API instead.
        const url = new URL(window.location.href)
        url.searchParams.delete('pushToNewGroupChat')
        history.replaceState(null, '', url.pathname + url.search + url.hash)
      } else {
        navigation.setParams({pushToNewGroupChat: undefined})
      }
    }, 100)
    return () => clearTimeout(timeout)
  }, [navigation, pushToNewGroupChat, openGroupChat])

  if (isWithinSplitView) {
    return (
      <>
        <EmptyState
          message={l`Say hi to someone`}
          icon={BubbleSmileIcon}
          textStyle={t.atoms.text}
          iconColor={t.atoms.text.color}
          iconSize="4xl"
          button={
            chatStatus?.chatDisabled
              ? undefined
              : {
                  label: l`New chat`,
                  text: l`New chat`,
                  onPress: wrappedOpenChatControl,
                  size: 'small',
                  color: 'primary',
                  icon: MessagePlusIcon,
                }
          }
          style={[a.h_full, a.justify_center, a.pb_5xl]}
        />
        <NewChat
          onNewChat={onNewChat}
          control={newChatControl}
          startInGroupChat={startNewChatInGroupChat}
          onClose={() => setStartNewChatInGroupChat(false)}
        />
      </>
    )
  }

  return (
    <Layout.Screen testID="messagesScreen">
      <Header newChatControl={newChatControl} chatStatus={chatStatus} />
      <ChatList newChatControl={newChatControl} chatStatus={chatStatus} />
      <NewChat
        onNewChat={onNewChat}
        control={newChatControl}
        startInGroupChat={startNewChatInGroupChat}
        onClose={() => setStartNewChatInGroupChat(false)}
      />
    </Layout.Screen>
  )
}

export function ChatList({
  selectedChat,
  newChatControl,
  chatStatus,
}: {
  selectedChat?: string
  newChatControl: DialogControlProps
  chatStatus?: ChatStatus
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const aa = useAgeAssurance()
  const scrollElRef: ListRef = useRef(null)
  const {isWithinSplitView} = useIsWithinSplitView()

  const openChatControl = useCallback(() => {
    newChatControl.open()
  }, [newChatControl])

  const requireEmailVerification = useRequireEmailVerification()
  const wrappedOpenChatControl = requireEmailVerification(openChatControl, {
    instructions: [
      <Trans key="new-chat">
        Before you can message another user, you must first verify your email.
      </Trans>,
    ],
  })

  const initialNumToRender = useInitialNumToRender({minItemHeight: 80})
  const [isPTRing, setIsPTRing] = useState(false)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
    refetch,
  } = useListConvosQuery({
    status: 'accepted',
    kind: aa.flags.groupChatDisabled ? 'direct' : 'all',
  })

  const {refetch: refetchInbox} = useListConvosQuery({
    status: 'request',
    kind: aa.flags.groupChatDisabled ? 'direct' : 'all',
  })

  const {
    data: matrixRoomsData,
    isLoading: isLoadingMatrixRooms,
    refetch: refetchMatrixRooms,
  } = useMatrixRoomsQuery({enabled: !!currentAccount?.did})

  // A community's Matrix room only exists for the bridge once the member has
  // opened its chat, so list every joined community, not just bridged rooms.
  const {data: boardsData, isLoading: isLoadingBoards} =
    useCommunityBoardsQuery({limit: 100}, !!currentAccount?.did)

  const {data: matrixUnreadData} = useUnreadCountQuery({
    enabled: !!currentAccount?.did,
  })
  const matrixUnavailable = matrixUnreadData?.unavailable ?? false

  useRefreshOnFocus(refetch)
  useRefreshOnFocus(refetchInbox)

  const listItems = useMemo(() => {
    const items: ListItem[] = []

    const bridgedRooms = matrixUnavailable ? [] : (matrixRoomsData?.rooms ?? [])
    const boards = new Map(
      (boardsData?.boards ?? [])
        .filter(board => board.viewerMembershipState === 'active')
        .map(board => [board.uri, board]),
    )

    // One row per community. Its individual rooms (chambers, observers) live
    // on the community chats screen, so the list shows the main room and the
    // community's total unread.
    const byCommunity = new Map<string, typeof bridgedRooms>()
    for (const room of bridgedRooms) {
      byCommunity.set(room.communityUri, [
        ...(byCommunity.get(room.communityUri) ?? []),
        room,
      ])
    }
    const communityRows = [
      ...[...byCommunity.entries()].map(([uri, rooms]) => {
        const main = rooms.find(room => room.kind === 'main') ?? rooms[0]
        const board = boards.get(uri)
        return {
          type: 'MATRIX_ROOM' as const,
          roomId: main.roomId,
          communityUri: uri,
          slug: main.slug,
          unread: rooms.reduce((sum, room) => sum + room.unread, 0),
          kind: main.kind,
          name: board?.name,
          memberCount: board?.memberCount,
          region: board?.region || undefined,
        }
      }),
      // No room yet: opening the chat joins the community's space.
      ...[...boards.values()]
        .filter(board => !byCommunity.has(board.uri))
        .map(board => ({
          type: 'MATRIX_ROOM' as const,
          roomId: '',
          communityUri: board.uri,
          slug: board.name,
          unread: 0,
          kind: 'main' as const,
          name: board.name,
          memberCount: board.memberCount,
          region: board.region || undefined,
        })),
    ].sort(
      (x, y) =>
        y.unread - x.unread ||
        (x.name ?? x.slug).localeCompare(y.name ?? y.slug),
    )

    if (matrixUnavailable || communityRows.length) {
      // The strip carries its own collapsible "Comunidades" header.
      if (matrixUnavailable || !communityRows.length) {
        items.push({type: 'SECTION', label: l`Comunidades`})
      }
      if (matrixUnavailable) items.push({type: 'MATRIX_UNAVAILABLE'})
      if (communityRows.length) {
        items.push({
          type: 'COMMUNITY_STRIP',
          communities: communityRows.map(row => ({
            communityUri: row.communityUri,
            roomId: row.roomId,
            name: row.name ?? row.slug,
            unread: row.unread,
          })),
        })
      }
    }

    items.push({type: 'AGENT_SELECTION'})

    if (data?.pages) {
      const convos = data.pages.flatMap(page => page.convos)

      if (convos.length) {
        items.push({type: 'SECTION', label: l`Mensajes directos`})
        items.push(
          ...convos.map(convo => ({
            type: 'CONVERSATION' as const,
            conversation: convo,
            selected: convo.id === selectedChat,
          })),
        )
      }
    }

    return items
  }, [data, l, matrixRoomsData, matrixUnavailable, selectedChat, boardsData])

  const hasListContent = listItems.some(
    item => item.type === 'CONVERSATION' || item.type === 'COMMUNITY_STRIP',
  )

  const onRefresh = useCallback(async () => {
    setIsPTRing(true)
    try {
      await Promise.all([
        refetch(),
        refetchInbox(),
        currentAccount?.did ? refetchMatrixRooms() : Promise.resolve(),
      ])
    } catch (err) {
      logger.error('Failed to refresh conversations', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
    setIsPTRing(false)
  }, [currentAccount, refetch, refetchInbox, refetchMatrixRooms])

  const onEndReached = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage || isError) return

    try {
      await fetchNextPage()
    } catch (err) {
      logger.error('Failed to load more conversations', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }, [isFetchingNextPage, hasNextPage, isError, fetchNextPage])

  const onSoftReset = useCallback(async () => {
    scrollElRef.current?.scrollToOffset({
      animated: IS_NATIVE,
      offset: 0,
    })

    try {
      await Promise.all([
        refetch(),
        currentAccount?.did ? refetchMatrixRooms() : Promise.resolve(),
      ])
    } catch (err) {
      logger.error('Failed to refresh conversations', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }, [currentAccount, scrollElRef, refetch, refetchMatrixRooms])

  const isScreenFocused = useIsFocused()
  useEffect(() => {
    if (!isScreenFocused) {
      return
    }

    return listenSoftReset(() => void onSoftReset())
  }, [onSoftReset, isScreenFocused])

  if (!hasListContent) {
    return (
      <Layout.Center style={web({minHeight: '100%'})}>
        {isLoading || isLoadingMatrixRooms || isLoadingBoards ? (
          <ChatListLoadingPlaceholder />
        ) : (
          <ChatListEmptyState
            isError={isError}
            error={error}
            isWithinSplitView={isWithinSplitView}
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onRetry={refetch}
            onNewChat={wrappedOpenChatControl}
            chatDisabled={!!chatStatus?.chatDisabled}
          />
        )}
      </Layout.Center>
    )
  }

  return (
    <List
      ref={scrollElRef}
      data={listItems}
      renderItem={renderItem as ListRenderItem<unknown>}
      keyExtractor={keyExtractor as (item: unknown, index: number) => string}
      refreshing={isPTRing}
      onRefresh={() => void onRefresh()}
      onEndReached={() => void onEndReached()}
      ListHeaderComponent={
        chatStatus?.chatDisabled ? (
          <ChatDisabled shape="banner" style={[isWithinSplitView && a.mb_sm]} />
        ) : undefined
      }
      ListFooterComponent={
        <ListFooter
          isFetchingNextPage={isFetchingNextPage}
          error={cleanError(error)}
          onRetry={fetchNextPage}
          style={{borderColor: 'transparent'}}
          hasNextPage={hasNextPage}
        />
      }
      onEndReachedThreshold={IS_NATIVE ? 1.5 : 0}
      initialNumToRender={initialNumToRender}
      windowSize={11}
      desktopFixedHeight
      sideBorders={false}
      disableFullWindowScroll={isWithinSplitView}
      style={
        isWithinSplitView
          ? [
              a.w_full,
              web({
                scrollbarWidth: 'thin',
                scrollbarColor: `${t.palette.contrast_100} transparent`,
              }),
            ]
          : undefined
      }
      contentContainerStyle={
        isWithinSplitView && !chatStatus?.chatDisabled && a.py_sm
      }
    />
  )
}

function ChatListEmptyState({
  isError,
  error,
  isWithinSplitView,
  onRetry,
  onNewChat,
  chatDisabled,
}: {
  isError: boolean
  error: Error | null
  isWithinSplitView: boolean
  onRetry: () => void
  onNewChat: () => void
  chatDisabled: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()

  if (isError) {
    return (
      <View style={[a.pt_3xl, a.align_center]}>
        <CircleInfoIcon width={48} fill={t.atoms.text_contrast_low.color} />
        <Text style={[a.pt_md, a.pb_sm, a.text_2xl, a.font_semi_bold]}>
          <Trans>Whoops!</Trans>
        </Text>
        <Text
          style={[
            a.text_md,
            a.pb_xl,
            a.text_center,
            a.leading_snug,
            t.atoms.text_contrast_medium,
            {maxWidth: 360},
          ]}>
          {cleanError(error) || l`Failed to load conversations`}
        </Text>

        <Button
          label={l`Reload conversations`}
          size="small"
          color="secondary_inverted"
          onPress={() => void onRetry()}>
          <ButtonText>
            <Trans>Retry</Trans>
          </ButtonText>
          <ButtonIcon icon={RetryIcon} />
        </Button>
      </View>
    )
  }

  if (isWithinSplitView) {
    return (
      <EmptyState
        message={l`Inbox empty`}
        icon={InboxLargeIcon}
        iconSize="4xl"
        textStyle={t.atoms.text}
        iconColor={t.atoms.text.color}
        style={web([a.h_full, a.justify_center, {paddingBottom: 120}])}
      />
    )
  }

  return (
    <EmptyState
      message={l`Say hi to someone`}
      icon={BubbleSmileIcon}
      textStyle={t.atoms.text}
      iconColor={t.atoms.text.color}
      iconSize="4xl"
      button={
        chatDisabled
          ? undefined
          : {
              label: l`New chat`,
              text: l`New chat`,
              onPress: onNewChat,
              size: 'small',
              color: 'primary',
              icon: MessagePlusIcon,
            }
      }
      style={[a.h_full, {paddingTop: '20%'}]}
    />
  )
}

/**
 * The bridge being unreachable used to render as an empty Comunidades section
 * and a zero badge — visually identical to "you are caught up". Say it instead.
 */
function MatrixUnavailableNotice() {
  const t = useTheme()

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.gap_sm,
        a.px_lg,
        a.py_md,
        {backgroundColor: t.palette.contrast_0},
      ]}>
      <CircleInfoIcon size="sm" style={[t.atoms.text_contrast_medium]} />
      <Text style={[a.flex_1, a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Chat de comunidades no disponible por ahora. Puede haber mensajes sin
          leer.
        </Trans>
      </Text>
    </View>
  )
}

function SectionHeader({label}: {label: string}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.px_lg,
        a.pt_md,
        a.pb_xs,
        {backgroundColor: t.palette.contrast_0},
      ]}>
      <Text
        style={[
          a.text_xs,
          a.font_semi_bold,
          t.atoms.text_contrast_medium,
          {textTransform: 'uppercase'},
        ]}>
        {label}
      </Text>
    </View>
  )
}

export function Header({
  newChatControl,
  chatStatus,
}: {
  newChatControl: DialogControlProps
  chatStatus: ChatStatus | undefined
}) {
  const {t: l} = useLingui()
  const {gtMobile} = useBreakpoints()
  const requireEmailVerification = useRequireEmailVerification()
  const {isWithinSplitView} = useIsWithinSplitView()
  const navigation = useNavigation<NavigationProp>()

  // In split view, the left column (and this header) stays mounted while the
  // right column shows the selected route. Pushing would stack duplicate routes
  // on repeated clicks, so navigate instead to dedupe by route + params.
  const action = isWithinSplitView ? 'navigate' : 'push'

  const {data: unreadCounts} = useUnreadCountsQuery()
  const requestCount = unreadCounts?.unreadRequestConvos ?? 0

  const openChatControl = useCallback(() => {
    newChatControl.open()
  }, [newChatControl])

  const wrappedOpenChatControl = requireEmailVerification(openChatControl, {
    instructions: [
      <Trans key="new-chat">
        Before you can message another user, you must first verify your email.
      </Trans>,
    ],
  })

  return (
    <Layout.Header.Outer>
      {gtMobile ? (
        <>
          <Layout.Header.Content align="left">
            <Layout.Header.TitleText>
              <Trans>Chats</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <InboxRequests
              count={requestCount}
              variant="solid"
              action={action}
            />
            <Button
              label={l`Chats de comunidades`}
              size="small"
              color="secondary"
              shape="round"
              onPress={() => navigation.navigate('CommunityChats')}>
              <ButtonIcon icon={CommunitiesIcon} />
            </Button>
            <ChatSettingsMenu action={action}>
              {({props}) => (
                <Button
                  {...props}
                  label={l`Chat options`}
                  size="small"
                  color="secondary"
                  shape="round"
                  style={[a.justify_center]}>
                  <ButtonIcon icon={SettingsIcon} />
                </Button>
              )}
            </ChatSettingsMenu>
            {!chatStatus?.chatDisabled && (
              <Button
                label={l`New chat`}
                color="primary"
                size="small"
                shape="round"
                onPress={wrappedOpenChatControl}>
                <ButtonIcon icon={NewChatIcon} />
              </Button>
            )}
          </View>
        </>
      ) : (
        <>
          <Layout.Header.MenuButton />
          <Layout.Header.Content align="left">
            <Layout.Header.TitleText>
              <Trans>Chats</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
          <InboxRequests count={requestCount} variant="ghost" />
          <Layout.Header.Slot>
            <Button
              label={l`Chats de comunidades`}
              size="small"
              variant="ghost"
              color="secondary"
              shape="round"
              onPress={() => navigation.navigate('CommunityChats')}>
              <ButtonIcon icon={CommunitiesIcon} size="lg" />
            </Button>
            <ChatSettingsMenu action={action}>
              {({props}) => (
                <Button
                  {...props}
                  label={l`Chat options`}
                  size="small"
                  variant="ghost"
                  color="secondary"
                  shape="round"
                  style={[a.justify_center]}>
                  <ButtonIcon icon={SettingsIcon} size="lg" />
                </Button>
              )}
            </ChatSettingsMenu>
          </Layout.Header.Slot>
        </>
      )}
    </Layout.Header.Outer>
  )
}

function ChatSettingsMenu({
  action,
  children,
}: {
  action: 'navigate' | 'push'
  children: React.ComponentProps<typeof Menu.Trigger>['children']
}) {
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()

  const {mutate: markAllChatsRead} = useUpdateAllRead('accepted', {
    onMutate: () => {
      Toast.show(l`Marked all chats as read`, {type: 'success'})
    },
    onError: () => {
      Toast.show(l`Failed to mark all chats as read`, {type: 'error'})
    },
  })

  const {mutate: markAllRequestsRead} = useUpdateAllRead('request', {
    onMutate: () => {
      Toast.show(l`Marked all requests as read`, {type: 'success'})
    },
    onError: () => {
      Toast.show(l`Failed to mark all requests as read`, {type: 'error'})
    },
  })

  return (
    <Menu.Root>
      <Menu.Trigger label={l`Chat options`}>{children}</Menu.Trigger>
      <Menu.Outer>
        <Menu.Group>
          <Menu.Item
            label={l`Mark all chats as read`}
            onPress={() => markAllChatsRead()}>
            <Menu.ItemIcon icon={CircleCheckIcon} />
            <Menu.ItemText>
              <Trans>Mark all chats as read</Trans>
            </Menu.ItemText>
          </Menu.Item>
          <Menu.Item
            label={l`Mark all requests as read`}
            onPress={() => markAllRequestsRead()}>
            <Menu.ItemIcon icon={InboxIcon} />
            <Menu.ItemText>
              <Trans>Mark all requests as read</Trans>
            </Menu.ItemText>
          </Menu.Item>
          <Menu.Item
            label={l`Chat settings`}
            onPress={() => {
              if (action === 'navigate') {
                navigation.navigate('MessagesSettings')
              } else {
                navigation.push('MessagesSettings')
              }
            }}>
            <Menu.ItemIcon icon={SettingsIcon} />
            <Menu.ItemText>
              <Trans>Chat settings</Trans>
            </Menu.ItemText>
          </Menu.Item>
        </Menu.Group>
      </Menu.Outer>
    </Menu.Root>
  )
}
