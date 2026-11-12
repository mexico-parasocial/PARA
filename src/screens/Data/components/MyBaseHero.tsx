import {Pressable, StyleSheet, View} from 'react-native'
import {Image} from 'expo-image'
import {LinearGradient} from 'expo-linear-gradient'
import {useLingui} from '@lingui/react/macro'

import {toDeviceReachableUri} from '#/lib/media/localDevUri'
import {type PoliticalAffiliation} from '#/lib/political-affiliations'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {CompassMini} from '#/components/CompassMini'
import {ArrowLeft_Stroke2_Corner0_Rounded as BackIcon} from '#/components/icons/Arrow'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {ChainLink_Stroke2_Corner0_Rounded as ChainLinkIcon} from '#/components/icons/ChainLink'
import {CommunityIcon_Stroke as CommunityIcon} from '#/components/icons/Community'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/Settings'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {type app} from '#/lexicons'
import {type CivicWeight} from '../mybase-metrics'

const RING = 4

export function MyBaseHero({
  profile,
  civicWeight,
  affiliations,
  onPressSettings,
  onPressCommunities,
  onPressCompass,
  onPressBack,
  gtMobile,
}: {
  profile: app.bsky.actor.defs.ProfileViewDetailed
  civicWeight: CivicWeight
  affiliations: PoliticalAffiliation[]
  onPressSettings: () => void
  onPressCommunities: () => void
  onPressCompass: () => void
  onPressBack: () => void
  gtMobile?: boolean
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()

  const avatarSize = gtMobile ? 104 : 88
  const bannerHeight = gtMobile ? 168 : 132
  const displayName = profile.displayName || profile.handle
  const banner = toDeviceReachableUri(profile.banner)

  // The banner fallback fades from the brand color into the viewer's own
  // affiliation color (ninth first, then party), so the header reflects
  // their position without hardcoding any compass color here.
  const accent =
    affiliations.find(af => af.type === 'ninth')?.color ??
    affiliations.find(af => af.type === 'party')?.color ??
    t.palette.primary_300

  return (
    <Layout.Center>
      <View style={t.atoms.bg}>
        {/* Banner */}
        <View style={[{height: bannerHeight}, styles.banner]}>
          {banner ? (
            <Image
              source={{uri: banner}}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <LinearGradient
              colors={[t.palette.primary_700, t.palette.primary_500, accent]}
              locations={[0, 0.55, 1]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* Keeps the top buttons legible over any banner image. */}
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
            style={styles.bannerScrim}
            pointerEvents="none"
          />
          <View style={[a.flex_row, a.align_center, a.gap_sm, styles.topBar]}>
            <BannerButton label={l`Go back`} onPress={onPressBack}>
              <BackIcon size="md" style={styles.bannerIcon} />
            </BannerButton>
            <View style={a.flex_1} />
            <BannerButton
              label={l`My communities`}
              onPress={onPressCommunities}>
              <CommunityIcon size="md" style={styles.bannerIcon} />
            </BannerButton>
            <BannerButton label={l`Account settings`} onPress={onPressSettings}>
              <SettingsIcon size="md" style={styles.bannerIcon} />
            </BannerButton>
          </View>
        </View>

        <View style={[gtMobile ? a.px_xl : a.px_lg, a.pb_lg]}>
          {/* Avatar (across the banner's lower edge), identity, compass. */}
          <View style={[a.flex_row, a.align_start, a.gap_md]}>
            <View
              style={[
                {
                  marginTop: -(avatarSize / 2 + RING),
                  padding: RING,
                  borderRadius: avatarSize / 2 + RING,
                },
                t.atoms.bg,
              ]}>
              <UserAvatar
                avatar={profile.avatar}
                size={avatarSize}
                type={profile.associated?.labeler ? 'labeler' : 'user'}
              />
            </View>

            <View style={[a.flex_1, a.gap_2xs, a.pt_sm, {minWidth: 0}]}>
              <Text
                emoji
                numberOfLines={1}
                style={[
                  a.text_2xl,
                  a.font_bold,
                  a.leading_tight,
                  t.atoms.text,
                ]}>
                {displayName}
              </Text>
              <Text
                numberOfLines={1}
                style={[a.text_md, t.atoms.text_contrast_medium]}>
                @{profile.handle}
              </Text>
            </View>

            <View style={a.pt_sm}>
              <CompassMini
                affiliations={affiliations}
                onPress={onPressCompass}
                size={gtMobile ? 84 : 72}
                compact
              />
            </View>
          </View>

          <View style={[a.flex_row, a.flex_wrap, a.gap_xs, a.mt_md]}>
            {affiliations.length > 0 ? (
              affiliations.map(affiliation => (
                <AffiliationChip
                  key={affiliation.id}
                  affiliation={affiliation}
                  onPress={onPressCompass}
                />
              ))
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={l`Choose your affiliations`}
                accessibilityHint=""
                onPress={onPressCompass}
                style={[
                  a.px_md,
                  a.py_xs,
                  a.rounded_full,
                  a.border,
                  t.atoms.border_contrast_medium,
                  {borderStyle: 'dashed'},
                ]}>
                <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                  {l`Choose your affiliations`}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Civic weight */}
          <View style={[a.flex_row, a.gap_sm, a.mt_lg]}>
            <CivicMetric
              icon="direct"
              value={i18n.number(civicWeight.directPower)}
              label={l`Direct power`}
            />
            <CivicMetric
              icon="delegated"
              value={i18n.number(civicWeight.delegatedPower)}
              label={l`Delegated power`}
            />
          </View>
        </View>
      </View>
    </Layout.Center>
  )
}

function BannerButton({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint=""
      onPress={onPress}
      hitSlop={6}
      style={({pressed}) => [
        a.align_center,
        a.justify_center,
        a.rounded_full,
        styles.bannerButton,
        pressed && styles.bannerButtonPressed,
      ]}>
      {children}
    </Pressable>
  )
}

function AffiliationChip({
  affiliation,
  onPress,
}: {
  affiliation: PoliticalAffiliation
  onPress: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const kind = affiliation.type === 'party' ? l`Party` : l`Compass position`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${affiliation.name}, ${kind}`}
      accessibilityHint={l`Opens your affiliations`}
      onPress={onPress}
      style={[
        a.flex_row,
        a.align_center,
        a.gap_xs,
        a.pl_sm,
        a.pr_md,
        a.py_xs,
        a.rounded_full,
        t.atoms.bg_contrast_25,
      ]}>
      <View
        style={[
          a.rounded_full,
          styles.chipDot,
          {backgroundColor: affiliation.color},
        ]}
      />
      <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
        {affiliation.name}
      </Text>
    </Pressable>
  )
}

function CivicMetric({
  icon,
  value,
  label,
}: {
  icon: 'direct' | 'delegated'
  value: string
  label: string
}) {
  const t = useTheme()
  const Icon = icon === 'direct' ? ListIcon : ChainLinkIcon
  return (
    <View
      style={[
        a.flex_1,
        a.flex_row,
        a.align_center,
        a.gap_md,
        a.p_md,
        a.rounded_md,
        t.atoms.bg_contrast_25,
      ]}>
      <View
        style={[
          a.align_center,
          a.justify_center,
          a.rounded_full,
          styles.metricIcon,
          {backgroundColor: t.palette.primary_50},
        ]}>
        <Icon size="sm" style={{color: t.palette.primary_500}} />
      </View>
      <View style={[a.flex_1]}>
        <Text style={[a.text_xl, a.font_bold, a.leading_tight, t.atoms.text]}>
          {value}
        </Text>
        <Text
          numberOfLines={1}
          style={[a.text_xs, a.font_semi_bold, t.atoms.text_contrast_medium]}>
          {label}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
  },
  bannerScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  bannerButton: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  bannerButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bannerIcon: {
    color: 'white',
  },
  chipDot: {
    width: 10,
    height: 10,
  },
  metricIcon: {
    width: 36,
    height: 36,
  },
})
