import {useCallback, useState} from 'react'
import {ActivityIndicator, Alert, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useFocusEffect} from '@react-navigation/native'

import {
  fetchParaIdentity,
  putParaIdentity,
} from '#/lib/api/para-identity'
import {type ParaIdentityRecord} from '#/lib/api/para-lexicons'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {useAgent, useSession} from '#/state/session'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import * as Toggle from '#/components/forms/Toggle'
import {Eye_Stroke2_Corner0_Rounded as EyeIcon} from '#/components/icons/Eye'
import {Globe_Stroke2_Corner0_Rounded as GlobeIcon} from '#/components/icons/Globe'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'ProfileVisibility'>

export function ProfileVisibilityScreen({}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const agent = useAgent()
  const {currentAccount} = useSession()
  const [loading, setLoading] = useState(true)

  // Visibility States
  const [votesPublic, setVotesPublic] = useState(false)
  const [raqPublic, setRaqPublic] = useState(false)
  const [highlightsPublic, setHighlightsPublic] = useState(false)

  // Master Toggle State
  const [isPublicFigure, setIsPublicFigure] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const [votes, raq, highlights, publicFigure, identity] =
        await Promise.all([
          AsyncStorage.getItem('para_public_votes'),
          AsyncStorage.getItem('para_public_raq'),
          AsyncStorage.getItem('para_public_highlights'),
          AsyncStorage.getItem('para_is_public_figure'),
          currentAccount
            ? fetchParaIdentity(agent, currentAccount.did)
            : Promise.resolve(null),
        ])

      setVotesPublic(votes === 'true')
      setRaqPublic(raq === 'true')
      setHighlightsPublic(highlights === 'true')
      setIsPublicFigure(
        identity?.isVerifiedPublicFigure ?? publicFigure === 'true',
      )
    } catch (e) {
      console.error('Failed to load visibility settings', e)
    } finally {
      setLoading(false)
    }
  }, [agent, currentAccount])

  useFocusEffect(
    useCallback(() => {
      void loadSettings()
    }, [loadSettings]),
  )

  const togglePublicFigure = (value: boolean) => {
    if (value) {
      // Confirmation Dialog
      Alert.alert(
        _(msg`Become a Public Figure?`),
        _(
          msg`By enabling this, your Real Name (verified via INE) will be displayed on your profile. All your Votes, RAQ Answers, and Highlights will be made public automatically. This status is intended for candidates, officials, and public representatives.`,
        ),
        [
          {
            text: _(msg`Cancel`),
            style: 'cancel',
          },
          {
            text: _(msg`Confirm`),
            style: 'destructive',
            onPress: () => {
              void applyPublicFigureChanges(true)
            },
          },
        ],
      )
    } else {
      void applyPublicFigureChanges(false)
    }
  }

  const syncVisibilityToServer = async (
    updates: Partial<
      Pick<
        ParaIdentityRecord,
        'publicVotes' | 'publicRaq' | 'publicHighlights'
      >
    >,
  ) => {
    try {
      if (!currentAccount) return
      const identity = await fetchParaIdentity(agent, currentAccount.did)
      await putParaIdentity(agent, currentAccount.did, {
        isVerifiedPublicFigure: identity?.isVerifiedPublicFigure ?? false,
        proofBlob: identity?.proofBlob,
        verifiedAt: identity?.verifiedAt,
        publicVotes: identity?.publicVotes ?? false,
        publicRaq: identity?.publicRaq ?? false,
        publicHighlights: identity?.publicHighlights ?? false,
        state: identity?.state,
        compassPosition: identity?.compassPosition,
        party: identity?.party,
        ...updates,
      })
    } catch (e) {
      console.error('Failed to sync visibility to server', e)
    }
  }

  const applyPublicFigureChanges = async (value: boolean) => {
    try {
      if (!currentAccount) {
        throw new Error('No active account')
      }

      await putParaIdentity(agent, currentAccount.did, {
        isVerifiedPublicFigure: value,
      })

      setIsPublicFigure(value)
      await AsyncStorage.setItem('para_is_public_figure', value.toString())

      if (value) {
        setVotesPublic(true)
        setRaqPublic(true)
        setHighlightsPublic(true)
        await Promise.all([
          AsyncStorage.setItem('para_public_votes', 'true'),
          AsyncStorage.setItem('para_public_raq', 'true'),
          AsyncStorage.setItem('para_public_highlights', 'true'),
        ])
        await syncVisibilityToServer({
          publicVotes: true,
          publicRaq: true,
          publicHighlights: true,
        })
        Toast.show(_(msg`Public Figure mode enabled`))
      } else {
        Toast.show(_(msg`Public Figure mode disabled`))
      }
    } catch (e) {
      console.error('Failed to update public figure status', e)
      Toast.show(_(msg`Could not update public figure status`))
    }
  }

  const toggleSetting = async (
    key: string,
    currentVal: boolean,
    setFunc: (val: boolean) => void,
    name: string,
    serverKey: 'publicVotes' | 'publicRaq' | 'publicHighlights',
  ) => {
    if (isPublicFigure) return

    try {
      const newVal = !currentVal
      setFunc(newVal)
      await AsyncStorage.setItem(key, newVal.toString())
      await syncVisibilityToServer({[serverKey]: newVal})
    } catch (e) {
      console.error(`Failed to update ${name}`, e)
    }
  }

  if (loading) {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Profile Visibility</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.Group>
            <SettingsList.ItemIcon icon={GlobeIcon} />
            <SettingsList.ItemText>
              <Trans>Public Figure</Trans>
            </SettingsList.ItemText>
            <View style={[a.pb_sm, a.pt_xs]}>
              <Text
                style={[
                  a.text_sm,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>
                  Enabling Public Figure mode will make your profile fully
                  public and display your verified Real Name. This is intended
                  for public officials.
                </Trans>
              </Text>
            </View>
            <Toggle.Item
              name="public_figure"
              label={_(msg`Public Figure Mode`)}
              value={isPublicFigure}
              onChange={togglePublicFigure}
              style={[a.w_full, a.py_xs]}>
              <Toggle.LabelText style={[a.flex_1]}>
                <Trans>Enable Public Figure Status</Trans>
              </Toggle.LabelText>
              <Toggle.Platform />
            </Toggle.Item>
          </SettingsList.Group>

          <SettingsList.Divider />

          <SettingsList.Group>
            <SettingsList.ItemIcon icon={EyeIcon} />
            <SettingsList.ItemText>
              <Trans>Detailed Visibility</Trans>
            </SettingsList.ItemText>
            <View style={[a.pb_sm, a.pt_xs]}>
              <Text
                style={[
                  a.text_sm,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>
                  {isPublicFigure
                    ? 'These settings are locked because you are a Public Figure.'
                    : 'Customize what is visible on your profile.'}
                </Trans>
              </Text>
            </View>

            <Toggle.Item
              name="votes"
              label={_(msg`Show Votes on Profile`)}
              value={votesPublic}
              disabled={isPublicFigure}
              onChange={() =>
                void toggleSetting(
                  'para_public_votes',
                  votesPublic,
                  setVotesPublic,
                  'Votes',
                  'publicVotes',
                )
              }
              style={[a.w_full, a.py_xs]}>
              <Toggle.LabelText style={[a.flex_1]}>
                <Trans>Votes</Trans>
              </Toggle.LabelText>
              <Toggle.Platform />
            </Toggle.Item>

            <Toggle.Item
              name="raq"
              label={_(msg`Show RAQ Answers on Profile`)}
              value={raqPublic}
              disabled={isPublicFigure}
              onChange={() =>
                void toggleSetting(
                  'para_public_raq',
                  raqPublic,
                  setRaqPublic,
                  'RAQ',
                  'publicRaq',
                )
              }
              style={[a.w_full, a.py_xs]}>
              <Toggle.LabelText style={[a.flex_1]}>
                <Trans>RAQ Answers</Trans>
              </Toggle.LabelText>
              <Toggle.Platform />
            </Toggle.Item>

            <Toggle.Item
              name="highlights"
              label={_(msg`Show Highlights on Profile`)}
              value={highlightsPublic}
              disabled={isPublicFigure}
              onChange={() =>
                void toggleSetting(
                  'para_public_highlights',
                  highlightsPublic,
                  setHighlightsPublic,
                  'Highlights',
                  'publicHighlights',
                )
              }
              style={[a.w_full, a.py_xs]}>
              <Toggle.LabelText style={[a.flex_1]}>
                <Trans>Highlights</Trans>
              </Toggle.LabelText>
              <Toggle.Platform />
            </Toggle.Item>
          </SettingsList.Group>
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}
