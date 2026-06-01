import {useCallback, useEffect, useMemo, useState} from 'react'
import {View} from 'react-native'
import {useAnimatedRef} from 'react-native-reanimated'
import {type ChatBskyActorGetStatus, type ChatBskyConvoDefs} from '@atproto/api'
import {Trans, useLingui} from '@lingui/react/macro'
import {useFocusEffect, useIsFocused} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useAppState} from '#/lib/appState'
import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {useRequireEmailVerification} from '#/lib/hooks/useRequireEmailVerification'
import {type MessagesTabNavigatorParams} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {listenSoftReset} from '#/state/events'
import {MESSAGE_SCREEN_POLL_INTERVAL} from '#/state/messages/convo/const'
import {useMessagesEventBus} from '#/state/messages/events'
import {useMatrixRoomsQuery} from '#/state/queries/matrix'
import {useChatActorStatusQuery} from '#/state/queries/messages/get-status'
import {useLeftConvos} from '#/state/queries/messages/leave-conversation'
import {useListConvosQuery} from '#/state/queries/messages/list-conversations'
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
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfoIcon} from '#/components/icons/CircleInfo'
import {Inbox_Stroke2_Corner2_Rounded_Large as InboxLargeIcon} from '#/components/icons/Inbox'
import {MessagePlus_Stroke2_Corner0_Rounded as MessagePlusIcon} from '#/components/icons/Message'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/SettingsGear2'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {ListFooter} from '#/components/Lists'
import {Text} from '#/components/Typography'
import {useAgeAssurance} from '#/ageAssurance'
import {IS_NATIVE} from '#/env'
import {AgentSelection} from './components/AgentSelection'
import {ChatDisabled} from './components/ChatDisabled'
import {ChatListItem} from './components/ChatListItem'
import {InboxRequests} from './components/InboxRequests'
import {MatrixRoomListItem} from './components/MatrixRoomListItem'
import {useIsWithinSplitView} from './components/splitView/context'

type ChatStatus = ChatBskyActorGetStatus.OutputSchema

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
      conversation: ChatBskyConvoDefs.ConvoView
      selected: boolean
    }
  | {
      type: 'MATRIX_ROOM'
      roomId: string
      communityUri: string
      slug: string
      unread: number
      kind: 'main' | 'chamber-a' | 'chamber-b' | 'observers'
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
      return <MatrixRoomListItem room={item} />
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
      return `MATRIX_ROOM:${item.roomId}`
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
        <NewChat onNewChat={onNewChat} control={newChatControl} />
      </>
    )
  }

  return (
    <Layout.Screen testID="messagesScreen">
      <Header newChatControl={newChatControl} chatStatus={chatStatus} />
      <ChatList newChatControl={newChatControl} chatStatus={chatStatus} />
      <NewChat onNewChat={onNewChat} control={newChatControl} />
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
  const scrollElRef: ListRef = useAnimatedRef()
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
  } = useListConvosQuery({status: 'accepted'})

  const {refetch: refetchInbox} = useListConvosQuery({
    status: 'request',
  })

  const {
    data: matrixRoomsData,
    isLoading: isLoadingMatrixRooms,
    refetch: refetchMatrixRooms,
  } = useMatrixRoomsQuery({enabled: !!currentAccount?.did})

  useRefreshOnFocus(refetch)
  useRefreshOnFocus(refetchInbox)

  const leftConvos = useLeftConvos()

  const listItems = useMemo(() => {
    const items: ListItem[] = []

    if (matrixRoomsData?.rooms.length) {
      items.push({type: 'SECTION', label: l`Comunidades`})
      items.push(
        ...matrixRoomsData.rooms.map(room => ({
          type: 'MATRIX_ROOM' as const,
          roomId: room.roomId,
          communityUri: room.communityUri,
          slug: room.slug,
          unread: room.unread,
          kind: room.kind,
        })),
      )
    }

    items.push({type: 'SECTION', label: l`Agentes`})
    items.push({type: 'AGENT_SELECTION'})

    if (data?.pages) {
      const convos = data.pages
        .flatMap(page => page.convos)
        .filter(convo => !leftConvos.includes(convo.id))

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
  }, [data, l, leftConvos, matrixRoomsData, selectedChat])

  const hasListContent = listItems.some(
    item => item.type === 'CONVERSATION' || item.type === 'MATRIX_ROOM',
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
        {isLoading || isLoadingMatrixRooms ? (
          <ChatListLoadingPlaceholder />
        ) : (
          <ChatListEmptyState
            isError={isError}
            error={error}
            isWithinSplitView={isWithinSplitView}
            onRetry={refetch}
            onNewChat={wrappedOpenChatControl}
            chatDisabled={!!chatStatus?.chatDisabled}
          />
        )}
      </Layout.Center>
    )
  }

  return (
    <List<ListItem>
      ref={scrollElRef}
      data={listItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
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
  const leftConvos = useLeftConvos()

  const {data: unreadInboxData, hasNextPage: hasMoreRequests} =
    useListConvosQuery({
      status: 'request',
      readState: 'unread',
    })

  const inboxAllConvos = useMemo(() => {
    return (
      unreadInboxData?.pages
        .flatMap(page => page.convos)
        .filter(
          convo =>
            !leftConvos.includes(convo.id) &&
            !convo.muted &&
            convo.members.every(member => member.handle !== 'missing.invalid'),
        ) ?? []
    )
  }, [unreadInboxData, leftConvos])

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
              count={inboxAllConvos.length}
              more={hasMoreRequests}
              variant="solid"
            />
            <Link
              to="/messages/settings"
              label={l`Chat settings`}
              size="small"
              color="secondary"
              shape="round"
              style={[a.justify_center]}>
              <ButtonIcon icon={SettingsIcon} />
            </Link>
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
          <InboxRequests
            count={inboxAllConvos.length}
            more={hasMoreRequests}
            variant="ghost"
          />
          <Layout.Header.Slot>
            <Link
              to="/messages/settings"
              label={l`Chat settings`}
              size="small"
              variant="ghost"
              color="secondary"
              shape="round"
              style={[a.justify_center]}>
              <ButtonIcon icon={SettingsIcon} size="lg" />
            </Link>
          </Layout.Header.Slot>
        </>
      )}
    </Layout.Header.Outer>
  )
}
