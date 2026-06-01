import {memo, useMemo, useState} from 'react'
import {View} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'
import {
  type AppBskyActorDefs,
  moderateProfile,
  type ModerationDecision,
  type ModerationOpts,
  type RichText as RichTextAPI,
} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type ParaIdentityRecord} from '#/lib/api/para-lexicons'
import {extractPartyInsignia} from '#/lib/civic-insignias'
import {
  COMPASS_COLORS,
  COMPASS_CROSS_GRADIENTS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {
  buildGermAssociatedProfileButton,
  type GermAssociatedProfile,
} from '#/lib/germ/messageMe'
import {useHaptics} from '#/lib/haptics'
import {useAnonymousMode} from '#/lib/m8/hooks/useAnonymousMode'
import {formatUserDisplayName} from '#/lib/strings/profile-names'
import {logger} from '#/logger'
import {type Shadow, useProfileShadow} from '#/state/cache/profile-shadow'
import {
  useProfileBlockMutationQueue,
  useProfileFollowMutationQueue,
} from '#/state/queries/profile'
import {useRequireAuth, useSession} from '#/state/session'
import {ProfileMenu} from '#/view/com/profile/ProfileMenu'
import {atoms as a, platform, useBreakpoints, useTheme} from '#/alf'
import {SubscribeProfileButton} from '#/components/activity-notifications/SubscribeProfileButton'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {CivicInsignia} from '#/components/CivicInsignia'
import {DebugFieldDisplay} from '#/components/DebugFieldDisplay'
import {useDialogControl} from '#/components/Dialog'
import {MessageProfileButton} from '#/components/dms/MessageProfileButton'
import {GermContactButton} from '#/components/germ/GermContactButton'
import {PlusLarge_Stroke2_Corner0_Rounded as Plus} from '#/components/icons/Plus'
import {
  KnownFollowers,
  shouldShowKnownFollowers,
} from '#/components/KnownFollowers'
import * as Prompt from '#/components/Prompt'
import {RichText} from '#/components/RichText'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {useSimpleVerificationState} from '#/components/verification'
import {VerificationCheckButton} from '#/components/verification/VerificationCheckButton'
import {IS_IOS} from '#/env'
import {useActorStatus} from '#/features/liveNow'
import {EditProfileDialog} from './EditProfileDialog'
import {ProfileHeaderHandle} from './Handle'
import {ProfileHeaderMetrics} from './Metrics'
import {ProfileHeaderShell} from './Shell'
import {ProfileHeaderSuggestedFollows} from './SuggestedFollows'

interface Props {
  profile: AppBskyActorDefs.ProfileViewDetailed
  descriptionRT: RichTextAPI | null
  moderationOpts: ModerationOpts
  hideBackButton?: boolean
  isPlaceholderProfile?: boolean
  paraIdentity?: ParaIdentityRecord | null
}

let ProfileHeaderStandard = ({
  profile: profileUnshadowed,
  descriptionRT,
  moderationOpts,
  hideBackButton = false,
  isPlaceholderProfile,
  paraIdentity,
}: Props): React.ReactNode => {
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const profile =
    useProfileShadow<AppBskyActorDefs.ProfileViewDetailed>(profileUnshadowed)
  const {currentAccount} = useSession()
  const {isEnabled: isAnonymous, profile: anonProfile} = useAnonymousMode()
  const isCurrentUserAnonymous =
    currentAccount?.did === profile.did && isAnonymous
  const {_} = useLingui()
  const moderation = useMemo(
    () => moderateProfile(profile, moderationOpts),
    [profile, moderationOpts],
  )
  const verification = useSimpleVerificationState({profile})
  const [, queueUnblock] = useProfileBlockMutationQueue(profile)
  const unblockPromptControl = Prompt.usePromptControl()
  const [showSuggestedFollows, setShowSuggestedFollows] = useState(false)
  const [hasSeenAllSuggestedFollows, setHasSeenAllSuggestedFollows] =
    useState(false)
  const isBlockedUser =
    profile.viewer?.blocking ||
    profile.viewer?.blockedBy ||
    profile.viewer?.blockingByList

  const unblockAccount = async () => {
    try {
      await queueUnblock()
      Toast.show(_(msg({message: 'Account unblocked', context: 'toast'})))
    } catch (err) {
      const e = err as Error
      if (e?.name !== 'AbortError') {
        logger.error('Failed to unblock account', {message: e})
        Toast.show(_(msg`There was an issue! ${e.toString()}`), {type: 'error'})
      }
    }
  }

  const onRequestHide = () => {
    setHasSeenAllSuggestedFollows(true)
    setShowSuggestedFollows(false)
  }

  const isMe = currentAccount?.did === profile.did

  const {isActive: live} = useActorStatus(profile)

  return (
    <>
      <ProfileHeaderShell
        profile={profile}
        moderation={moderation}
        hideBackButton={hideBackButton}
        isPlaceholderProfile={isPlaceholderProfile}>
        <View
          style={[a.px_lg, a.pt_md, a.pb_sm, a.overflow_hidden]}
          pointerEvents={IS_IOS ? 'auto' : 'box-none'}>
          <View
            style={[
              {paddingLeft: 90},
              a.flex_row,
              a.align_center,
              a.justify_end,
              a.gap_xs,
              a.pb_sm,
              a.flex_wrap,
            ]}
            pointerEvents={IS_IOS ? 'auto' : 'box-none'}>
            <HeaderStandardButtons
              profile={profile}
              moderation={moderation}
              moderationOpts={moderationOpts}
              onFollow={() => setShowSuggestedFollows(true)}
              onUnfollow={() => setShowSuggestedFollows(false)}
            />
          </View>
          <View
            style={[a.flex_col, a.gap_xs, a.pb_sm, live ? a.pt_sm : a.pt_2xs]}>
            <View style={[a.flex_row, a.align_center, a.gap_xs, a.flex_1]}>
              <Text
                emoji
                testID="profileHeaderDisplayName"
                style={[
                  t.atoms.text,
                  gtMobile ? a.text_4xl : a.text_3xl,
                  a.self_start,
                  a.font_bold,
                  a.leading_tight,
                ]}>
                {formatUserDisplayName({
                  displayName: isCurrentUserAnonymous
                    ? anonProfile?.displayName
                    : profile.displayName,
                  handle: profile.handle,
                  isFigure: isCurrentUserAnonymous ? false : verification.isVerified,
                  isAnonymous: isCurrentUserAnonymous,
                  moderation: moderation.ui('displayName'),
                })}
                <View style={[a.pl_xs, {marginTop: platform({ios: 2})}]}>
                  <VerificationCheckButton profile={profile} size="lg" />
                </View>
              </Text>
            </View>
            <ProfileHeaderHandle profile={profile} />
            <ProfileCivicBadges
              profile={profile}
              paraIdentity={paraIdentity}
              verification={verification}
            />
          </View>
          {!isPlaceholderProfile && !isBlockedUser && (
            <View style={a.gap_md}>
              <ProfileHeaderMetrics profile={profile} />
              {descriptionRT && !moderation.ui('profileView').blur ? (
                <View pointerEvents="auto">
                  <RichText
                    testID="profileHeaderDescription"
                    style={[a.text_md]}
                    numberOfLines={15}
                    selectable
                    value={descriptionRT}
                    enableTags
                    authorHandle={profile.handle}
                  />
                </View>
              ) : undefined}

              {!isMe &&
                !isBlockedUser &&
                shouldShowKnownFollowers(profile.viewer?.knownFollowers) && (
                  <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                    <KnownFollowers
                      profile={profile}
                      moderationOpts={moderationOpts}
                    />
                  </View>
                )}
            </View>
          )}

          <DebugFieldDisplay subject={profile} />
        </View>

        <Prompt.Basic
          control={unblockPromptControl}
          title={_(msg`Unblock Account?`)}
          description={_(
            msg`The account will be able to interact with you after unblocking.`,
          )}
          onConfirm={() => {
            void unblockAccount()
          }}
          confirmButtonCta={
            profile.viewer?.blocking ? _(msg`Unblock`) : _(msg`Block`)
          }
          confirmButtonColor="negative"
        />
      </ProfileHeaderShell>

      <ProfileHeaderSuggestedFollows
        isExpanded={!hasSeenAllSuggestedFollows && showSuggestedFollows}
        actorDid={profile.did}
        onRequestHide={onRequestHide}
      />
    </>
  )
}

ProfileHeaderStandard = memo(ProfileHeaderStandard)
export {ProfileHeaderStandard}

function ProfileCivicBadges({
  profile,
  paraIdentity,
  verification,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  paraIdentity?: ParaIdentityRecord | null
  verification: {isVerified: boolean}
}) {
  const t = useTheme()

  // Extract party insignia from display name or description if available
  const {insignia} = useMemo(
    () => extractPartyInsignia(profile.displayName || profile.description || ''),
    [profile.displayName, profile.description],
  )

  const compassPos = paraIdentity?.compassPosition as CompassPositionId | undefined
  const compassColor = compassPos ? COMPASS_COLORS[compassPos] : undefined
  const compassGradient = compassPos ? COMPASS_CROSS_GRADIENTS[compassPos] : undefined

  const badges: React.ReactNode[] = []

  // Verification badge
  if (verification.isVerified) {
    badges.push(
      <View
        key="verified"
        style={[
          a.flex_row,
          a.align_center,
          a.gap_xs,
          a.rounded_full,
          a.px_md,
          a.py_xs,
          {backgroundColor: `${t.palette.primary_500}15`},
        ]}>
        <VerificationCheckButton profile={profile} size="sm" />
        <Text style={[a.text_sm, a.font_bold, {color: t.palette.primary_500}]}>
          <Trans>Verified Citizen</Trans>
        </Text>
      </View>,
    )
  }

  // Public Figure badge
  if (paraIdentity?.isVerifiedPublicFigure) {
    badges.push(
      <View
        key="public-figure"
        style={[
          a.flex_row,
          a.align_center,
          a.gap_xs,
          a.rounded_full,
          a.px_md,
          a.py_xs,
          {backgroundColor: `${t.palette.negative_500}15`},
        ]}>
        <Text style={[a.text_sm, a.font_bold, {color: t.palette.negative_500}]}>
          <Trans>Public Figure</Trans>
        </Text>
      </View>,
    )
  }

  // Compass position badge
  if (compassPos && compassColor) {
    badges.push(
      <View
        key="compass"
        style={[
          a.flex_row,
          a.align_center,
          a.gap_xs,
          a.rounded_full,
          a.px_md,
          a.py_xs,
          {overflow: 'hidden'},
        ]}>
        {compassGradient ? (
          <LinearGradient
            colors={compassGradient.colors as unknown as readonly [string, string, ...string[]]}
            start={compassGradient.start}
            end={compassGradient.end}
            style={[a.absolute, {borderRadius: 999}]}
          />
        ) : (
          <View style={[a.absolute, {backgroundColor: `${compassColor}25`, borderRadius: 999}]} />
        )}
        <Text style={[a.text_sm, a.font_bold, {color: compassColor}]}>
          {compassPos.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </View>,
    )
  }

  // State badge
  if (paraIdentity?.state) {
    badges.push(
      <View
        key="state"
        style={[
          a.flex_row,
          a.align_center,
          a.gap_xs,
          a.rounded_full,
          a.px_md,
          a.py_xs,
          {backgroundColor: `${t.palette.contrast_500}12`},
        ]}>
        <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_medium]}>
          {paraIdentity.state}
        </Text>
      </View>,
    )
  }

  // Party insignia badge
  if (insignia) {
    badges.push(
      <View
        key="party"
        style={[
          a.flex_row,
          a.align_center,
          a.gap_xs,
          a.rounded_full,
          a.px_md,
          a.py_xs,
          {backgroundColor: `${insignia.colors[0]}15`},
        ]}>
        <CivicInsignia
          variant="shield"
          abbreviation={insignia.abbreviation}
          colors={insignia.colors}
          size="sm"
        />
        <Text style={[a.text_sm, a.font_bold, {color: insignia.colors[0]}]}>
          {insignia.abbreviation}
        </Text>
      </View>,
    )
  }

  if (badges.length === 0) return null

  return (
    <View style={[a.flex_row, a.flex_wrap, a.gap_sm, a.pt_2xs]}>
      {badges}
    </View>
  )
}

export function HeaderStandardButtons({
  profile,
  moderation,
  moderationOpts,
  onFollow,
  onUnfollow,
  minimal,
}: {
  profile: Shadow<AppBskyActorDefs.ProfileViewDetailed>
  moderation: ModerationDecision
  moderationOpts: ModerationOpts
  onFollow?: () => void
  onUnfollow?: () => void
  minimal?: boolean
}) {
  const {_} = useLingui()
  const {hasSession, currentAccount} = useSession()
  const playHaptic = useHaptics()
  const requireAuth = useRequireAuth()
  const [queueFollow, queueUnfollow] = useProfileFollowMutationQueue(
    profile,
    'ProfileHeader',
  )
  const [, queueUnblock] = useProfileBlockMutationQueue(profile)
  const editProfileControl = useDialogControl()
  const unblockPromptControl = Prompt.usePromptControl()
  const verification = useSimpleVerificationState({profile})
  const formattedDisplayName = formatUserDisplayName({
    displayName: profile.displayName,
    handle: profile.handle,
    isFigure: verification.isVerified,
    moderation: moderation.ui('displayName'),
  })

  const isMe = currentAccount?.did === profile.did

  const onPressFollow = () => {
    playHaptic()
    requireAuth(async () => {
      try {
        await queueFollow()
        onFollow?.()
        Toast.show(_(msg`Following ${formattedDisplayName}`))
      } catch (err) {
        const e = err as Error
        if (e?.name !== 'AbortError') {
          logger.error('Failed to follow', {message: String(e)})
          Toast.show(_(msg`There was an issue! ${e.toString()}`), {
            type: 'error',
          })
        }
      }
    })
  }

  const onPressUnfollow = () => {
    playHaptic()
    requireAuth(async () => {
      try {
        await queueUnfollow()
        onUnfollow?.()
        Toast.show(_(msg`No longer following ${formattedDisplayName}`), {
          type: 'default',
        })
      } catch (err) {
        const e = err as Error
        if (e?.name !== 'AbortError') {
          logger.error('Failed to unfollow', {message: String(e)})
          Toast.show(_(msg`There was an issue! ${e.toString()}`), {
            type: 'error',
          })
        }
      }
    })
  }

  const unblockAccount = async () => {
    try {
      await queueUnblock()
      Toast.show(_(msg({message: 'Account unblocked', context: 'toast'})))
    } catch (err) {
      const e = err as Error
      if (e?.name !== 'AbortError') {
        logger.error('Failed to unblock account', {message: e})
        Toast.show(_(msg`There was an issue! ${e.toString()}`), {type: 'error'})
      }
    }
  }

  const subscriptionsAllowed = useMemo(() => {
    switch (profile.associated?.activitySubscription?.allowSubscriptions) {
      case 'followers':
      case undefined:
        return !!profile.viewer?.following
      case 'mutuals':
        return !!profile.viewer?.following && !!profile.viewer.followedBy
      case 'none':
      default:
        return false
    }
  }, [profile])
  const germButton = useMemo(
    () =>
      buildGermAssociatedProfileButton({
        germ: getAssociatedGerm(profile),
        profileDid: profile.did,
        viewerDid: currentAccount?.did,
        viewerIsFollowedByProfile: !!profile.viewer?.followedBy,
      }),
    [profile, currentAccount?.did],
  )

  return (
    <>
      {isMe ? (
        <>
          <Button
            testID="profileHeaderEditProfileButton"
            size="small"
            color="secondary"
            onPress={() => {
              playHaptic('Light')
              editProfileControl.open()
            }}
            label={_(msg`Edit profile`)}>
            <ButtonText>
              <Trans>Edit Profile</Trans>
            </ButtonText>
          </Button>
          <EditProfileDialog profile={profile} control={editProfileControl} />
        </>
      ) : profile.viewer?.blocking ? (
        profile.viewer?.blockingByList ? null : (
          <Button
            testID="unblockBtn"
            size="small"
            color="secondary"
            label={_(msg`Unblock`)}
            disabled={!hasSession}
            onPress={() => unblockPromptControl.open()}>
            <ButtonText>
              <Trans context="action">Unblock</Trans>
            </ButtonText>
          </Button>
        )
      ) : !profile.viewer?.blockedBy ? (
        <>
          {hasSession && (!minimal || profile.viewer?.following) && (
            <>
              {subscriptionsAllowed && (
                <SubscribeProfileButton
                  profile={profile}
                  moderationOpts={moderationOpts}
                  disableHint={minimal}
                />
              )}

              <MessageProfileButton profile={profile} />
              {germButton && (
                <GermContactButton url={germButton.url} label="Germ" />
              )}
            </>
          )}

          {(!minimal || !profile.viewer?.following) && (
            <Button
              testID={profile.viewer?.following ? 'unfollowBtn' : 'followBtn'}
              size="small"
              color={profile.viewer?.following ? 'secondary' : 'primary'}
              label={
                profile.viewer?.following
                  ? _(msg`Unfollow ${profile.handle}`)
                  : _(msg`Follow ${profile.handle}`)
              }
              onPress={
                profile.viewer?.following ? onPressUnfollow : onPressFollow
              }>
              {!profile.viewer?.following && <ButtonIcon icon={Plus} />}
              <ButtonText>
                {profile.viewer?.following ? (
                  <Trans>Following</Trans>
                ) : profile.viewer?.followedBy ? (
                  <Trans>Follow back</Trans>
                ) : (
                  <Trans>Follow</Trans>
                )}
              </ButtonText>
            </Button>
          )}
        </>
      ) : null}
      <ProfileMenu profile={profile} />

      <Prompt.Basic
        control={unblockPromptControl}
        title={_(msg`Unblock Account?`)}
        description={_(
          msg`The account will be able to interact with you after unblocking.`,
        )}
        onConfirm={() => {
          void unblockAccount()
        }}
        confirmButtonCta={_(msg`Unblock`)}
        confirmButtonColor="negative"
      />
    </>
  )
}

function getAssociatedGerm(
  profile: AppBskyActorDefs.ProfileViewDetailed,
): GermAssociatedProfile {
  const associated = profile.associated as
    | {germ?: GermAssociatedProfile}
    | undefined
  return associated?.germ ?? null
}
