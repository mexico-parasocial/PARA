import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {type AppBskyActorDefs} from '@atproto/api'
import {useLingui} from '@lingui/react'

import {type PoliticalAffiliation} from '#/lib/political-affiliations'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {CompassMini} from '#/components/CompassMini'
import {ArrowLeft_Stroke2_Corner0_Rounded as BackIcon} from '#/components/icons/Arrow'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {ChainLink_Stroke2_Corner0_Rounded as ChainLinkIcon} from '#/components/icons/ChainLink'
import {CommunityIcon_Stroke as CommunityIcon} from '#/components/icons/Community'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/SettingsGear2'
import * as Layout from '#/components/Layout'
import {type CivicWeight} from '../mybase-metrics'

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
  profile: AppBskyActorDefs.ProfileViewDetailed
  civicWeight: CivicWeight
  affiliations: PoliticalAffiliation[]
  onPressSettings: () => void
  onPressCommunities: () => void
  onPressCompass: () => void
  onPressBack: () => void
  gtMobile?: boolean
}) {
  const t = useTheme()
  const {i18n} = useLingui()
  const formatCount = (v: number | undefined | null) => i18n.number(v ?? 0)

  const profileHandle = profile?.handle
  const profileHandleText = profileHandle ? `@${profileHandle}` : '@para'
  const profileDisplayName = profile?.displayName || profile?.handle || 'User'

  return (
    <Layout.Center>
      <View style={t.atoms.bg}>
        {/* Banner / top bar */}
        <View
          style={[
            styles.headerTopBar,
            {backgroundColor: t.palette.primary_500}, // Brand color for banner
          ]}>
          <View style={[a.flex_row, {width: '100%', alignItems: 'center'}]}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressBack}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <BackIcon size="md" style={{color: 'white'}} />
            </TouchableOpacity>
            <View style={{flex: 1}} />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressCommunities}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              style={{marginRight: 12}}>
              <CommunityIcon size="md" style={{color: 'white'}} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressSettings}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <SettingsIcon size="md" style={{color: 'white'}} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile block */}
        <View
          style={[
            styles.headerProfileBlock,
            gtMobile && styles.headerProfileBlockWeb,
          ]}>
          {/* Top row: Avatar + Identity + Compass */}
          <View style={[styles.headerTopRow, gtMobile && a.align_center]}>
            <View
              style={[
                styles.headerAvatarWrap,
                {borderColor: t.atoms.bg.backgroundColor},
              ]}>
              <UserAvatar
                avatar={profile?.avatar}
                size={84}
                type={profile?.associated?.labeler ? 'labeler' : 'user'}
              />
            </View>

            <View style={styles.headerIdentityColumn}>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  {flexWrap: 'wrap', gap: 6},
                ]}>
                <Text style={[styles.headerName, t.atoms.text]}>
                  {profileDisplayName}
                </Text>
              </View>

              <Text style={[styles.headerHandle, t.atoms.text_contrast_medium]}>
                {profileHandleText}
              </Text>

              <View
                style={[styles.affiliationBadge, t.atoms.bg_contrast_25]}>
                <Text
                  style={[
                    styles.affiliationText,
                    {color: t.palette.primary_500},
                  ]}>
                  {getAffiliationSummary(affiliations)}
                </Text>
              </View>
            </View>

            <CompassMini
              affiliations={affiliations}
              onPress={onPressCompass}
              size={gtMobile ? 84 : 72}
              compact
            />
          </View>

          {/* Civic Weight Breakdown (Replaces Social Metrics) */}
          <View
            style={[
              styles.civicWeightRow,
              {borderTopColor: t.atoms.border_contrast_low.borderColor},
            ]}>
            <CivicMetricItem
              label="Direct Power"
              value={formatCount(civicWeight.directPower)}
              icon="direct"
            />
            <View
              style={[
                styles.metricDivider,
                {backgroundColor: t.atoms.border_contrast_low.borderColor},
              ]}
            />
            <CivicMetricItem
              label="Delegated Power"
              value={formatCount(civicWeight.delegatedPower)}
              icon="delegated"
            />
          </View>
        </View>
      </View>
    </Layout.Center>
  )
}

function CivicMetricItem({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: 'direct' | 'delegated'
}) {
  const t = useTheme()
  const iconColor = t.atoms.text.color
  return (
    <View style={styles.civicMetricItem}>
      <View style={styles.civicMetricIconWrap}>
        {icon === 'direct' ? (
          <ListIcon size="sm" style={{color: iconColor}} />
        ) : (
          <ChainLinkIcon size="sm" style={{color: iconColor}} />
        )}
      </View>
      <View style={styles.civicMetricTextWrap}>
        <Text style={[styles.civicMetricValue, t.atoms.text]}>{value}</Text>
        <Text style={[styles.civicMetricLabel, t.atoms.text_contrast_medium]}>
          {label}
        </Text>
      </View>
    </View>
  )
}

function getAffiliationSummary(affiliations: PoliticalAffiliation[]) {
  if (affiliations.length === 0) {
    return 'No affiliations selected'
  }
  return affiliations
    .slice(0, 2)
    .map(affiliation => affiliation.name)
    .join(' · ')
}

const styles = StyleSheet.create({
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 64,
  },
  headerProfileBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerProfileBlockWeb: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerAvatarWrap: {
    marginTop: -48,
    borderWidth: 4,
    borderRadius: 44,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerIdentityColumn: {
    flex: 1,
    paddingTop: 4,
    minWidth: 0,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
  },
  headerHandle: {
    fontSize: 15,
    marginTop: 2,
  },
  affiliationBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  affiliationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  civicWeightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metricDivider: {
    width: 1,
    height: '100%',
  },
  civicMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  civicMetricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  civicMetricTextWrap: {
    flex: 1,
  },
  civicMetricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  civicMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
})
