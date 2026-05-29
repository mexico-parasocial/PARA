import {ScrollView, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {EmptyState} from '#/view/com/util/EmptyState'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SeePosts'>

export function SeePostsScreen({route}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const did = route.params?.did ?? currentAccount?.did
  const {data: profile} = useProfileQuery({did})

  const profileName = profile?.displayName || profile?.handle

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Posts</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Content>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}>
          <View style={styles.screenIntro}>
            <Text style={[styles.screenTitle, t.atoms.text]}>
              <Trans>Post ledger</Trans>
            </Text>
            <Text style={[styles.screenSubtitle, t.atoms.text_contrast_medium]}>
              {profileName ? (
                <Trans>Public activity for {profileName}.</Trans>
              ) : (
                <Trans>Public activity for this account.</Trans>
              )}
            </Text>
          </View>

          <View
            style={[
              styles.emptyCard,
              t.atoms.border_contrast_low,
              t.atoms.bg_contrast_25,
            ]}>
            <EmptyState
              icon={CircleInfo}
              message={_(
                msg`Post ledger data is not connected yet. When user posts and highlights are available here, they will appear without mock activity.`,
              )}
              button={
                profile?.handle
                  ? {
                      label: _(msg`View public profile`),
                      text: _(msg`View public profile`),
                      onPress: () =>
                        navigation.navigate('Profile', {name: profile.handle}),
                    }
                  : undefined
              }
            />
          </View>
        </ScrollView>
      </Layout.Content>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  screenIntro: {
    marginBottom: 16,
    gap: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    minHeight: 260,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
})
