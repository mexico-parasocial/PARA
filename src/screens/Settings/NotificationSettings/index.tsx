import {useEffect} from 'react'
import {Linking, View} from 'react-native'
import * as Notification from 'expo-notifications'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import {useAppState} from '#/lib/appState'
import {
  type AllNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {
  useChatNotificationSettingsQuery,
  useNotificationSettingsQuery,
} from '#/state/queries/notifications/settings'
import {atoms as a} from '#/alf'
import {Admonition} from '#/components/Admonition'
import * as Dialog from '#/components/Dialog'
import {At_Stroke2_Corner2_Rounded as AtIcon} from '#/components/icons/At'
import {BellRinging_Stroke2_Corner0_Rounded as BellRingingIcon} from '#/components/icons/BellRinging'
import {Bubble_Stroke2_Corner2_Rounded as BubbleIcon} from '#/components/icons/Bubble'
import {Envelope_Stroke2_Corner2_Rounded as EnvelopeIcon} from '#/components/icons/Envelope'
import {Haptic_Stroke2_Corner2_Rounded as HapticIcon} from '#/components/icons/Haptic'
import {Influence_Stroke_Icon as InfluenceIcon} from '#/components/icons/Influence'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {PersonPlus_Stroke2_Corner2_Rounded as PersonPlusIcon} from '#/components/icons/Person'
import {CloseQuote_Stroke2_Corner0_Rounded as CloseQuoteIcon} from '#/components/icons/Quote'
import {Shapes_Stroke2_Corner0_Rounded as ShapesIcon} from '#/components/icons/Shapes'
import * as Layout from '#/components/Layout'
import {IS_ANDROID, IS_IOS, IS_WEB} from '#/env'
import * as SettingsList from '../components/SettingsList'
import {ChatNotificationDialogs} from './components/ChatNotificationDialogs'
import {ItemTextWithSubtitle} from './components/ItemTextWithSubtitle'
import {SettingPreview} from './components/SettingPreview'

const RQKEY = ['notification-permissions']

type Props = NativeStackScreenProps<AllNavigatorParams, 'NotificationSettings'>
export function NotificationSettingsScreen({}: Props) {
  const {_} = useLingui()
  const queryClient = useQueryClient()
  const {data: settings, isError} = useNotificationSettingsQuery()
  const {data: chatSettings, isError: chatError} =
    useChatNotificationSettingsQuery()

  const {data: permissions, refetch} = useQuery({
    queryKey: RQKEY,
    queryFn: async () => {
      if (IS_WEB) return null
      return await Notification.getPermissionsAsync()
    },
  })

  const appState = useAppState()
  useEffect(() => {
    if (appState === 'active') {
      void refetch()
    }
  }, [appState, refetch])

  const chatDialogControl = Dialog.useDialogControl()
  const chatRequestDialogControl = Dialog.useDialogControl()

  const onRequestPermissions = async () => {
    if (IS_WEB) return
    if (permissions?.canAskAgain) {
      const response = await Notification.requestPermissionsAsync()
      queryClient.setQueryData(RQKEY, response)
    } else {
      if (IS_ANDROID) {
        try {
          await Linking.sendIntent(
            'android.settings.APP_NOTIFICATION_SETTINGS',
            [
              {
                key: 'android.provider.extra.APP_PACKAGE',
                value: 'xyz.blueskyweb.app',
              },
            ],
          )
        } catch {
          void Linking.openSettings()
        }
      } else if (IS_IOS) {
        void Linking.openSettings()
      }
    }
  }

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
          {permissions && !permissions.granted && (
            <>
              <SettingsList.PressableItem
                label={_(msg`Enable push notifications`)}
                onPress={() => {
                  void onRequestPermissions()
                }}>
                <SettingsList.ItemIcon icon={HapticIcon} />
                <SettingsList.ItemText>
                  <Trans>Enable push notifications</Trans>
                </SettingsList.ItemText>
              </SettingsList.PressableItem>
              <SettingsList.Divider />
            </>
          )}
          {isError && (
            <View style={[a.px_lg, a.pb_md]}>
              <Admonition type="error">
                <Trans>Failed to load notification settings.</Trans>
              </Admonition>
            </View>
          )}
          <View style={[a.gap_sm]}>
            <SettingsList.LinkItem
              label={_(msg`Settings for influence notifications`)}
              to={{screen: 'LikeNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={InfluenceIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Influence</Trans>}
                subtitleText={<SettingPreview preference={settings?.like} />}
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.LinkItem
              label={_(msg`Settings for new follower notifications`)}
              to={{screen: 'NewFollowerNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={PersonPlusIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>New followers</Trans>}
                subtitleText={<SettingPreview preference={settings?.follow} />}
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.LinkItem
              label={_(msg`Settings for reply notifications`)}
              to={{screen: 'ReplyNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={BubbleIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Replies</Trans>}
                subtitleText={<SettingPreview preference={settings?.reply} />}
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.LinkItem
              label={_(msg`Settings for mention notifications`)}
              to={{screen: 'MentionNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={AtIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Mentions</Trans>}
                subtitleText={<SettingPreview preference={settings?.mention} />}
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.LinkItem
              label={_(msg`Settings for quote notifications`)}
              to={{screen: 'RepostNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={CloseQuoteIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Quotes</Trans>}
                subtitleText={<SettingPreview preference={settings?.repost} />}
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.LinkItem
              label={_(msg`Settings for activity from others`)}
              to={{screen: 'ActivityNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={BellRingingIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Activity from others</Trans>}
                subtitleText={
                  <SettingPreview preference={settings?.subscribedPost} />
                }
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.LinkItem
              label={_(
                msg`Settings for notifications for votes of your quotes`,
              )}
              to={{screen: 'LikesOnRepostsNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={InfluenceIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Votes of your quotes</Trans>}
                subtitleText={
                  <SettingPreview preference={settings?.likeViaRepost} />
                }
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.LinkItem
              label={_(
                msg`Settings for notifications for quotes of your quotes`,
              )}
              to={{screen: 'RepostsOnRepostsNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={CloseQuoteIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Quotes of your quotes</Trans>}
                subtitleText={
                  <SettingPreview preference={settings?.repostViaRepost} />
                }
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
            <SettingsList.PressableItem
              label={_(msg`Settings for notifications for new messages`)}
              onPress={() => {
                chatDialogControl.open()
              }}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={MessageIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>New messages</Trans>}
                subtitleText={
                  chatError ? (
                    <Trans>Failed to load notification settings.</Trans>
                  ) : (
                    <SettingPreview preference={chatSettings?.chat} />
                  )
                }
                showSkeleton={!chatSettings && !chatError}
              />
            </SettingsList.PressableItem>
            <SettingsList.PressableItem
              label={_(msg`Settings for notifications for new message requests`)}
              onPress={() => {
                chatRequestDialogControl.open()
              }}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={EnvelopeIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>New message requests</Trans>}
                subtitleText={
                  chatError ? (
                    <Trans>Failed to load notification settings.</Trans>
                  ) : (
                    <SettingPreview preference={chatSettings?.chatRequest} />
                  )
                }
                showSkeleton={!chatSettings && !chatError}
              />
            </SettingsList.PressableItem>
            <SettingsList.LinkItem
              label={_(msg`Settings for notifications for everything else`)}
              to={{screen: 'MiscellaneousNotificationSettings'}}
              contentContainerStyle={[a.align_start]}>
              <SettingsList.ItemIcon icon={ShapesIcon} />
              <ItemTextWithSubtitle
                titleText={<Trans>Everything else</Trans>}
                // technically a bundle of several settings, but since they're set together
                // and are most likely in sync we'll just show the state of one of them
                subtitleText={
                  <SettingPreview preference={settings?.starterpackJoined} />
                }
                showSkeleton={!settings}
              />
            </SettingsList.LinkItem>
          </View>
        </SettingsList.Container>
      </Layout.Content>
      <ChatNotificationDialogs
        chatControl={chatDialogControl}
        chatRequestControl={chatRequestDialogControl}
      />
    </Layout.Screen>
  )
}
