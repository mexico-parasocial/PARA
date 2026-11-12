import {Pressable, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {Image} from 'expo-image'
import {LinearGradient} from 'expo-linear-gradient'
import {plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type PartyFeedProfile} from '#/lib/party-feeds'
import {type NavigationProp} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ArrowLeft_Stroke2_Corner0_Rounded as ArrowLeftIcon} from '#/components/icons/Arrow'
import {Camera_Stroke2_Corner0_Rounded as CameraIcon} from '#/components/icons/Camera'
import {Message_Stroke2_Corner0_Rounded as ChatIcon} from '#/components/icons/Message'
import {PageText_Stroke2_Corner0_Rounded as DocsIcon} from '#/components/icons/Page'
import {Text} from '#/components/Typography'

/** Banner height below the status bar; the banner also fills the inset. */
const BANNER_HEIGHT = 132
/** How far the content sheet's rounded top rides up over the banner. */
const SHEET_OVERLAP = 24
const AVATAR_SIZE = 80
/** The ring that separates the avatar from the banner it overlaps. */
const AVATAR_RING = 4

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

type CommunityStats = {
  policyPosts: number
  matterPosts: number
  raqPosts: number
  visiblePosters: number
}

export function CommunityHero({
  displayCommunityName,
  plainCommunityName,
  brandColor,
  bannerUri,
  onPressEditBanner,
  isBannerPending,
  partyProfile,
  boardDescription,
  memberCount,
  postsCount,
  communityStats,
  isJoined,
  isDraft,
  isJoinPending,
  joinLeaveError,
  onPressJoin,
  onPressDocuments,
  onPressPolicies,
  onPressMatters,
  onPressRAQ,
  onPressVoters,
  onPressCommunityChat,
  unreadCount,
}: {
  displayCommunityName: string
  plainCommunityName: string
  brandColor: string
  /** Cover image. Without one the banner is the community's brand color. */
  bannerUri?: string
  /** Present for owners: lets them pick a new banner. */
  onPressEditBanner?: () => void
  isBannerPending?: boolean
  partyProfile: PartyFeedProfile | null
  boardDescription: string | undefined
  memberCount: number
  postsCount: number
  communityStats: CommunityStats
  isJoined: boolean
  isDraft: boolean
  isJoinPending: boolean
  joinLeaveError: Error | null
  onPressJoin: () => void
  onPressDocuments: () => void
  onPressPolicies: () => void
  onPressMatters: () => void
  onPressRAQ: () => void
  onPressVoters: () => void
  /** Absent when chat is off: no chat button. */
  onPressCommunityChat?: () => void
  unreadCount: number
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const {top: topInset} = useSafeAreaInsets()
  const navigation = useNavigation<NavigationProp>()

  const onPressBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('Home')
    }
  }

  const description = partyProfile?.description || boardDescription
  // The party logo (e.g. "MC") when there is one, else the first letter.
  const avatarLabel =
    partyProfile?.logo || plainCommunityName.charAt(0).toUpperCase()
  const accentColor = partyProfile?.accentColor || brandColor

  const joinLabel = isDraft
    ? isJoined
      ? l`Founding member`
      : l`Draft quorum`
    : isJoinPending
      ? isJoined
        ? l`Leaving…`
        : l`Joining…`
      : isJoined
        ? l`Joined`
        : l`Join`

  const stats = [
    {
      key: 'policies',
      label: l`Policies`,
      value: communityStats.policyPosts,
      onPress: onPressPolicies,
    },
    {
      key: 'matters',
      label: l`Matters`,
      value: communityStats.matterPosts,
      onPress: onPressMatters,
    },
    {
      key: 'raq',
      label: l`RAQ`,
      value: communityStats.raqPosts,
      onPress: onPressRAQ,
    },
    {
      key: 'voters',
      label: l`Voters`,
      value: communityStats.visiblePosters,
      onPress: onPressVoters,
    },
  ]

  const docsButton = (
    <Button
      label={l`Community documents`}
      size="small"
      color="secondary"
      shape="round"
      onPress={onPressDocuments}>
      <ButtonIcon icon={DocsIcon} />
    </Button>
  )

  const chatButton =
    isJoined && onPressCommunityChat ? (
      <View>
        <Button
          label={
            unreadCount > 0
              ? plural(unreadCount, {
                  one: 'Community chat, # unread message',
                  other: 'Community chat, # unread messages',
                })
              : l`Community chat`
          }
          size="small"
          color="secondary"
          shape="round"
          onPress={onPressCommunityChat}>
          <ButtonIcon icon={ChatIcon} />
        </Button>
        {unreadCount > 0 ? (
          <View
            pointerEvents="none"
            style={[
              a.absolute,
              a.rounded_full,
              a.align_center,
              a.justify_center,
              a.px_xs,
              {
                top: -4,
                right: -6,
                minWidth: 18,
                height: 18,
                backgroundColor: t.palette.negative_500,
              },
            ]}>
            <Text style={[a.font_bold, {fontSize: 10, color: '#fff'}]}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    ) : null

  return (
    <View>
      {/* The banner runs under the status bar, to the top of the screen. */}
      <View style={{height: topInset + BANNER_HEIGHT}}>
        <LinearGradient
          colors={[hexToRgba(brandColor, 0.9), hexToRgba(accentColor, 0.5)]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[a.absolute, a.inset_0]}
        />
        {bannerUri ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{uri: bannerUri}}
            contentFit="cover"
            style={[a.absolute, a.inset_0]}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={l`Go back`}
          accessibilityHint={l`Returns to the previous screen`}
          onPress={onPressBack}
          hitSlop={8}
          style={[
            a.absolute,
            a.rounded_full,
            a.align_center,
            a.justify_center,
            {
              top: topInset + 8,
              left: 12,
              width: 36,
              height: 36,
              // Dark on any banner, image or color, so the arrow stays legible.
              backgroundColor: 'rgba(0,0,0,0.45)',
            },
          ]}>
          <ArrowLeftIcon size="md" fill="#fff" />
        </Pressable>
        {onPressEditBanner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={l`Change banner`}
            accessibilityHint={l`Opens your photos to pick a new banner`}
            disabled={isBannerPending}
            onPress={onPressEditBanner}
            hitSlop={8}
            style={[
              a.absolute,
              a.rounded_full,
              a.align_center,
              a.justify_center,
              {
                top: topInset + 8,
                right: 12,
                width: 36,
                height: 36,
                backgroundColor: 'rgba(0,0,0,0.45)',
                opacity: isBannerPending ? 0.5 : 1,
              },
            ]}>
            <CameraIcon size="md" fill="#fff" />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          a.px_lg,
          a.pb_md,
          t.atoms.bg,
          {
            marginTop: -SHEET_OVERLAP,
            borderTopLeftRadius: SHEET_OVERLAP,
            borderTopRightRadius: SHEET_OVERLAP,
          },
        ]}>
        {/* Actions either side of an avatar that straddles the banner edge. */}
        <View style={[a.flex_row, a.align_center, {minHeight: 56}]}>
          <View style={[a.flex_1, a.flex_row, a.align_center, a.gap_sm]}>
            {docsButton}
            {chatButton}
          </View>
          <View
            style={[
              a.rounded_full,
              t.atoms.bg,
              {
                marginTop: -(AVATAR_SIZE / 2 + AVATAR_RING),
                padding: AVATAR_RING,
              },
            ]}>
            <View
              style={[
                a.rounded_full,
                a.align_center,
                a.justify_center,
                {
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  backgroundColor: hexToRgba(
                    brandColor,
                    t.scheme === 'dark' ? 0.28 : 0.14,
                  ),
                },
              ]}>
              <Text
                style={[
                  a.font_bold,
                  {
                    color: brandColor,
                    fontSize: avatarLabel.length > 1 ? 22 : 32,
                  },
                ]}>
                {avatarLabel}
              </Text>
            </View>
          </View>
          <View style={[a.flex_1, a.flex_row, a.justify_end]}>
            <Button
              label={joinLabel}
              size="small"
              color={isJoined ? 'secondary' : 'primary'}
              disabled={isDraft || isJoinPending}
              onPress={onPressJoin}>
              <ButtonText>{joinLabel}</ButtonText>
            </Button>
          </View>
        </View>

        <Text
          emoji
          accessibilityRole="header"
          style={[
            a.text_2xl,
            a.font_bold,
            a.leading_tight,
            a.text_center,
            a.mt_xs,
          ]}>
          {displayCommunityName}
        </Text>
        <Text
          style={[
            a.text_sm,
            a.text_center,
            a.mt_2xs,
            t.atoms.text_contrast_medium,
          ]}>
          {plural(memberCount, {one: '# member', other: '# members'})}
          {' · '}
          {plural(postsCount, {one: '# post', other: '# posts'})}
        </Text>

        {description ? (
          <Text
            emoji
            numberOfLines={3}
            style={[a.text_md, a.leading_snug, a.text_center, a.mt_sm]}>
            {description}
          </Text>
        ) : null}

        {joinLeaveError ? (
          <Text
            style={[
              a.text_sm,
              a.text_center,
              a.mt_sm,
              {color: t.palette.negative_500},
            ]}>
            {cleanError(joinLeaveError)}
          </Text>
        ) : null}

        {/* One strip of counts; each opens its section. */}
        <View
          style={[
            a.flex_row,
            a.mt_md,
            a.border,
            a.rounded_md,
            a.overflow_hidden,
            t.atoms.border_contrast_low,
          ]}>
          {stats.map((stat, index) => (
            <Pressable
              key={stat.key}
              accessibilityRole="button"
              accessibilityLabel={`${stat.label}: ${i18n.number(stat.value)}`}
              accessibilityHint={l`Opens this section`}
              onPress={stat.onPress}
              style={({pressed}) => [
                a.flex_1,
                a.align_center,
                a.py_sm,
                index > 0 && [a.border_l, t.atoms.border_contrast_low],
                pressed && t.atoms.bg_contrast_25,
              ]}>
              <Text style={[a.text_md, a.font_bold]}>
                {i18n.number(stat.value)}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {stat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}
