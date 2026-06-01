import {useCallback, useEffect, useMemo} from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {WebView} from 'react-native-webview'
import {useNavigation, useRoute} from '@react-navigation/native'

import {getDefaultChatIdentityMode} from '#/lib/chat/identity'
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
import {ChatIdentityPill} from '#/components/chat/ChatIdentityPill'
import * as Layout from '#/components/Layout'
import {SorteoBadge} from '#/components/SorteoBadge'
import {Text} from '#/components/Typography'
import {buildClientHtml, buildConfigScript} from './matrix-client'

export function CommunityChatScreen() {
  const route = useRoute<{
    key: string
    name: 'CommunityChat'
    params: {communityUri: string; communityName: string; roomId?: string}
  }>()
  const navigation = useNavigation<NavigationProp>()
  const t = useTheme()
  const agent = useAgent()
  const {communityUri, communityName, roomId: routeRoomId} = route.params
  const myDid = agent.session?.did ?? undefined

  const {data: spaceData, isLoading: spaceLoading} =
    useCommunitySpaceQuery(communityUri)
  const {data: tokenData, isLoading: tokenLoading} = useMatrixTokenQuery({
    enabled: !!myDid,
  })
  const {data: memberList} = useChatMemberListQuery(communityUri, 100, 0)
  const {data: myBadges} = useChatBadgesQuery(myDid, communityUri)
  const {mutate: markRead} = useMarkMatrixReadMutation()
  const activeRoomId = routeRoomId ?? spaceData?.spaceId

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
    myBadges?.participation?.isModerator ? 'Moderador' : undefined,
    myBadges?.participation?.isDelegate ? 'Delegado' : undefined,
    myBadges?.participation?.chamber
      ? `Cámara ${myBadges.participation.chamber}`
      : undefined,
    ...(myBadges?.visibleBadges.map(badge => badge.label) ?? []),
  ].filter(Boolean) as string[]

  const isLoading = spaceLoading || tokenLoading

  const injectedJavaScript = useMemo(() => {
    if (!tokenData || !activeRoomId) return ''
    return buildConfigScript({
      accessToken: tokenData.accessToken,
      userId: tokenData.userId,
      homeServer: tokenData.homeServer,
      deviceId: tokenData.deviceId,
      roomId: activeRoomId,
      communityName,
    })
  }, [tokenData, activeRoomId, communityName])

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
      </View>
    ),
    [t],
  )

  const renderError = useCallback(
    () => (
      <View style={[styles.loading, {backgroundColor: t.palette.contrast_0}]}>
        <Layout.Content>
          <Layout.Header.TitleText style={{color: t.palette.negative_500}}>
            Chat not available
          </Layout.Header.TitleText>
        </Layout.Content>
      </View>
    ),
    [t],
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

  if (!spaceData || !tokenData || !activeRoomId) {
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
            {riskCount > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('CommunityMembers', {
                    communityUri,
                    communityName,
                  })
                }
                style={[styles.riskIndicator]}>
                <Text style={[styles.riskText]}>🟡 {riskCount}</Text>
              </TouchableOpacity>
            )}
            <SorteoBadge communityUri={communityUri} />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('CommunityMembers', {
                  communityUri,
                  communityName,
                })
              }
              style={[styles.headerBtn]}>
              <Text style={[a.text_sm, t.atoms.text]}>👥</Text>
            </TouchableOpacity>
            {isModerator && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('ModeratorDashboard', {
                    communityUri,
                    communityName,
                  })
                }
                style={[styles.headerBtn]}>
                <Text style={[a.text_sm, t.atoms.text]}>🛡️</Text>
              </TouchableOpacity>
            )}
          </View>
        </Layout.Header.Slot>
      </Layout.Header.Outer>
      <View
        style={[
          styles.civicContext,
          {
            backgroundColor: t.palette.contrast_25,
            borderBottomColor: t.palette.contrast_100,
          },
        ]}>
        <ChatIdentityPill mode={identityMode} />
        {civicBadges.length > 0 && (
          <View style={[a.flex_row, a.flex_wrap, a.gap_xs, a.mt_xs]}>
            {civicBadges.slice(0, 4).map(badge => (
              <View
                key={badge}
                style={[
                  styles.badge,
                  {
                    backgroundColor: t.palette.primary_500 + '18',
                    borderColor: t.palette.primary_500 + '33',
                  },
                ]}>
                <Text style={[a.text_xs, {color: t.palette.primary_500}]}>
                  {badge}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: t.palette.contrast_0,
            borderBottomColor: t.palette.contrast_100,
          },
        ]}>
        <ChatActionButton
          label="Resumir"
          hint="Abre el agente para resumir el debate"
          onPress={openAgentAssistant}
        />
        <ChatActionButton
          label="Propuesta"
          hint="Crea un cabildeo desde esta conversación"
          onPress={openCreateCabildeo}
        />
        <ChatActionButton
          label="Evidencia"
          hint="Abre el agente para extraer evidencia"
          onPress={openAgentAssistant}
        />
        <ChatActionButton
          label="Miembros"
          hint="Muestra miembros y badges cívicos"
          onPress={() =>
            navigation.navigate('CommunityMembers', {
              communityUri,
              communityName,
            })
          }
        />
      </View>
      <WebView
        source={{
          html: buildClientHtml(),
          baseUrl: 'https://chat.para.social',
        }}
        style={styles.webview}
        startInLoadingState
        renderLoading={renderLoading}
        injectedJavaScript={injectedJavaScript}
        onError={syntheticEvent => {
          const {nativeEvent} = syntheticEvent
          console.warn('[CommunityChat] WebView error:', nativeEvent)
        }}
      />
    </Layout.Screen>
  )
}

function ChatActionButton({
  label,
  hint,
  onPress,
}: {
  label: string
  hint: string
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
      <Text style={[a.text_xs, a.font_semi_bold, t.atoms.text]}>{label}</Text>
    </TouchableOpacity>
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
  riskIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,149,0,0.12)',
  },
  riskText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  civicContext: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
})
