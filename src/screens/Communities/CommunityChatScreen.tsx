import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {WebView} from 'react-native-webview'
import {Asset} from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {getDefaultChatIdentityMode} from '#/lib/chat/identity'
import {shareMatrixMedia} from '#/lib/matrix/media.native'
import {useChatBootstrap} from '#/lib/matrix/useChatBootstrap'
import {useReportedMessage} from '#/lib/matrix/useReportedMessage'
import {type NavigationProp} from '#/lib/routes/types'
import {
  useChatBadgesQuery,
  useChatMemberListQuery,
  useCommunitySpaceQuery,
  useMarkMatrixReadMutation,
  useMatrixTokenQuery,
} from '#/state/queries/matrix'
import {useAgent} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
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
import {CHAT_ENGINE} from '#/env'
import {ChatCivicContext} from './ChatCivicContext'
import {buildConfiguredClientHtml} from './matrix-client'
import {NativeChatRoom} from './NativeChatRoom'
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

  const {data: spaceData, isLoading: spaceLoading} =
    useCommunitySpaceQuery(communityUri)
  const {
    data: tokenData,
    isLoading: tokenLoading,
    error: tokenError,
  } = useMatrixTokenQuery({
    enabled: CHAT_ENGINE !== 'native' && !!myDid && chatBootstrap.ready,
    deviceId: chatBootstrap.deviceId,
  })
  const {data: memberList} = useChatMemberListQuery(communityUri, 100, 0)
  const {data: myBadges} = useChatBadgesQuery(myDid, communityUri)
  const {mutate: markRead} = useMarkMatrixReadMutation()
  const activeRoomId = routeRoomId ?? spaceData?.spaceId
  // A reported message opened from the moderator queue (D2): read with this
  // session, shown above the conversation until dismissed.
  const [focusDismissed, setFocusDismissed] = useState(false)
  const showFocus = !!focusEventId && !focusDismissed
  const reported = useReportedMessage({
    roomId: activeRoomId,
    eventId: showFocus && CHAT_ENGINE !== 'native' ? focusEventId : undefined,
    session: tokenData,
  })

  // Mark room as read when entering chat
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
    (CHAT_ENGINE !== 'native' && tokenLoading) ||
    (!chatBootstrap.ready && !chatBootstrap.error)

  const [sdkBundle, setSdkBundle] = useState<string | undefined>()
  const [verifiedNativeRoomId, setVerifiedNativeRoomId] = useState<string>()
  const onEncryptionVerified = useCallback(
    (verified: boolean) =>
      setVerifiedNativeRoomId(verified ? activeRoomId : undefined),
    [activeRoomId],
  )
  const onboarding = useChatOnboarding(communityUri)

  useEffect(() => {
    if (CHAT_ENGINE === 'native') return
    let cancelled = false
    async function loadBundle() {
      try {
        const asset = Asset.fromModule(
          require('../../../assets/chat/matrix-js-sdk.bundle.txt'),
        )
        await asset.downloadAsync()
        const content = await FileSystem.readAsStringAsync(
          asset.localUri || asset.uri,
        )
        if (!cancelled) setSdkBundle(content)
      } catch (err) {
        console.warn(
          '[CommunityChat] Failed to load local Matrix SDK bundle:',
          err,
        )
        if (!cancelled) setSdkBundle(undefined)
      }
    }
    void loadBundle()
    return () => {
      cancelled = true
    }
  }, [])

  const chatHtml = useMemo(() => {
    if (!tokenData || !activeRoomId) return ''
    return buildConfiguredClientHtml(sdkBundle, {
      accessToken: tokenData.accessToken,
      userId: tokenData.userId,
      homeServer: tokenData.homeServer,
      deviceId: tokenData.deviceId,
      roomId: activeRoomId,
      communityName,
      strings: matrixStrings,
    })
  }, [tokenData, activeRoomId, communityName, matrixStrings, sdkBundle])

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
    () => (
      <View style={[styles.loading, {backgroundColor: t.palette.contrast_0}]}>
        <Layout.Content>
          <Layout.Header.TitleText style={{color: t.palette.negative_500}}>
            <Trans>Chat no disponible</Trans>
          </Layout.Header.TitleText>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_sm]}>
            {chatBootstrap.error ??
              tokenError?.message ??
              _(msg`No se pudo abrir el chat.`)}
          </Text>
          {chatBootstrap.error && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void chatBootstrap.retry()}>
              <Text style={[a.text_sm, t.atoms.text]}>
                <Trans>Reintentar</Trans>
              </Text>
            </TouchableOpacity>
          )}
        </Layout.Content>
      </View>
    ),
    [t, chatBootstrap, tokenError?.message, _],
  )

  if (isLoading) {
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

  if (!spaceData || (CHAT_ENGINE !== 'native' && !tokenData) || !activeRoomId) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>{communityName}</Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        {renderError()}
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
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
              onPress={() =>
                navigation.navigate('CommunityMembers', {
                  communityUri,
                  communityName,
                })
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
        encryptionPolicy={
          CHAT_ENGINE === 'native' && verifiedNativeRoomId === activeRoomId
            ? 'e2ee'
            : 'unencrypted'
        }
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
      {CHAT_ENGINE !== 'native' && showFocus && (
        <ReportedMessageCard
          view={reported.view}
          encrypted={false}
          onClose={() => setFocusDismissed(true)}
          onRetry={reported.retry}
        />
      )}
      {CHAT_ENGINE === 'native' ? (
        <NativeChatRoom
          key={activeRoomId}
          roomId={activeRoomId}
          focusEventId={focusEventId}
          onEncryptionVerified={onEncryptionVerified}
          onReportMessage={eventId =>
            openReport({roomId: activeRoomId, eventId})
          }
        />
      ) : (
        <WebView
          source={{
            html: chatHtml,
            baseUrl: 'https://chat.para.social',
          }}
          style={styles.webview}
          startInLoadingState
          renderLoading={renderLoading}
          onMessage={event => {
            try {
              const message = JSON.parse(event.nativeEvent.data) as {
                type?: string
                roomId?: string
                mxcUrl?: string
                filename?: string
                eventId?: string
              }
              if (
                message.type === 'matrix-report-message' &&
                message.roomId === activeRoomId &&
                typeof message.eventId === 'string'
              ) {
                openReport({roomId: message.roomId, eventId: message.eventId})
              } else if (
                message.type === 'matrix-membership-left' &&
                message.roomId === activeRoomId
              ) {
                void chatBootstrap.rejoin()
              } else if (
                message.type === 'matrix-open-media' &&
                typeof message.mxcUrl === 'string' &&
                typeof message.filename === 'string' &&
                tokenData
              ) {
                void shareMatrixMedia({
                  homeServer: tokenData.homeServer,
                  accessToken: tokenData.accessToken,
                  mxcUrl: message.mxcUrl,
                  filename: message.filename,
                }).catch(err => {
                  console.warn('[CommunityChat] Media open failed:', err)
                  Alert.alert(_(msg`No se pudo abrir el archivo`))
                })
              }
            } catch {
              // Ignore unrelated WebView messages.
            }
          }}
          onError={syntheticEvent => {
            const {nativeEvent} = syntheticEvent
            console.warn('[CommunityChat] WebView error:', nativeEvent)
          }}
        />
      )}
      <ReportMessageDialog
        control={reportControl}
        communityUri={communityUri}
        message={reportedMessage}
      />
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
  webview: {
    flex: 1,
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
