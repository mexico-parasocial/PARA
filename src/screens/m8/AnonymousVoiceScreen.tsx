import {useCallback, useEffect, useState} from 'react'
import {ActivityIndicator, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  type AnonymousVoiceProfile,
  deleteAnonymousFollow,
  getAnonymousVoiceProfile,
  getKarmaProfile,
  postAnonymousFollow,
} from '#/lib/im8'
import {type FlatNavigatorParams} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<FlatNavigatorParams, 'AnonymousVoice'>

function colorFromSeed(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue}, 45%, 42%)`
}

/**
 * Public page for a default anonymous identity ("main voice"). Shows the
 * follower graph and karma, and lets visitors follow it. Isolated burner
 * identities have no page by design — the server rejects them with
 * ISOLATED_NOT_FOLLOWABLE, surfaced here as an explainer.
 */
export default function AnonymousVoiceScreen({route}: Props) {
  const {profileId} = route.params
  const t = useTheme()
  const {_} = useLingui()
  const [state, setState] = useState<
    | {status: 'loading'}
    | {status: 'ready'; voice: AnonymousVoiceProfile}
    | {status: 'isolated'}
    | {status: 'error'; message: string}
  >({status: 'loading'})
  const [karma, setKarma] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const voice = await getAnonymousVoiceProfile(profileId)
      setState({status: 'ready', voice})
      try {
        const k = await getKarmaProfile(profileId)
        setKarma(k.global)
      } catch {
        setKarma(null)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load voice'
      if (message.includes('Isolated') || message.includes('followable')) {
        setState({status: 'isolated'})
      } else {
        setState({status: 'error', message})
      }
    }
  }, [profileId])

  useEffect(() => {
    void load()
  }, [load])

  const toggleFollow = useCallback(async () => {
    if (state.status !== 'ready' || busy) return
    setBusy(true)
    try {
      const next = state.voice.following
        ? await deleteAnonymousFollow(profileId)
        : await postAnonymousFollow(profileId)
      setState({status: 'ready', voice: next})
    } finally {
      setBusy(false)
    }
  }, [state, busy, profileId])

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Anonymous voice</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <ScrollView contentContainerStyle={[a.p_lg, a.gap_lg]}>
          {state.status === 'loading' ? (
            <ActivityIndicator style={[a.mt_xl]} />
          ) : state.status === 'isolated' ? (
            <View style={[a.gap_sm]}>
              <Text style={[a.text_lg, a.font_bold]}>
                <Trans>Burner voices have no profile</Trans>
              </Text>
              <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
                <Trans>
                  This identity exists only for its own conversation. It cannot
                  be followed and carries no reputation — that is what keeps it
                  unlinkable.
                </Trans>
              </Text>
            </View>
          ) : state.status === 'error' ? (
            <Text style={[a.text_md, {color: t.palette.negative_500}]}>
              {state.message}
            </Text>
          ) : (
            <>
              <View style={[a.flex_row, a.align_center, a.gap_md]}>
                <View
                  style={[
                    a.align_center,
                    a.justify_center,
                    {
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: colorFromSeed(
                        state.voice.profile.avatarSeed,
                      ),
                    },
                  ]}>
                  <Text style={[a.text_2xl, {color: 'white'}]}>
                    {state.voice.profile.displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={[a.flex_1]}>
                  <Text style={[a.text_xl, a.font_bold]} numberOfLines={1}>
                    {state.voice.profile.displayName}
                  </Text>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    <Trans>Main voice · persistent anonymous identity</Trans>
                  </Text>
                </View>
              </View>

              <View style={[a.flex_row, a.gap_md]}>
                <View
                  style={[
                    a.flex_1,
                    a.p_md,
                    a.rounded_md,
                    a.align_center,
                    t.atoms.bg_contrast_25,
                  ]}>
                  <Text style={[a.text_xl, a.font_bold]}>
                    {state.voice.followerCount}
                  </Text>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    <Trans>Followers</Trans>
                  </Text>
                </View>
                <View
                  style={[
                    a.flex_1,
                    a.p_md,
                    a.rounded_md,
                    a.align_center,
                    t.atoms.bg_contrast_25,
                  ]}>
                  <Text style={[a.text_xl, a.font_bold]}>
                    {karma === null ? '—' : karma}
                  </Text>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    <Trans>Karma</Trans>
                  </Text>
                </View>
              </View>

              <Button
                variant={state.voice.following ? 'outline' : 'solid'}
                color={state.voice.following ? 'secondary' : 'primary'}
                size="large"
                label={
                  state.voice.following
                    ? _(msg`Unfollow this voice`)
                    : _(msg`Follow this voice`)
                }
                disabled={busy}
                onPress={toggleFollow}>
                <ButtonText>
                  {state.voice.following ? (
                    <Trans>Following</Trans>
                  ) : (
                    <Trans>Follow this voice</Trans>
                  )}
                </ButtonText>
              </Button>

              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>
                  Follows are kept inside m8 — they are never written to the
                  public social graph, so this voice stays unlinkable to its
                  owner's account.
                </Trans>
              </Text>
            </>
          )}
        </ScrollView>
      </Layout.Content>
    </Layout.Screen>
  )
}
