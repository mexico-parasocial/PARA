import {useCallback, useEffect, useMemo, useState} from 'react'
import {ActivityIndicator, Alert, RefreshControl, View} from 'react-native'
import {type I18n} from '@lingui/core'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {getDefaultChatIdentityMode} from '#/lib/chat/identity'
import {buildAnonymousGermContactButton} from '#/lib/germ/messageMe'
import {
  getAnonymousIdentities,
  patchAnonymousIdentity,
  patchAnonymousPostDmPolicy,
  postAnonymousGermLink,
  postAnonymousGermUnlink,
  postAnonymousIdentity,
} from '#/lib/im8/api'
import {useAnonymousMode} from '#/lib/im8/hooks/useAnonymousMode'
import {type AnonymousIdentityCard} from '#/lib/im8/types'
import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {ChatIdentityPill} from '#/components/chat/ChatIdentityPill'
import * as TextField from '#/components/forms/TextField'
import {GermContactButton} from '#/components/germ/GermContactButton'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {
  Card,
  EmptyNoteText,
  Pill,
  SectionHeading,
} from './components/IdentityPrimitives'

/**
 * Anonymous voices held by m8 (mubEZ `/v1/anonymous/identities`). The tier is
 * assigned by m8: the folded default profile is the followable "main" voice,
 * every other card is a burner.
 */
export default function AnonymousIdentitiesScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {profile: anonProfile} = useAnonymousMode()
  const [identities, setIdentities] = useState<AnonymousIdentityCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [contactUrls, setContactUrls] = useState<Record<string, string>>({})

  const mainVoice = identities.find(i => i.tier === 'main')
  const burnerVoices = identities.filter(i => i.tier !== 'main')

  const load = useCallback(async () => {
    try {
      const data = await getAnonymousIdentities()
      setIdentities(data.identities)
      setLoadError(false)
    } catch (err) {
      console.warn('[m8] Failed to load anonymous identities:', err)
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  /** Runs one m8 mutation with a busy marker, then reloads. */
  const run = useCallback(
    async (key: string, failTitle: string, action: () => Promise<unknown>) => {
      try {
        setBusyId(key)
        await action()
        await load()
      } catch (err) {
        Alert.alert(failTitle, getMessage(_, err))
      } finally {
        setBusyId(null)
      }
    },
    [_, load],
  )

  const createVoice = useCallback(
    (burnAfter: 'none' | 'post') =>
      run(
        burnAfter === 'post' ? 'new-burn' : 'new',
        _(msg`Could not create voice`),
        () =>
          postAnonymousIdentity(
            burnAfter === 'post'
              ? {surface: 'civic', burnAfter: 'post'}
              : {surface: 'civic'},
          ),
      ),
    [_, run],
  )

  const linkGerm = useCallback(
    (identity: AnonymousIdentityCard) => {
      const contactUrl = contactUrls[identity.id]?.trim()
      if (!contactUrl) {
        Alert.alert(
          _(msg`Germ link required`),
          _(msg`Paste a Germ burner-card or contact link first.`),
        )
        return
      }
      void run(identity.id, _(msg`Could not link Germ`), () =>
        postAnonymousGermLink(identity.id, {
          contactUrl,
          mode: 'germ-card-link',
        }),
      )
    },
    [_, contactUrls, run],
  )

  const toggleReplies = useCallback(
    (identity: AnonymousIdentityCard, enabled: boolean) =>
      run(identity.id, _(msg`Could not update private replies`), async () => {
        for (const post of identity.posts) {
          await patchAnonymousPostDmPolicy(
            post.id,
            enabled ? 'requests' : 'off',
          )
        }
      }),
    [_, run],
  )

  const activeCount = useMemo(
    () => identities.filter(identity => identity.status === 'active').length,
    [identities],
  )

  if (loading) {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center, a.p_xl]}>
        <ActivityIndicator />
      </View>
    )
  }

  const cardHandlers = (identity: AnonymousIdentityCard) => ({
    contactUrl: contactUrls[identity.id] ?? '',
    busy: busyId === identity.id,
    onContactUrlChange: (value: string) =>
      setContactUrls(prev => ({...prev, [identity.id]: value})),
    onLinkGerm: () => linkGerm(identity),
    onUnlinkGerm: () => {
      void run(identity.id, _(msg`Could not unlink Germ`), () =>
        postAnonymousGermUnlink(identity.id),
      )
    },
    onEnableReplies: () => {
      void toggleReplies(identity, true)
    },
    onDisableReplies: () => {
      void toggleReplies(identity, false)
    },
  })

  return (
    <Layout.Content
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void onRefresh()
          }}
        />
      }
      contentContainerStyle={[a.p_lg, a.gap_md]}>
      <View style={[a.flex_row, a.align_center, a.justify_between, a.gap_sm]}>
        <Text style={[a.flex_1, a.text_sm, t.atoms.text_contrast_medium]}>
          {_(
            plural(activeCount, {
              one: '# active voice',
              other: '# active voices',
            }),
          )}
        </Text>
        <Button
          label={_(msg`Create a one-post voice`)}
          size="small"
          variant="outline"
          color="secondary"
          disabled={busyId !== null}
          onPress={() => {
            void createVoice('post')
          }}>
          <ButtonText>
            <Trans>One-post voice</Trans>
          </ButtonText>
        </Button>
        <Button
          label={_(msg`Create a burner voice`)}
          size="small"
          variant="solid"
          color="primary"
          disabled={busyId !== null}
          onPress={() => {
            void createVoice('none')
          }}>
          <ButtonText>
            <Trans>New voice</Trans>
          </ButtonText>
        </Button>
      </View>

      {loadError ? (
        <Card>
          <Text style={[a.text_sm]}>
            <Trans>Could not load your anonymous voices from m8.</Trans>
          </Text>
          <Button
            label={_(msg`Try again`)}
            size="small"
            variant="solid"
            color="secondary"
            style={[a.self_start]}
            onPress={() => {
              void onRefresh()
            }}>
            <ButtonText>
              <Trans>Try again</Trans>
            </ButtonText>
          </Button>
        </Card>
      ) : identities.length === 0 ? (
        <EmptyNoteText>
          <Trans>No anonymous voices yet.</Trans>
        </EmptyNoteText>
      ) : null}

      {mainVoice && anonProfile ? (
        <>
          <SectionHeading
            title={_(msg`Main voice`)}
            detail={_(msg`Followable. Your default anonymous profile.`)}
          />
          <IdentityCard
            identity={mainVoice}
            tier="main"
            {...cardHandlers(mainVoice)}
            onOpenVoice={() =>
              navigation.navigate('AnonymousVoice', {
                profileId: anonProfile.id,
              })
            }
          />
        </>
      ) : null}

      {burnerVoices.length > 0 ? (
        <>
          <SectionHeading
            title={_(msg`Burner voices`)}
            detail={_(msg`Unlinkable, never followable.`)}
          />
          {burnerVoices.map(identity => (
            <IdentityCard
              key={identity.id}
              identity={identity}
              tier="burner"
              {...cardHandlers(identity)}
              onArchive={() => {
                void run(identity.id, _(msg`Could not archive voice`), () =>
                  patchAnonymousIdentity(identity.id, {status: 'archived'}),
                )
              }}
            />
          ))}
        </>
      ) : null}
      <View style={[a.pb_lg]} />
    </Layout.Content>
  )
}

function IdentityCard({
  identity,
  tier,
  contactUrl,
  busy,
  onOpenVoice,
  onContactUrlChange,
  onArchive,
  onLinkGerm,
  onUnlinkGerm,
  onEnableReplies,
  onDisableReplies,
}: {
  identity: AnonymousIdentityCard
  tier: 'main' | 'burner'
  contactUrl: string
  busy: boolean
  onOpenVoice?: () => void
  onContactUrlChange: (value: string) => void
  // m8 has no archive path for the main voice in PARA; burners only.
  onArchive?: () => void
  onLinkGerm: () => void
  onUnlinkGerm: () => void
  onEnableReplies: () => void
  onDisableReplies: () => void
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const isActive = identity.status === 'active'
  const deviceTrusted = identity.deviceTrust.status === 'trusted'
  const germLinked = identity.germ?.status === 'active'
  const repliesEnabled = identity.posts.some(
    post => post.dmPolicy === 'requests',
  )
  const isolatedIdentityMode = getDefaultChatIdentityMode('isolated_post')
  const germContact = buildAnonymousGermContactButton(
    identity.germ?.status === 'active' && repliesEnabled
      ? {
          dmEnabled: true,
          provider: 'germ',
          label: 'Private reply via Germ DM',
          contactUrl: identity.germ.contactUrl,
        }
      : {dmEnabled: false},
  )
  // Mirrors m8: linking Germ requires a trusted device and an active card.
  const canLinkGerm = isActive && deviceTrusted
  const canEnableReplies =
    isActive && germLinked && deviceTrusted && identity.posts.length > 0

  const meta = [
    surfaceLabel(i18n, identity.surface),
    isActive ? _(msg`Active`) : _(msg`Archived`),
    identity.burnAfter === 'post' ? _(msg`Rotates after each post`) : null,
  ].filter(Boolean)

  return (
    <Card style={[a.gap_md]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm]}>
        <View
          style={[
            a.rounded_full,
            a.align_center,
            a.justify_center,
            {
              width: 40,
              height: 40,
              backgroundColor: colorFromSeed(identity.avatarSeed),
            },
          ]}>
          <Text style={[a.text_lg, a.font_bold, {color: 'white'}]}>
            {identity.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={[a.flex_1, a.gap_2xs]}>
          <Text
            style={[a.text_md, a.font_semi_bold, t.atoms.text]}
            numberOfLines={1}>
            {identity.displayName}
          </Text>
          <Text
            style={[a.text_xs, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            {meta.join(' · ')}
          </Text>
        </View>
      </View>

      <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
        <Pill
          label={tier === 'main' ? _(msg`Main voice`) : _(msg`Burner`)}
          tone={tier === 'main' ? 'positive' : 'neutral'}
        />
        <Pill
          label={
            deviceTrusted ? _(msg`Trusted device`) : _(msg`Device not trusted`)
          }
          tone={deviceTrusted ? 'positive' : 'warning'}
        />
        {identity.proofBadges.map(badge => (
          <Pill
            key={`${identity.id}-${badge.claimType}`}
            label={badge.label}
            tone="neutral"
          />
        ))}
      </View>

      {tier === 'main' && onOpenVoice ? (
        <Button
          label={_(msg`Open voice profile`)}
          size="small"
          variant="solid"
          color="primary_subtle"
          style={[a.self_start]}
          onPress={onOpenVoice}>
          <ButtonText>
            <Trans>Open voice profile · followers & karma</Trans>
          </ButtonText>
        </Button>
      ) : null}

      <ChatIdentityPill mode={isolatedIdentityMode} />

      <View style={[a.flex_row, a.gap_sm]}>
        <Metric label={_(msg`Posts`)} value={String(identity.posts.length)} />
        <Metric
          label={_(msg`Proofs`)}
          value={String(identity.proofBadges.length)}
        />
        <Metric
          label={_(msg`Germ`)}
          value={germLinked ? _(msg`Linked`) : _(msg`Off`)}
        />
      </View>

      <View style={[a.gap_sm]}>
        {identity.posts.length === 0 ? (
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>
              Posts from this voice appear here once PARA links them.
            </Trans>
          </Text>
        ) : (
          identity.posts.slice(0, 3).map(post => (
            <View key={post.id} style={[a.gap_xs]}>
              <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                <Text
                  style={[a.flex_1, a.text_xs, t.atoms.text]}
                  numberOfLines={1}>
                  {post.postUri}
                </Text>
                <Pill
                  label={
                    post.dmPolicy === 'requests'
                      ? _(msg`Replies on`)
                      : _(msg`Replies off`)
                  }
                  tone={post.dmPolicy === 'requests' ? 'positive' : 'neutral'}
                />
              </View>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {[
                  _(msg`${formatCount(post.stats.threadCount)} threads`),
                  _(msg`${formatCount(post.stats.replyCount)} replies`),
                  _(msg`${formatCount(post.stats.likeCount)} likes`),
                  _(msg`${formatCount(post.stats.quoteCount)} quotes`),
                ].join(' · ')}
              </Text>
            </View>
          ))
        )}
      </View>

      {!germLinked && isActive ? (
        <View style={[a.gap_xs]}>
          <TextField.Root>
            <TextField.Input
              label={_(msg`Germ contact link`)}
              value={contactUrl}
              onChangeText={onContactUrlChange}
              placeholder="https://landing.ger.mx/..."
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </TextField.Root>
          <Text
            style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
            {deviceTrusted ? (
              <Trans>m8 rejects links that include your account DID.</Trans>
            ) : (
              <Trans>
                m8 only links Germ from a trusted device. m8 rejects links that
                include your account DID.
              </Trans>
            )}
          </Text>
        </View>
      ) : null}

      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        {germContact && (
          <GermContactButton url={germContact.url} label={_(msg`Open Germ`)} />
        )}
        {germLinked ? (
          <ActionButton
            label={_(msg`Unlink Germ`)}
            disabled={busy}
            onPress={onUnlinkGerm}
          />
        ) : (
          <ActionButton
            label={_(msg`Link Germ`)}
            disabled={busy || !canLinkGerm}
            onPress={onLinkGerm}
          />
        )}
        {repliesEnabled ? (
          <ActionButton
            label={_(msg`Turn off replies`)}
            disabled={busy}
            onPress={onDisableReplies}
          />
        ) : (
          <ActionButton
            label={_(msg`Allow private replies`)}
            disabled={busy || !canEnableReplies}
            onPress={onEnableReplies}
          />
        )}
        {onArchive ? (
          <ActionButton
            label={_(msg`Archive`)}
            disabled={busy || !isActive}
            onPress={onArchive}
          />
        ) : null}
      </View>
    </Card>
  )
}

function Metric({label, value}: {label: string; value: string}) {
  const t = useTheme()
  return (
    <View style={[a.flex_1, a.gap_2xs]}>
      <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>{value}</Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>{label}</Text>
    </View>
  )
}

function ActionButton({
  label,
  disabled,
  onPress,
}: {
  label: string
  disabled: boolean
  onPress: () => void
}) {
  return (
    <Button
      label={label}
      size="small"
      variant="outline"
      color="secondary"
      disabled={disabled}
      onPress={onPress}>
      <ButtonText>{label}</ButtonText>
    </Button>
  )
}

// Surface names as the iM8 wallet shows them (SURFACE_META).
function surfaceLabel(i18n: I18n, surface: AnonymousIdentityCard['surface']) {
  switch (surface) {
    case 'civic':
      return 'PARA'
    case 'public':
      return i18n._(msg`Public`)
    default:
      return surface
  }
}

function colorFromSeed(seed: string) {
  const colors = ['#176B87', '#3D7068', '#8A5A44', '#5C6F68', '#7A4E7D']
  const index =
    seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    colors.length
  return colors[index]
}

function getMessage(_: I18n['_'], err: unknown) {
  return err instanceof Error ? err.message : _(msg`Please try again.`)
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${Math.floor(value / 100_000) / 10}M`
  if (value >= 1_000) return `${Math.floor(value / 100) / 10}K`
  return String(value)
}
