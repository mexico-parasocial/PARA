import {useCallback} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useUpdateActorDeclaration} from '#/state/queries/messages/actor-declaration'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {ExportCarDialog} from '#/screens/Settings/components/ExportCarDialog'
import {atoms as a} from '#/alf'
import {AgeRestrictedScreen} from '#/components/ageAssurance/AgeRestrictedScreen'
import {useAgeAssuranceCopy} from '#/components/ageAssurance/useAgeAssuranceCopy'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Divider} from '#/components/Divider'
import {resolveAllowGroupInvites} from '#/components/dms/util'
import * as Toggle from '#/components/forms/Toggle'
import {Car_Stroke2_Corner2_Rounded as CarIcon} from '#/components/icons/Car'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {IS_NATIVE} from '#/env'
import {useBackgroundNotificationPreferences} from '../../../modules/expo-background-notification-handler/src/BackgroundNotificationHandlerProvider'

type AllowIncoming = 'all' | 'none' | 'following'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'MessagesSettings'>

export function MessagesSettingsScreen(props: Props) {
  const {t: l} = useLingui()
  const aaCopy = useAgeAssuranceCopy()

  return (
    <AgeRestrictedScreen
      screenTitle={l`Chat settings`}
      infoText={aaCopy.chatsInfoText}>
      <MessagesSettingsScreenInner {...props} />
    </AgeRestrictedScreen>
  )
}

export function MessagesSettingsScreenInner({}: Props) {
  const {t: l} = useLingui()
  const ax = useAnalytics()
  const {currentAccount} = useSession()
  const {data: profile} = useProfileQuery({
    did: currentAccount!.did,
  })
  const {preferences, setPref} = useBackgroundNotificationPreferences()
  const exportCarControl = Dialog.useDialogControl()

  const isGroupChatEnabled = ax.features.enabled(ax.features.GroupChatsEnable)

  const allowMessagesFromOptions: {name: AllowIncoming; label: string}[] = [
    {
      name: 'all',
      label: l({context: 'allow messages from', message: `Everyone`}),
    },
    {
      name: 'following',
      label: l({context: 'allow messages from', message: `Users I follow`}),
    },
    {
      name: 'none',
      label: l({context: 'allow messages from', message: `No one`}),
    },
  ]

  const allowGroupInvitesFromOptions: {name: AllowIncoming; label: string}[] =
    [
      {
        name: 'all',
        label: l({
          context: 'allow group chat invites from',
          message: `Everyone`,
        }),
      },
      {
        name: 'following',
        label: l({
          context: 'allow group chat invites from',
          message: `Users I follow`,
        }),
      },
      {
        name: 'none',
        label: l({
          context: 'allow group chat invites from',
          message: `No one`,
        }),
      },
    ]

  const {mutate: updateDeclaration} = useUpdateActorDeclaration({
    onError: () => {
      Toast.show(l`Failed to update settings`, {
        type: 'error',
      })
    },
  })

  const onSelectMessagesFrom = useCallback(
    (keys: string[]) => {
      const key = keys[0]
      if (!key) return
      updateDeclaration({allowIncoming: key as AllowIncoming})
    },
    [updateDeclaration],
  )

  const onSelectGroupInvitesFrom = useCallback(
    (keys: string[]) => {
      const key = keys[0]
      if (!key) return
      updateDeclaration({allowGroupInvites: key as AllowIncoming})
    },
    [updateDeclaration],
  )

  const onSelectSoundSetting = useCallback(
    (selected: boolean) => {
      setPref('playSoundChat', selected)
    },
    [setPref],
  )

  return (
    <Layout.Screen testID="messagesSettingsScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Chat Settings</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.p_lg, a.gap_md]}>
          <Text style={[a.text_lg, a.font_semi_bold]}>
            <Trans>Allow new messages from</Trans>
          </Text>
          <Toggle.Group
            label={l`Allow new messages from`}
            type="radio"
            values={[
              (profile?.associated?.chat?.allowIncoming as AllowIncoming) ??
                'following',
            ]}
            onChange={onSelectMessagesFrom}>
            <View>
              {allowMessagesFromOptions.map(option => (
                <Toggle.Item
                  key={option.name}
                  name={option.name}
                  label={option.label}
                  style={[a.justify_between, a.py_sm]}>
                  <Toggle.LabelText>{option.label}</Toggle.LabelText>
                  <Toggle.Radio />
                </Toggle.Item>
              ))}
            </View>
          </Toggle.Group>

          {isGroupChatEnabled && (
            <>
              <Divider style={a.my_md} />
              <Text style={[a.text_lg, a.font_semi_bold]}>
                <Trans>Allow group chat invites from</Trans>
              </Text>
              <Toggle.Group
                label={l`Allow group chat invites from`}
                type="radio"
                values={[resolveAllowGroupInvites(profile?.associated?.chat)]}
                onChange={onSelectGroupInvitesFrom}>
                <View>
                  {allowGroupInvitesFromOptions.map(option => (
                    <Toggle.Item
                      key={option.name}
                      name={option.name}
                      label={option.label}
                      style={[a.justify_between, a.py_sm]}>
                      <Toggle.LabelText>{option.label}</Toggle.LabelText>
                      <Toggle.Radio />
                    </Toggle.Item>
                  ))}
                </View>
              </Toggle.Group>
            </>
          )}

          <Divider style={a.my_md} />
          <Button
            label={l`Export chat data`}
            variant="solid"
            color="secondary"
            size="small"
            onPress={() => exportCarControl.open()}>
            <ButtonIcon icon={CarIcon} />
            <ButtonText>
              <Trans>Export chat data</Trans>
            </ButtonText>
          </Button>

          {IS_NATIVE && (
            <>
              <Divider style={a.my_md} />
              <Text style={[a.text_lg, a.font_semi_bold]}>
                <Trans>Notification Sounds</Trans>
              </Text>
              <Toggle.Item
                name="playSoundChat"
                label={l`Play sound for new messages`}
                style={[a.justify_between, a.py_sm]}
                onChange={onSelectSoundSetting}
                value={preferences.playSoundChat}>
                <Toggle.LabelText>
                  <Trans>Play sound for new messages</Trans>
                </Toggle.LabelText>
                <Toggle.Switch />
              </Toggle.Item>
            </>
          )}
        </View>
      </Layout.Content>
      <ExportCarDialog control={exportCarControl} />
    </Layout.Screen>
  )
}
