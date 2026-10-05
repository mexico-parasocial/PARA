import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {getDefaultChatIdentityMode} from '#/lib/chat/identity'
import {useChatBootstrap} from '#/lib/matrix/useChatBootstrap'
import {useMatrixWebSession} from '#/lib/matrix/useMatrixWebSession'
import {useReportedMessage} from '#/lib/matrix/useReportedMessage'
import {type NavigationProp} from '#/lib/routes/types'
import {
  useChatBadgesQuery,
  useChatMemberListQuery,
  useCommunitySpaceQuery,
  useMarkMatrixReadMutation,
  useMatrixRoomsQuery,
} from '#/state/queries/matrix'
import {useAgent} from '#/state/session'
import {useExpandCivicTreeWorkspace} from '#/state/shell/civic-tree-workspace'
import {atoms as a, useBreakpoints, useLayoutBreakpoints, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ReportedMessageCard} from '#/components/chat/ReportedMessageCard'
import {
  type ReportedMessage,
  ReportMessageDialog,
} from '#/components/chat/ReportMessageDialog'
import * as Dialog from '#/components/Dialog'
import {type Props as SVGIconProps} from '#/components/icons/common'
import {Group3_Stroke2_Corner0_Rounded as MembersIcon} from '#/components/icons/Group'
import {Megaphone_Stroke2_Corner0_Rounded as ProposalIcon} from '#/components/icons/Megaphone'
import {Newspaper_Stroke2_Corner2_Rounded as EvidenceIcon} from '#/components/icons/Newspaper'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Sparkle_Stroke2_Corner0_Rounded as SummarizeIcon} from '#/components/icons/Sparkle'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import * as Layout from '#/components/Layout'
import {SorteoBadge} from '#/components/SorteoBadge'
import {Text} from '#/components/Typography'
import {storeRefreshedMatrixWebSession} from '#/features/encryptedChat/webOidc'
import {ChatCivicContext} from './ChatCivicContext'
import {ChatMembersPanel, ChatRoomsRail} from './CommunityChatPanels'
import {buildConfiguredClientHtml} from './matrix-client'
import {useChatOnboarding} from './useChatOnboarding'
import {useMatrixClientStrings} from './useMatrixClientStrings'

export function CommunityChatScreen() {
  const route = useRoute<{
    key: string
    name: 'CommunityChat'
    params: {
      communityUri: string
      communityName: string
      roomId?: string
      focusEventId?: string
    }
  }>()
  const navigation = useNavigation<NavigationProp>()
  const t = useTheme()
  const {_} = useLingui()
  const matrixStrings = useMatrixClientStrings()
  const agent = useAgent()
  const {
    communityUri,
    communityName,
    roomId: routeRoomId,
    focusEventId,
  } = route.params
  const myDid = agent.session?.did ?? undefined
  const chatBootstrap = useChatBootstrap(communityUri, !!myDid)
  const reportControl = Dialog.useDialogControl()
  const [reportedMessage, setReportedMessage] = useState<ReportedMessage>()
  const openReport = useCallback(
    (message: ReportedMessage) => {
      setReportedMessage(message)
      reportControl.open()
    },
    [reportControl],
  )
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const {data: spaceData, isLoading: spaceLoading} =
    useCommunitySpaceQuery(communityUri)
  /*
   * The browser owns its Matrix session here. `/api/matrix-token` cannot serve
   * this deployment — MAS owns logins, so the bridge has nothing to mint and
   * answers 503 MATRIX_CLIENT_LOGIN_REQUIRED — so the session comes from the
   * homeserver's own authorization-code flow instead. See
   * `features/encryptedChat/webOidc.ts`.
   */
  const matrixSession = useMatrixWebSession({
    enabled: !!myDid && chatBootstrap.ready,
  })
  const tokenData = matrixSession.session
  const tokenLoading = matrixSession.status === 'loading'
  const tokenError =
    matrixSession.status === 'error' && matrixSession.error
      ? new Error(matrixSession.error)
      : undefined
  const authorizationRequired = matrixSession.status === 'authorizationRequired'
  const {data: memberList} = useChatMemberListQuery(communityUri, 100, 0)
  const {data: myBadges} = useChatBadgesQuery(myDid, communityUri)
  const {mutate: markRead} = useMarkMatrixReadMutation()
  const activeRoomId = routeRoomId ?? spaceData?.spaceId
  const {data: roomsData} = useMatrixRoomsQuery({enabled: !!myDid})
  const communityRooms = useMemo(
    () => roomsData?.rooms.filter(r => r.communityUri === communityUri) ?? [],
    [roomsData, communityUri],
  )
  const {width: windowWidth} = useWindowDimensions()
  const {gtMobile, gtTablet} = useBreakpoints()
  const {centerColumnOffset} = useLayoutBreakpoints()
  // On wide screens the chat takes over the right column like the civic tree.
  const wide = gtMobile && !!myDid
  // The members panel starts closed on mid-width windows to leave room for chat.
  const [membersOpen, setMembersOpen] = useState(gtTablet)
  const [live, setLive] = useState<{
    unread: Record<string, number>
    presence: Record<string, string>
  }>({unread: {}, presence: {}})
  useExpandCivicTreeWorkspace(wide)
  const workspaceLeft =
    windowWidth / 2 -
    300 +
    (centerColumnOffset ? Layout.CENTER_COLUMN_OFFSET : 0)
  const selectRoom = useCallback(
    (room: {roomId: string}) => navigation.setParams({roomId: room.roomId}),
    [navigation],
  )
  const openMember = useCallback(
    (did: string) => navigation.navigate('Profile', {name: did}),
    [navigation],
  )
  const openMembers = useCallback(
    () =>
      navigation.navigate('CommunityMembers', {communityUri, communityName}),
    [navigation, communityUri, communityName],
  )
  // A reported message opened from the moderator queue (D2): read with this
  // session, shown above the conversation until dismissed.
  const [focusDismissed, setFocusDismissed] = useState(false)
  const showFocus = !!focusEventId && !focusDismissed
  const reported = useReportedMessage({
    roomId: activeRoomId,
    eventId: showFocus ? focusEventId : undefined,
    session: tokenData,
  })
  const rejoin = chatBootstrap.rejoin

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (event.origin !== window.location.origin) return
      try {
        const message = JSON.parse(event.data) as {
          type?: string
          roomId?: string
          eventId?: string
          activeRoomId?: string
          rooms?: {roomId: string; unread: number}[]
          presence?: Record<string, string>
          accessToken?: string
          refreshToken?: string
          expiresInMs?: number
        }
        if (
          message.type === 'matrix-live-state' &&
          message.activeRoomId === activeRoomId &&
          Array.isArray(message.rooms)
        ) {
          setLive({
            unread: Object.fromEntries(
              message.rooms
                .filter(r => typeof r.roomId === 'string')
                .map(r => [r.roomId, Number(r.unread) || 0]),
            ),
            presence: message.presence ?? {},
          })
        } else if (
          message.type === 'matrix-report-message' &&
          typeof message.roomId === 'string' &&
          message.roomId === activeRoomId &&
          typeof message.eventId === 'string'
        ) {
          openReport({roomId: message.roomId, eventId: message.eventId})
        } else if (
          message.type === 'matrix-membership-left' &&
          message.roomId === activeRoomId
        ) {
          void rejoin()
        } else if (
          message.type === 'matrix-token-refreshed' &&
          typeof message.accessToken === 'string'
        ) {
          // MAS rotates the refresh token on use. Store what the client got, or
          // the next page load replays a token the homeserver has retired.
          void storeRefreshedMatrixWebSession({
            accessToken: message.accessToken,
            refreshToken: message.refreshToken,
            expiresInMs: message.expiresInMs,
          })
        }
      } catch {
        // Ignore unrelated iframe messages.
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [activeRoomId, rejoin, openReport])

  useEffect(() => {
    if (myDid && activeRoomId) {
      markRead({roomId: activeRoomId})
    }
  }, [myDid, activeRoomId, markRead])

  const riskCount =
    memberList?.members.filter(m =>
      m.badges.some(
        b =>
          b.visibleInChat &&
          (b.severity === 'warning' || b.severity === 'critical'),
      ),
    ).length ?? 0
  const isModerator = myBadges?.participation?.isModerator ?? false
  const identityMode = getDefaultChatIdentityMode('matrix_community')
  const civicBadges = [
    myBadges?.participation?.isModerator ? _(msg`Moderador`) : undefined,
    myBadges?.participation?.isDelegate ? _(msg`Delegado`) : undefined,
    myBadges?.participation?.chamber
      ? _(msg`Cámara ${myBadges.participation.chamber}`)
      : undefined,
    ...(myBadges?.visibleBadges.map(badge => badge.label) ?? []),
  ].filter(Boolean) as string[]

  const isLoading =
    spaceLoading ||
    tokenLoading ||
    (!chatBootstrap.ready && !chatBootstrap.error)

  const [sdkBundle, setSdkBundle] = useState<string | undefined>()
  const [bundleError, setBundleError] = useState<Error | undefined>()
  const onboarding = useChatOnboarding(communityUri)

  useEffect(() => {
    let cancelled = false
    async function loadBundle() {
      try {
        const res = await fetch('/assets/chat/matrix-js-sdk.bundle.txt')
        if (!res.ok) {
          throw new Error(`Failed to load Matrix SDK bundle: ${res.status}`)
        }
        const content = await res.text()
        if (!cancelled) {
          setSdkBundle(content)
          setBundleError(undefined)
        }
      } catch (err) {
        console.warn(
          '[CommunityChat.web] Failed to load Matrix SDK bundle:',
          err,
        )
        if (!cancelled) {
          setSdkBundle(undefined)
          setBundleError(err as Error)
        }
      }
    }
    void loadBundle()
    return () => {
      cancelled = true
    }
  }, [])

  const srcDoc = useMemo(() => {
    if (!tokenData || !activeRoomId || !sdkBundle) return undefined
    return buildConfiguredClientHtml(sdkBundle, {
      accessToken: tokenData.accessToken,
      userId: tokenData.userId,
      homeServer: tokenData.homeServer,
      deviceId: tokenData.deviceId,
      roomId: activeRoomId,
      communityName,
      strings: matrixStrings,
      parentOrigin: window.location.origin,
      // MAS access tokens are short-lived. Hand the client what it needs to
      // renew its own, or the conversation dies a few minutes in.
      refreshToken: tokenData.refreshToken,
      tokenEndpoint: tokenData.tokenEndpoint,
      oauthClientId: tokenData.clientId,
    })
  }, [tokenData, activeRoomId, sdkBundle, communityName, matrixStrings])

  const openAgentAssistant = useCallback(() => {
    navigation.navigate('AgentChat', {agentId: 'Xavier Exul'})
  }, [navigation])

  const openCreateCabildeo = useCallback(() => {
    navigation.navigate('CreateCabildeo')
  }, [navigation])

  const renderLoading = useCallback(
    () => (
      <View style={[styles.loading, {backgroundColor: t.palette.contrast_0}]}>
        <ActivityIndicator size="large" color={t.palette.primary_500} />
        {!chatBootstrap.ready && (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_sm]}>
            <Trans>
              Aprueba la firma pendiente en la sección Credenciales de iM8.
            </Trans>
          </Text>
        )}
      </View>
    ),
    [t, chatBootstrap.ready],
  )

  const renderError = useCallback(
    (message: string) => (
      <View style={[styles.loading, {backgroundColor: t.palette.contrast_0}]}>
        <Layout.Content>
          <Layout.Header.TitleText style={{color: t.palette.negative_500}}>
            <Trans>Chat no disponible</Trans>
          </Layout.Header.TitleText>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_sm]}>
            {message}
          </Text>
        </Layout.Content>
      </View>
    ),
    [t],
  )

  /*
   * No session yet. This is the normal first-run state on web, not a failure:
   * the homeserver decides who may chat, and it asks in its own pages. Nothing
   * useful can be rendered until the user has been there, so offer the trip
   * rather than a spinner that never resolves.
   */
  if (authorizationRequired && !chatBootstrap.error) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>{communityName}</Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        <View style={[styles.loading, {backgroundColor: t.palette.contrast_0}]}>
          <Layout.Content>
            <Layout.Header.TitleText>
              <Trans>Autoriza el chat</Trans>
            </Layout.Header.TitleText>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_sm]}>
              <Trans>
                El servidor de chat pide tu autorización en su propia página.
                Volverás aquí al terminar.
              </Trans>
            </Text>
            <Button
              label={_(msg`Autorizar el chat`)}
              onPress={matrixSession.authorize}
              size="large"
              variant="solid"
              color="primary"
              style={a.mt_md}>
              <ButtonText>
                <Trans>Autorizar</Trans>
              </ButtonText>
            </Button>
          </Layout.Content>
        </View>
      </Layout.Screen>
    )
  }

  if (
    isLoading ||
    (!srcDoc && !bundleError && !chatBootstrap.error && !tokenError)
  ) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>{communityName}</Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        {renderLoading()}
      </Layout.Screen>
    )
  }

  if (
    !spaceData ||
    !tokenData ||
    !activeRoomId ||
    bundleError ||
    chatBootstrap.error
  ) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>{communityName}</Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        {renderError(
          chatBootstrap.error ||
            tokenError?.message ||
            bundleError?.message ||
            _(msg`No se pudo abrir el chat. Inténtalo de nuevo.`),
        )}
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen hideBorders={wide}>
      <Layout.Center
        style={[
          styles.center,
          wide && {
            maxWidth: windowWidth - workspaceLeft - 24,
            width: windowWidth - workspaceLeft - 24,
            marginLeft: workspaceLeft,
            marginRight: 24,
            transform: [],
          },
        ]}>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>{communityName}</Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot>
            <View style={[styles.headerSlot]}>
              {isModerator && riskCount > 0 && (
                <Button
                  label={_(msg`Miembros con insignias de riesgo: ${riskCount}`)}
                  accessibilityHint={_(
                    msg`Abre la lista de miembros de la comunidad`,
                  )}
                  size="small"
                  shape="default"
                  variant="ghost"
                  onPress={() =>
                    navigation.navigate('CommunityMembers', {
                      communityUri,
                      communityName,
                    })
                  }>
                  <ButtonIcon icon={WarningIcon} />
                  <ButtonText>{riskCount}</ButtonText>
                </Button>
              )}
              <SorteoBadge communityUri={communityUri} />
              <Button
                label={_(msg`Miembros`)}
                accessibilityHint={_(
                  msg`Abre la lista de miembros de la comunidad`,
                )}
                size="small"
                shape="round"
                variant="ghost"
                onPress={
                  wide ? () => setMembersOpen(open => !open) : openMembers
                }>
                <ButtonIcon icon={MembersIcon} />
              </Button>
              {isModerator && (
                <Button
                  label={_(msg`Panel de moderación`)}
                  accessibilityHint={_(
                    msg`Abre las herramientas de moderación de la comunidad`,
                  )}
                  size="small"
                  shape="round"
                  variant="ghost"
                  onPress={() =>
                    navigation.navigate('ModeratorDashboard', {
                      communityUri,
                      communityName,
                    })
                  }>
                  <ButtonIcon icon={ShieldIcon} />
                </Button>
              )}
            </View>
          </Layout.Header.Slot>
        </Layout.Header.Outer>
        <ChatCivicContext
          identityMode={identityMode}
          encryptionPolicy={'unencrypted'}
          badges={civicBadges}
        />
        {onboarding.visible && (
          <OnboardingBanner
            onDismiss={onboarding.dismiss}
            roomLabel={
              routeRoomId && routeRoomId !== spaceData?.spaceId
                ? _(msg`cámara de debate`)
                : _(msg`sala principal`)
            }
          />
        )}
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: t.palette.contrast_0,
              borderBottomColor: t.palette.contrast_100,
            },
          ]}>
          <ChatActionButton
            label={_(msg`Resumir`)}
            hint={_(msg`Abre el agente para resumir el debate`)}
            icon={SummarizeIcon}
            onPress={openAgentAssistant}
          />
          <ChatActionButton
            label={_(msg`Propuesta`)}
            hint={_(msg`Crea un cabildeo desde esta conversación`)}
            icon={ProposalIcon}
            onPress={openCreateCabildeo}
          />
          <ChatActionButton
            label={_(msg`Evidencia`)}
            hint={_(msg`Abre el agente para extraer evidencia`)}
            icon={EvidenceIcon}
            onPress={openAgentAssistant}
          />
          <ChatActionButton
            label={_(msg`Miembros`)}
            hint={_(msg`Muestra miembros y badges cívicos`)}
            icon={MembersIcon}
            onPress={() =>
              navigation.navigate('CommunityMembers', {
                communityUri,
                communityName,
              })
            }
          />
        </View>
        {showFocus && (
          <ReportedMessageCard
            view={reported.view}
            encrypted={false}
            onClose={() => setFocusDismissed(true)}
            onRetry={reported.retry}
          />
        )}
        <View style={styles.body}>
          {wide && (
            <ChatRoomsRail
              rooms={communityRooms}
              activeRoomId={activeRoomId}
              mainRoomId={spaceData?.spaceId}
              liveUnread={live.unread}
              onSelect={selectRoom}
            />
          )}
          <iframe
            key={activeRoomId}
            ref={iframeRef}
            title={_(msg`Chat de ${communityName}`)}
            srcDoc={srcDoc}
            style={styles.iframe}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
          {wide && membersOpen && (
            <ChatMembersPanel
              members={memberList?.members ?? []}
              total={memberList?.total ?? 0}
              isModerator={isModerator}
              presence={live.presence}
              onOpenMember={openMember}
              onOpenAll={openMembers}
            />
          )}
        </View>
        <ReportMessageDialog
          control={reportControl}
          communityUri={communityUri}
          message={reportedMessage}
        />
      </Layout.Center>
    </Layout.Screen>
  )
}

function ChatActionButton({
  label,
  hint,
  icon: Icon,
  onPress,
}: {
  label: string
  hint: string
  icon: ComponentType<SVGIconProps>
  onPress: () => void
}) {
  const t = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={styles.actionButton}>
      <Icon size="sm" style={{color: t.palette.primary_500}} />
      <Text style={[a.text_xs, a.font_semi_bold, t.atoms.text, a.mt_xs]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function OnboardingBanner({
  onDismiss,
  roomLabel,
}: {
  onDismiss: () => void
  roomLabel: string
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        styles.onboardingBanner,
        {
          backgroundColor: t.palette.primary_500 + '12',
          borderBottomColor: t.palette.primary_500 + '24',
        },
      ]}>
      <View style={[a.flex_1, a.gap_xs]}>
        <Text style={[a.text_sm, a.font_bold, {color: t.palette.primary_600}]}>
          <Trans>Deliberación cívica</Trans>
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            Esta es la {roomLabel}. Los mensajes aquí son parte de la
            conversación de la comunidad. Usa los botones de arriba para
            resumir, proponer o recopilar evidencia.
          </Trans>
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={_(msg`Cerrar`)}
        accessibilityHint={_(msg`Oculta este mensaje de bienvenida`)}
        onPress={onDismiss}
        style={styles.dismissBtn}>
        <Text style={{color: t.palette.primary_500}}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {flex: 1},
  body: {flex: 1, flexDirection: 'row'},
  iframe: {
    flex: 1,
    borderWidth: 0,
    width: '100%',
    height: '100%',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 3,
  },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dismissBtn: {
    padding: 4,
    borderRadius: 8,
  },
})
