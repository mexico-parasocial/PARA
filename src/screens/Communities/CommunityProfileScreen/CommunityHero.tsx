import {ScrollView, TouchableOpacity, View} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'

import {type UsePaletteValue} from '#/lib/hooks/usePalette'
import {type PartyFeedProfile} from '#/lib/party-feeds'
import {cleanError} from '#/lib/strings/errors'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {PageText_Stroke2_Corner0_Rounded as PageTextIcon} from '#/components/icons/PageText'
import {styles} from './styles'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CommunityStats = {
  policyPosts: number
  matterPosts: number
  raqPosts: number
  visiblePosters: number
}

// ---------------------------------------------------------------------------
// CommunityHero
// ---------------------------------------------------------------------------
export function CommunityHero({
  displayCommunityName,
  plainCommunityName,
  brandColor,
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
  onPressRAQ,
  onPressRoles,
  onPressVoters,
  onPressCommunityChat,
  unreadCount,
  governance,
  pal,
}: {
  displayCommunityName: string
  plainCommunityName: string
  brandColor: string
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
  onPressRAQ: () => void
  onPressRoles: () => void
  onPressVoters: () => void
  onPressCommunityChat: () => void
  unreadCount: number
  governance: {
    moderators: unknown[]
    officials: unknown[]
    deputies: unknown[]
  }
  pal: UsePaletteValue
}) {
  const t = useTheme()

  // Resolve the subtitle: party description > board description > generic
  const heroSubtitle =
    partyProfile?.description ||
    boardDescription ||
    'Community governance, representation, and civic activity.'

  // Use the party logo (e.g. "MI", "MC") when available, else first letter
  const avatarLetter =
    partyProfile?.logo || plainCommunityName.charAt(0).toUpperCase()

  // Use accent color for gradient richness when available
  const gradientAccent = partyProfile?.accentColor || brandColor

  return (
    <LinearGradient
      colors={
        t.scheme === 'dark'
          ? [
              hexToRgba(brandColor, 0.22),
              hexToRgba(gradientAccent, 0.06),
              'transparent',
            ]
          : [
              hexToRgba(brandColor, 0.14),
              hexToRgba(gradientAccent, 0.04),
              'transparent',
            ]
      }
      start={{x: 0, y: 0}}
      end={{x: 0, y: 1}}
      style={styles.heroBanner}>
      <View style={styles.heroContent}>
        {/* Community Avatar and Name Row */}
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.communityAvatar,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? hexToRgba(brandColor, 0.3)
                    : hexToRgba(brandColor, 0.12),
                borderColor:
                  t.scheme === 'dark'
                    ? hexToRgba(brandColor, 0.6)
                    : hexToRgba(brandColor, 0.35),
                borderWidth: 2.5,
              },
            ]}>
            <Text
              style={[
                styles.avatarText,
                {color: brandColor},
                avatarLetter.length > 1 && {fontSize: 22},
              ]}>
              {avatarLetter}
            </Text>
          </View>

          <View style={styles.heroTopInfo}>
            {/* Community Name */}
            <Text style={[styles.communityNameCompact, pal.text]}>
              {displayCommunityName}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.communitySubtitle, pal.textLight]}>
              {heroSubtitle}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={isDraft || isJoinPending}
            style={[
              styles.followButton,
              {
                backgroundColor: isJoined
                  ? t.scheme === 'dark'
                    ? t.palette.primary_100
                    : t.palette.primary_100
                  : t.palette.primary_500,
                borderWidth: isJoined ? 1 : 0,
                borderColor: isJoined ? t.palette.primary_200 : 'transparent',
                opacity: isJoinPending ? 0.6 : 1,
              },
            ]}
            onPress={isDraft ? undefined : () => void onPressJoin()}>
            <Text
              style={[
                styles.followButtonText,
                {
                  color: isJoined ? t.palette.primary_700 : '#fff',
                },
              ]}>
              {isDraft
                ? isJoined
                  ? 'Founding member'
                  : 'Draft quorum'
                : isJoinPending
                  ? isJoined
                    ? 'Leaving...'
                    : 'Joining...'
                  : isJoined
                    ? 'Joined'
                    : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
        {joinLeaveError ? (
          <Text
            style={{
              color: t.palette.negative_500,
              fontSize: 13,
              marginTop: 4,
            }}>
            {cleanError(joinLeaveError)}
          </Text>
        ) : null}

        {/* Pill-Chip Stats Grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsPillScroll}
          contentContainerStyle={styles.statsPillContainer}>
          {[
            {
              label: 'Members',
              value: memberCount.toLocaleString(),
            },
            {label: 'Posts', value: postsCount.toLocaleString()},
            {
              label: 'Policy',
              value: communityStats.policyPosts.toLocaleString(),
            },
            {
              label: 'Matter',
              value: communityStats.matterPosts.toLocaleString(),
            },
          ].map(stat => (
            <View
              key={stat.label}
              style={[
                styles.statPill,
                {
                  backgroundColor:
                    t.scheme === 'dark'
                      ? hexToRgba(brandColor, 0.12)
                      : hexToRgba(brandColor, 0.1),
                },
              ]}>
              <Text
                style={[
                  styles.statPillValue,
                  {color: t.scheme === 'dark' ? '#e0e7ff' : brandColor},
                ]}>
                {stat.value}
              </Text>
              <Text
                style={[
                  styles.statPillLabel,
                  {
                    color:
                      t.scheme === 'dark'
                        ? 'rgba(255,255,255,0.5)'
                        : hexToRgba(brandColor, 0.6),
                  },
                ]}>
                {stat.label}
              </Text>
            </View>
          ))}
          {/* Docs Button */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressDocuments}
            style={[
              styles.statPill,
              styles.docsPill,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? hexToRgba(brandColor, 0.18)
                    : hexToRgba(brandColor, 0.12),
                borderColor:
                  t.scheme === 'dark'
                    ? hexToRgba(brandColor, 0.4)
                    : hexToRgba(brandColor, 0.25),
              },
            ]}>
            <PageTextIcon
              style={{
                color: t.scheme === 'dark' ? '#e0e7ff' : brandColor,
              }}
              size="sm"
            />
            <Text
              style={[
                styles.statPillLabel,
                {
                  color: t.scheme === 'dark' ? '#e0e7ff' : brandColor,
                  marginTop: 2,
                },
              ]}>
              Docs
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Activity Stats Row — Interactive pills */}
        <View style={styles.voterStatsRow}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressRAQ}
            style={[
              styles.activityPill,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : t.palette.primary_25,
              },
            ]}>
            <Text
              style={[
                styles.activityPillValue,
                {
                  color:
                    t.scheme === 'dark' ? '#c7d2fe' : t.palette.primary_600,
                },
              ]}>
              {communityStats.raqPosts.toLocaleString()}
            </Text>
            <Text style={[styles.activityPillLabel, pal.textLight]}>RAQ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressRoles}
            style={[
              styles.activityPill,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : t.palette.primary_25,
              },
            ]}>
            <Text
              style={[
                styles.activityPillValue,
                {
                  color:
                    t.scheme === 'dark' ? '#c7d2fe' : t.palette.primary_600,
                },
              ]}>
              {(
                governance.moderators.length +
                governance.officials.length +
                governance.deputies.length
              ).toLocaleString()}
            </Text>
            <Text style={[styles.activityPillLabel, pal.textLight]}>Roles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressVoters}
            style={[
              styles.activityPill,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : t.palette.primary_25,
              },
            ]}>
            <Text
              style={[
                styles.activityPillValue,
                {
                  color:
                    t.scheme === 'dark' ? '#c7d2fe' : t.palette.primary_600,
                },
              ]}>
              {communityStats.visiblePosters.toLocaleString()}
            </Text>
            <Text style={[styles.activityPillLabel, pal.textLight]}>
              Voters
            </Text>
          </TouchableOpacity>
          {isJoined ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressCommunityChat}
              style={[
                styles.activityPill,
                {
                  backgroundColor:
                    t.scheme === 'dark'
                      ? hexToRgba(brandColor, 0.2)
                      : hexToRgba(brandColor, 0.15),
                },
              ]}>
              <View style={{position: 'relative'}}>
                <Text
                  style={[
                    styles.activityPillValue,
                    {
                      color: t.scheme === 'dark' ? '#e0e7ff' : brandColor,
                    },
                  ]}>
                  💬
                </Text>
                {unreadCount > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -10,
                      backgroundColor: t.palette.negative_500,
                      borderRadius: 10,
                      minWidth: 18,
                      height: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: '700',
                      }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.activityPillLabel,
                  {
                    color: t.scheme === 'dark' ? '#e0e7ff' : brandColor,
                  },
                ]}>
                Chat
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  )
}
