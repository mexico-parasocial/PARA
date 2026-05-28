import {useCallback, useState} from 'react'
import {Alert, View} from 'react-native'
// eslint-disable-next-line import-x/no-unresolved
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useFocusEffect} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  getStoredAnonymousProfile,
  setStoredAnonymousProfile,
} from '#/lib/m8/anonymous'
import {
  getKarmaMe,
  getMe,
  postAnonymousDisable,
  postAnonymousEnable,
  putKarmaRevelation,
} from '#/lib/m8/api'
import {type AnonymousProfile} from '#/lib/m8/types'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useModalControls} from '#/state/modals'
import {useSession} from '#/state/session'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import {AgeAssuranceAccountCard} from '#/components/ageAssurance/AgeAssuranceAccountCard'
import {useDialogControl} from '#/components/Dialog'
import {BirthDateSettingsDialog} from '#/components/dialogs/BirthDateSettings'
import {
  EmailDialogScreenID,
  useEmailDialogControl,
} from '#/components/dialogs/EmailDialog'
import * as Toggle from '#/components/forms/Toggle'
import {At_Stroke2_Corner2_Rounded as AtIcon} from '#/components/icons/At'
import {BirthdayCake_Stroke2_Corner2_Rounded as BirthdayCakeIcon} from '#/components/icons/BirthdayCake'
import {Car_Stroke2_Corner2_Rounded as CarIcon} from '#/components/icons/Car'
import {Envelope_Stroke2_Corner2_Rounded as EnvelopeIcon} from '#/components/icons/Envelope'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlashIcon} from '#/components/icons/EyeSlash'
import {Freeze_Stroke2_Corner2_Rounded as FreezeIcon} from '#/components/icons/Freeze'
import {Group3_Stroke2_Corner0_Rounded as AttributesIcon} from '#/components/icons/Group'
import {Lock_Stroke2_Corner2_Rounded as LockIcon} from '#/components/icons/Lock'
import {PencilLine_Stroke2_Corner2_Rounded as PencilIcon} from '#/components/icons/Pencil'
import {Person_Stroke2_Corner2_Rounded as PersonIcon} from '#/components/icons/Person'
import {ShieldCheck_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Trash_Stroke2_Corner2_Rounded} from '#/components/icons/Trash'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {ChangeHandleDialog} from './components/ChangeHandleDialog'
import {ChangePasswordDialog} from './components/ChangePasswordDialog'
import {DeactivateAccountDialog} from './components/DeactivateAccountDialog'
import {ExportCarDialog} from './components/ExportCarDialog'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'AccountSettings'>
export function AccountSettingsScreen({navigation}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {openModal} = useModalControls()
  const emailDialogControl = useEmailDialogControl()
  const birthdayControl = useDialogControl()
  const changeHandleControl = useDialogControl()
  const changePasswordControl = useDialogControl()
  const exportCarControl = useDialogControl()
  const deactivateAccountControl = useDialogControl()

  const [anonymousMode, setAnonymousMode] = useState(true)
  const [anonProfile, setAnonProfile] = useState<AnonymousProfile | null>(null)
  const [loadingAnon, setLoadingAnon] = useState(false)

  const [karmaGlobal, setKarmaGlobal] = useState(0)
  const [revealGlobalKarma, setRevealGlobalKarma] = useState(false)
  const [loadingKarma, setLoadingKarma] = useState(false)

  const loadAnonymousMode = useCallback(async () => {
    try {
      const stored = await getStoredAnonymousProfile()
      if (stored) {
        setAnonProfile(stored)
        setAnonymousMode(true)
        return
      }
      const {anonymousProfile} = await getMe()
      if (anonymousProfile) {
        await setStoredAnonymousProfile(anonymousProfile)
        setAnonProfile(anonymousProfile)
        setAnonymousMode(true)
      } else {
        setAnonymousMode(false)
        setAnonProfile(null)
      }
    } catch (e) {
      console.error('Failed to load anonymous mode', e)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadAnonymousMode()
      void loadKarma()
    }, [loadAnonymousMode]),
  )

  const loadKarma = useCallback(async () => {
    try {
      const karma = await getKarmaMe()
      setKarmaGlobal(karma.global)
    } catch (e) {
      console.error('Failed to load karma', e)
    }
  }, [])

  const toggleRevealGlobalKarma = async (value: boolean) => {
    try {
      setLoadingKarma(true)
      await putKarmaRevelation({ revealGlobal: value })
      setRevealGlobalKarma(value)
      Toast.show(
        value
          ? _(msg`Global karma is now visible`)
          : _(msg`Global karma is now private`),
      )
    } catch (e) {
      Toast.show(_(msg`Failed to update karma visibility`))
    } finally {
      setLoadingKarma(false)
    }
  }

  const togglePublicFigureMode = async (value: boolean) => {
    // value = true means Public Figure Mode ON (anonymous OFF)
    // value = false means Public Figure Mode OFF (anonymous ON, default)
    try {
      setLoadingAnon(true)
      if (value) {
        // Reveal identity: disable anonymous mode
        Alert.alert(
          _(msg`Reveal Your Identity?`),
          _(msg`By enabling Public Figure mode, your real name and profile will be visible to everyone. This cannot be undone without re-verifying your identity.`),
          [
            {text: _(msg`Cancel`), style: 'cancel'},
            {
              text: _(msg`Confirm`),
              style: 'destructive',
              onPress: async () => {
                try {
                  await postAnonymousDisable()
                  await setStoredAnonymousProfile(null)
                  setAnonProfile(null)
                  setAnonymousMode(false)
                  Toast.show(_(msg`Public Figure mode enabled. Your identity is now public.`))
                } catch (e) {
                  Toast.show(_(msg`Failed to reveal identity`))
                } finally {
                  setLoadingAnon(false)
                }
              },
            },
          ],
        )
      } else {
        // Return to anonymous mode
        const isVerified = await AsyncStorage.getItem('para_ine_verified')
        if (isVerified !== 'true') {
          Alert.alert(
            _(msg`Restricted`),
            _(msg`You must verify your identity (INE) before returning to anonymous mode.`),
          )
          setLoadingAnon(false)
          return
        }
        const result = await postAnonymousEnable()
        const profile = result.anonymousProfile
        await setStoredAnonymousProfile(profile)
        setAnonProfile(profile)
        setAnonymousMode(true)
        Toast.show(_(msg`Anonymous mode restored: ${profile.displayName}`))
        setLoadingAnon(false)
      }
    } catch (e) {
      Toast.show(_(msg`Failed to update mode`))
      setLoadingAnon(false)
    }
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Account</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <Layout.Center>
          <SettingsList.Container>
            <SettingsList.Item>
              <SettingsList.ItemIcon icon={EnvelopeIcon} />
              {/* Tricky flexbox situation here: we want the email to truncate, but by default it will make the "Email" text wrap instead.
                  For numberOfLines to work, we need flex: 1 on the BadgeText, but that means it goes to width: 50% because the
                  ItemText is also flex: 1. So we need to set flex: 0 on the ItemText to prevent it from growing, but if we did that everywhere
                  it wouldn't push the BadgeText/Chevron/whatever to the right.
                  TODO: find a general solution for this. workaround in this case is to set the ItemText to flex: 1 and BadgeText to flex: 0 -sfn */}
              <SettingsList.ItemText style={[a.flex_0]}>
                <Trans>Email</Trans>
              </SettingsList.ItemText>
              {currentAccount && (
                <>
                  <SettingsList.BadgeText style={[a.flex_1]}>
                    {currentAccount.email || <Trans>(no email)</Trans>}
                  </SettingsList.BadgeText>
                  {currentAccount.emailConfirmed && (
                    <ShieldIcon fill={t.palette.primary_500} size="md" />
                  )}
                </>
              )}
            </SettingsList.Item>
            {currentAccount && !currentAccount.emailConfirmed && (
              <SettingsList.PressableItem
                label={_(msg`Verify your email`)}
                onPress={() =>
                  emailDialogControl.open({
                    id: EmailDialogScreenID.Verify,
                  })
                }
                style={[
                  a.my_xs,
                  a.mx_lg,
                  a.rounded_md,
                  {backgroundColor: t.palette.primary_50},
                ]}
                hoverStyle={[{backgroundColor: t.palette.primary_100}]}
                contentContainerStyle={[a.rounded_md, a.px_lg]}>
                <SettingsList.ItemIcon
                  icon={ShieldIcon}
                  color={t.palette.primary_500}
                />
                <SettingsList.ItemText
                  style={[{color: t.palette.primary_500}, a.font_semi_bold]}>
                  <Trans>Verify your email</Trans>
                </SettingsList.ItemText>
                <SettingsList.Chevron color={t.palette.primary_500} />
              </SettingsList.PressableItem>
            )}
            <SettingsList.PressableItem
              label={_(msg`Update email`)}
              onPress={() =>
                emailDialogControl.open({
                  id: EmailDialogScreenID.Update,
                })
              }>
              <SettingsList.ItemIcon icon={PencilIcon} />
              <SettingsList.ItemText>
                <Trans>Update email</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
            <SettingsList.PressableItem
              label={_(msg`Verify Identity (INE)`)}
              onPress={async () => {
                const isVerified = await AsyncStorage.getItem(
                  'para_ine_verified',
                )
                if (isVerified === 'true') {
                  Toast.show(_(msg`Your identity is already verified.`))
                  return
                }

                ;(navigation as Record<string, unknown>).navigate('INEVerification')
              }}>
              <SettingsList.ItemIcon icon={ShieldIcon} />
              <SettingsList.ItemText>
                <Trans>Verify Identity (INE)</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
            <SettingsList.Group>
              <SettingsList.ItemIcon icon={EyeSlashIcon} />
              <SettingsList.ItemText>
                <Trans>Identity</Trans>
              </SettingsList.ItemText>
              <View style={[a.pb_sm, a.pt_xs]}>
                <Text
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    You are anonymous by default. Verified citizens appear as
                    anonymous personas in communities unless they choose to reveal
                    their identity as a public figure.
                  </Trans>
                </Text>
              </View>
              <Toggle.Item
                name="public_figure_mode"
                label={_(msg`Public Figure Mode`)}
                value={!anonymousMode}
                onChange={togglePublicFigureMode}
                disabled={loadingAnon}
                style={[a.w_full, a.py_xs]}>
                <Toggle.LabelText style={[a.flex_1]}>
                  <Trans>Reveal My Identity (Public Figure)</Trans>
                </Toggle.LabelText>
                <Toggle.Platform />
              </Toggle.Item>
              {anonymousMode && anonProfile && (
                <View
                  style={[
                    a.flex_row,
                    a.align_center,
                    a.gap_sm,
                    a.py_xs,
                  ]}>
                  <Text
                    style={[
                      a.text_sm,
                      a.font_semi_bold,
                      t.atoms.text_contrast_high,
                    ]}>
                    {anonProfile.displayName}
                  </Text>
                  <Text style={[a.text_sm, t.atoms.text_contrast_low]}>
                    <Trans>Anonymous · Verified</Trans>
                  </Text>
                </View>
              )}
              {!anonymousMode && (
                <View
                  style={[
                    a.flex_row,
                    a.align_center,
                    a.gap_sm,
                    a.py_xs,
                  ]}>
                  <Text
                    style={[
                      a.text_sm,
                      a.font_semi_bold,
                      t.atoms.text_contrast_high,
                    ]}>
                    <Trans>Public Figure</Trans>
                  </Text>
                  <Text style={[a.text_sm, t.atoms.text_contrast_low]}>
                    <Trans>Identity Revealed</Trans>
                  </Text>
                </View>
              )}
            </SettingsList.Group>
            <SettingsList.Divider />
            <SettingsList.Group>
              <SettingsList.ItemIcon icon={ShieldIcon} />
              <SettingsList.ItemText>
                <Trans>Karma</Trans>
              </SettingsList.ItemText>
              <View style={[a.pb_sm, a.pt_xs]}>
                <Text
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Your reputation across communities. You control what others
                    can see.
                  </Trans>
                </Text>
              </View>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.gap_sm,
                  a.py_xs,
                ]}>
                <Text
                  style={[
                    a.text_sm,
                    a.font_semi_bold,
                    t.atoms.text_contrast_high,
                  ]}>
                  {karmaGlobal}
                </Text>
                <Text style={[a.text_sm, t.atoms.text_contrast_low]}>
                  <Trans>Global Karma</Trans>
                </Text>
              </View>
              <Toggle.Item
                name="reveal_global_karma"
                label={_(msg`Reveal Global Karma`)}
                value={revealGlobalKarma}
                onChange={toggleRevealGlobalKarma}
                disabled={loadingKarma}
                style={[a.w_full, a.py_xs]}>
                <Toggle.LabelText style={[a.flex_1]}>
                  <Trans>Reveal Global Karma</Trans>
                </Toggle.LabelText>
                <Toggle.Platform />
              </Toggle.Item>
            </SettingsList.Group>
            <SettingsList.Divider />
            <SettingsList.PressableItem
              label={_(msg`Profile Visibility`)}
              onPress={async () => {
                const isVerified = await AsyncStorage.getItem(
                  'para_verified_human',
                )
                if (isVerified !== 'true') {
                  Alert.alert(
                    _(msg`Restricted`),
                    _(
                      msg`You must verify your identity (INE) before configuring public visibility.`,
                    ),
                  )
                  return
                }
                navigation.push('ProfileVisibility')
              }}>
              <SettingsList.ItemIcon icon={AttributesIcon} />
              <SettingsList.ItemText>
                <Trans>Profile Visibility</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
            <SettingsList.LinkItem
              to="/settings/political-affiliation"
              label={_(msg`Political Affiliation`)}>
              <SettingsList.ItemIcon icon={PersonIcon} />
              <SettingsList.ItemText>
                <Trans>Political Affiliation</Trans>
              </SettingsList.ItemText>
            </SettingsList.LinkItem>
            <SettingsList.Divider />
            <SettingsList.PressableItem
              label={_(msg`Password`)}
              onPress={() => changePasswordControl.open()}>
              <SettingsList.ItemIcon icon={LockIcon} />
              <SettingsList.ItemText>
                <Trans>Password</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
            <SettingsList.PressableItem
              label={_(msg`Handle`)}
              accessibilityHint={_(msg`Opens change handle dialog`)}
              onPress={() => changeHandleControl.open()}>
              <SettingsList.ItemIcon icon={AtIcon} />
              <SettingsList.ItemText>
                <Trans>Handle</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
            <SettingsList.Item>
              <SettingsList.ItemIcon icon={BirthdayCakeIcon} />
              <SettingsList.ItemText>
                <Trans>Birthday</Trans>
              </SettingsList.ItemText>
              <SettingsList.BadgeButton
                label={_(msg`Edit`)}
                onPress={() => birthdayControl.open()}
              />
            </SettingsList.Item>
            <AgeAssuranceAccountCard style={[a.px_xl, a.pt_xs, a.pb_md]} />
            <SettingsList.Divider />
            <SettingsList.PressableItem
              label={_(msg`Export my data`)}
              onPress={() => exportCarControl.open()}>
              <SettingsList.ItemIcon icon={CarIcon} />
              <SettingsList.ItemText>
                <Trans>Export my data</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
            <SettingsList.PressableItem
              label={_(msg`Deactivate account`)}
              onPress={() => deactivateAccountControl.open()}
              destructive>
              <SettingsList.ItemIcon icon={FreezeIcon} />
              <SettingsList.ItemText>
                <Trans>Deactivate account</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
            <SettingsList.PressableItem
              label={_(msg`Delete account`)}
              onPress={() => openModal({name: 'delete-account'})}
              destructive>
              <SettingsList.ItemIcon icon={Trash_Stroke2_Corner2_Rounded} />
              <SettingsList.ItemText>
                <Trans>Delete account</Trans>
              </SettingsList.ItemText>
              <SettingsList.Chevron />
            </SettingsList.PressableItem>
          </SettingsList.Container>
        </Layout.Center>
      </Layout.Content>

      <BirthDateSettingsDialog control={birthdayControl} />
      <ChangeHandleDialog control={changeHandleControl} />
      <ChangePasswordDialog control={changePasswordControl} />
      <ExportCarDialog control={exportCarControl} />
      <DeactivateAccountDialog control={deactivateAccountControl} />
    </Layout.Screen>
  )
}
