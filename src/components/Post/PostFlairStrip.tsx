import {useCallback} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {type PostBadge} from '#/lib/post-flairs'
import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

type PostFlairStripProps = {
  badges: PostBadge[]
  compact?: boolean
  showHeader?: boolean
}

const POLICY_FLAIR_COLOR = '#474652'

function getBadgeDescriptor(badge: PostBadge) {
  if (badge.kind === 'postType') {
    return null
  }

  return {
    marker: badge.kind === 'policy' ? '||' : '|',
  }
}

function isBadgeNavigable(badge: PostBadge): boolean {
  // postType badges (Meme, RAQ, etc.) are decorative only
  if (badge.kind === 'postType') return false
  // Generic fallback badges have no specific tag to filter by
  if (!badge.tag || badge.key.endsWith(':generic')) return false
  return true
}

function useFlairPress() {
  const navigation = useNavigation<NavigationProp>()

  return useCallback(
    (badge: PostBadge) => {
      if (!isBadgeNavigable(badge)) return

      navigation.navigate('FlairFeed', {
        flairId: badge.flairId ?? badge.key,
        flairTag: badge.tag!,
        flairLabel: badge.label,
        kind: badge.kind as 'matter' | 'policy',
        color: badge.color,
        isOfficial: badge.isOfficial,
      })
    },
    [navigation],
  )
}

export function PostFlairStrip({
  badges,
  compact = false,
  showHeader = false,
}: PostFlairStripProps) {
  const t = useTheme()
  const onPressBadge = useFlairPress()

  if (!badges.length) {
    return null
  }

  return (
    <View style={[showHeader && a.gap_xs]}>
      {showHeader ? (
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          Flairs
        </Text>
      ) : null}
      <View
        style={[
          styles.wrap,
          compact ? styles.wrapCompact : styles.wrapSpacious,
        ]}>
        {badges.map(badge => {
          const descriptor = getBadgeDescriptor(badge)
          const isNavigable = isBadgeNavigable(badge)
          const isMatter = badge.kind === 'matter'
          const isPolicy = badge.kind === 'policy'
          const matterBorderColor = t.scheme === 'light' ? '#000000' : '#FFFFFF'
          const badgeColor = isPolicy ? POLICY_FLAIR_COLOR : badge.color

          return (
            <Pressable
              key={badge.key}
              onPress={() => onPressBadge(badge)}
              disabled={!isNavigable}
              accessible={isNavigable}
              accessibilityRole={isNavigable ? 'button' : undefined}
              accessibilityLabel={
                isNavigable ? `Ver posts sobre ${badge.label}` : badge.label
              }
              accessibilityHint={
                isNavigable
                  ? `Abre el feed de posts sobre ${badge.label}`
                  : undefined
              }
              style={({pressed}) => [
                styles.badgeRow,
                compact ? styles.badgeRowCompact : styles.badgeRowRegular,
                isNavigable && pressed && styles.badgeRowPressed,
              ]}>
              {descriptor ? (
                <View
                  style={[
                    styles.sigRail,
                    compact ? styles.sigRailCompact : styles.sigRailRegular,
                    isMatter
                      ? {
                          backgroundColor: '#FFFFFF',
                          borderColor: matterBorderColor,
                        }
                      : isPolicy
                        ? {
                            backgroundColor: POLICY_FLAIR_COLOR,
                            borderColor: POLICY_FLAIR_COLOR,
                          }
                        : [t.atoms.border_contrast_low, t.atoms.bg_contrast_25],
                  ]}>
                  <Text
                    style={[
                      styles.sigMarker,
                      compact && styles.sigMarkerCompact,
                      isMatter
                        ? {color: '#000000'}
                        : isPolicy
                          ? {color: '#FFFFFF'}
                          : t.atoms.text_contrast_medium,
                    ]}>
                    {descriptor.marker}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.pill,
                  compact ? styles.pillCompact : styles.pillRegular,
                  {
                    backgroundColor: isMatter ? '#FFFFFF' : badgeColor,
                    borderColor: isMatter ? matterBorderColor : badgeColor,
                    borderWidth: isMatter && t.scheme === 'light' ? 1 : 0,
                  },
                ]}>
                <Text
                  style={[
                    compact ? styles.labelCompact : styles.labelRegular,
                    {
                      color: isMatter ? '#000000' : '#FFFFFF',
                    },
                  ]}>
                  {badge.label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wrapCompact: {
    gap: 6,
  },
  wrapSpacious: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeRowCompact: {
    gap: 4,
  },
  badgeRowRegular: {
    gap: 6,
  },
  badgeRowPressed: {
    opacity: 0.7,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
  },
  pillCompact: {
    paddingVertical: 4,
    paddingLeft: 9,
    paddingRight: 9,
  },
  pillRegular: {
    paddingVertical: 5,
    paddingLeft: 11,
    paddingRight: 11,
  },
  sigRail: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  sigRailCompact: {
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  sigRailRegular: {
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  sigMarker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sigMarkerCompact: {
    fontSize: 9,
  },
  sigLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginLeft: 4,
  },
  labelCompact: {
    fontSize: 11,
    fontWeight: '700',
  },
  labelRegular: {
    fontSize: 12,
    fontWeight: '700',
  },
})
