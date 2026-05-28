import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {
  type AllNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {useNotificationSettingsQuery} from '#/state/queries/notifications/settings'
import {atoms as a} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {CloseQuote_Stroke2_Corner0_Rounded as CloseQuoteIcon} from '#/components/icons/Quote'
import * as Layout from '#/components/Layout'
import * as SettingsList from '../components/SettingsList'
import {ItemTextWithSubtitle} from './components/ItemTextWithSubtitle'
import {PreferenceControls} from './components/PreferenceControls'

type Props = NativeStackScreenProps<
  AllNavigatorParams,
  'RepostsOnRepostsNotificationSettings'
>
export function RepostsOnRepostsNotificationSettingsScreen({}: Props) {
  const {data: preferences, isError} = useNotificationSettingsQuery()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Notifications</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.Item style={[a.align_start]}>
            <SettingsList.ItemIcon icon={CloseQuoteIcon} />
            <ItemTextWithSubtitle
              bold
              titleText={<Trans>Quotes of your quotes</Trans>}
              subtitleText={
                <Trans>
                  Get notifications when people quote posts that you've quoted.
                </Trans>
              }
            />
          </SettingsList.Item>
          {isError ? (
            <View style={[a.px_lg, a.pt_md]}>
              <Admonition type="error">
                <Trans>Failed to load notification settings.</Trans>
              </Admonition>
            </View>
          ) : (
            <PreferenceControls
              name="repostViaRepost"
              preference={preferences?.repostViaRepost}
            />
          )}
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}
