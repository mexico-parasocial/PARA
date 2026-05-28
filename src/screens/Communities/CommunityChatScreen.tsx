import {useCallback, useEffect, useMemo} from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {WebView} from 'react-native-webview'
import {useNavigation, useRoute} from '@react-navigation/native'

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
import * as Layout from '#/components/Layout'
import {SorteoBadge} from '#/components/SorteoBadge'
import {Text} from '#/components/Typography'
import {buildClientHtml, buildConfigScript} from './matrix-client'

export function CommunityChatScreen() {
  const route = useRoute<{
    key: string
    name: 'CommunityChat'
    params: {communityUri: string; communityName: string}
  }>()
  const navigation = useNavigation<NavigationProp>()
  const t = useTheme()
  const agent = useAgent()
  const {communityUri, communityName} = route.params
  const myDid = agent.session?.did ?? undefined

  const {data: spaceData, isLoading: spaceLoading} =
    useCommunitySpaceQuery(communityUri)
  const {data: tokenData, isLoading: tokenLoading} = useMatrixTokenQuery(myDid)
  const {data: memberList} = useChatMemberListQuery(communityUri, 100, 0)
  const {data: myBadges} = useChatBadgesQuery(myDid, communityUri)
  const markRead = useMarkMatrixReadMutation()

  // Mark room as read when entering chat
  useEffect(() => {
    if (myDid && spaceData?.spaceId) {
      markRead.mutate({did: myDid, roomId: spaceData.spaceId})
    }
  }, [myDid, spaceData?.spaceId, markRead])

  const riskCount =
    memberList?.members.filter(m =>
      m.badges.some(
        b =>
          b.visibleInChat &&
          (b.severity === 'warning' || b.severity === 'critical'),
      ),
    ).length ?? 0
  const isModerator = myBadges?.participation?.isModerator ?? false

  const isLoading = spaceLoading || tokenLoading

  const injectedJavaScript = useMemo(() => {
    if (!tokenData || !spaceData) return ''
    return buildConfigScript({
      accessToken: tokenData.accessToken,
      userId: tokenData.userId,
      homeServer: tokenData.homeServer,
      deviceId: tokenData.deviceId,
      roomId: spaceData.spaceId,
      communityName,
    })
  }, [tokenData, spaceData, communityName])

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

  if (!spaceData || !tokenData) {
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
})
