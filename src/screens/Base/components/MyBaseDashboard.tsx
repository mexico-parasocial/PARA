import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {type MessageDescriptor} from '@lingui/core'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {CIVIC_TREE_COPY, CIVIC_TREE_LABELS} from '#/lib/civic-tree-labels'
import {type PoliticalAffiliation} from '#/lib/political-affiliations'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ArrowRight_Stroke2_Corner0_Rounded as ArrowRightIcon} from '#/components/icons/Arrow'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {Influence_Stroke_Icon as TrendingIcon} from '#/components/icons/Influence'
import {PageText_Stroke2_Corner0_Rounded as DocumentIcon} from '#/components/icons/PageText'
import {Shapes_Stroke2_Corner0_Rounded as ShapesIcon} from '#/components/icons/Shapes'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import * as Layout from '#/components/Layout'

export function MyBaseDashboard({
  votedCount,
  affiliations,
  onPressSeeVotes,
  onPressSeePosts,
  onPressRAQ,
  onPressAffiliations,
  onPressCivicTree,
  onPressSpatialDeliberation,
  onPressViewProfile,
  gtMobile: _gtMobile,
}: {
  votedCount: number
  affiliations: PoliticalAffiliation[]
  onPressSeeVotes: () => void
  onPressSeePosts: () => void
  onPressRAQ: () => void
  onPressAffiliations: () => void
  onPressCivicTree: () => void
  onPressSpatialDeliberation: () => void
  onPressViewProfile: () => void
  gtMobile?: boolean
}) {
  const {_} = useLingui()
  const t = useTheme()
  const visibleAffiliations = affiliations.slice(0, 3)

  return (
    <Layout.Center style={styles.center}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            <Trans>Your Affiliations</Trans>
          </Text>
          <View style={[styles.sectionCount, t.atoms.bg_contrast_25]}>
            <Text style={[styles.sectionCountText, t.atoms.text_contrast_high]}>
              {affiliations.length}
            </Text>
          </View>
        </View>
        <Text style={[styles.sectionSubtitle, t.atoms.text_contrast_medium]}>
          <Trans>Your selected party and compass position.</Trans>
        </Text>

        <View
          style={[
            styles.affiliationCard,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_low,
          ]}>
          {visibleAffiliations.length > 0 ? (
            <View style={styles.affiliationList}>
              {visibleAffiliations.map(affiliation => (
                <View
                  key={affiliation.id}
                  style={[
                    styles.affiliationRow,
                    {
                      borderColor: affiliation.color,
                      backgroundColor: affiliation.color + '18',
                    },
                  ]}>
                  <View
                    style={[
                      styles.affiliationDot,
                      {backgroundColor: affiliation.color},
                    ]}
                  />
                  <View style={styles.affiliationTextWrap}>
                    <Text style={[styles.affiliationName, t.atoms.text]}>
                      {affiliation.name}
                    </Text>
                    <Text
                      style={[
                        styles.affiliationType,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {formatAffiliationType(affiliation.type, _)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyAffiliationText, t.atoms.text]}>
              <Trans>No affiliations selected yet.</Trans>
            </Text>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressAffiliations}
            style={[
              styles.secondaryAction,
              t.atoms.bg_contrast_25,
              {
                borderWidth: 1,
                borderColor: t.atoms.border_contrast_low.borderColor,
              },
            ]}>
            <ShapesIcon size="md" style={t.atoms.text_contrast_medium} />
            <Text style={[styles.secondaryActionText, t.atoms.text]}>
              <Trans>Update compass position</Trans>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ledgerSection}>
        <View style={styles.ledgerHeaderRow}>
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            <Trans>Your Civic Ledger</Trans>
          </Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressSeeVotes}
            style={[
              styles.widgetCard,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <View
              style={[
                styles.widgetIconWrap,
                {backgroundColor: t.palette.primary_500 + '25'},
              ]}>
              <ListIcon size="lg" style={{color: t.palette.primary_400}} />
            </View>
            <View style={styles.widgetContent}>
              <Text style={[styles.widgetTitle, t.atoms.text]}>
                <Trans>Votes</Trans>
              </Text>
              <Text style={[styles.widgetDesc, t.atoms.text_contrast_medium]}>
                <Trans>{votedCount} policy decisions</Trans>
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressSeePosts}
            style={[
              styles.widgetCard,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <View
              style={[
                styles.widgetIconWrap,
                {backgroundColor: t.palette.yellow + '15'},
              ]}>
              <DocumentIcon size="lg" style={{color: t.palette.yellow}} />
            </View>
            <View style={styles.widgetContent}>
              <Text style={[styles.widgetTitle, t.atoms.text]}>
                <Trans>Posts</Trans>
              </Text>
              <Text style={[styles.widgetDesc, t.atoms.text_contrast_medium]}>
                <Trans>Public activity and highlights</Trans>
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressRAQ}
            style={[
              styles.widgetCard,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <View
              style={[
                styles.widgetIconWrap,
                {backgroundColor: t.palette.positive_500 + '15'},
              ]}>
              <TrendingIcon size="lg" style={{color: t.palette.positive_500}} />
            </View>
            <View style={styles.widgetContent}>
              <Text style={[styles.widgetTitle, t.atoms.text]}>
                <Trans>RAQs</Trans>
              </Text>
              <Text style={[styles.widgetDesc, t.atoms.text_contrast_medium]}>
                <Trans>Open questions and readiness</Trans>
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.exploreGrid}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.policyTreeButton,
            {backgroundColor: t.palette.primary_500},
          ]}
          onPress={onPressCivicTree}
          activeOpacity={0.8}>
          <TreeIcon size="xl" style={{color: 'white'}} />
          <View style={styles.policyTreeCopy}>
            <Text style={styles.policyTreeText}>
              {CIVIC_TREE_LABELS.personal}
            </Text>
            <Text style={styles.policyTreeDesc}>
              {CIVIC_TREE_COPY.personalPrivate}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.policyTreeButton, {backgroundColor: '#5b5f97'}]}
          onPress={onPressSpatialDeliberation}
          activeOpacity={0.8}>
          <ShapesIcon size="xl" style={{color: 'white'}} />
          <View style={styles.policyTreeCopy}>
            <Text style={styles.policyTreeText}>
              {CIVIC_TREE_LABELS.community}
            </Text>
            <Text style={styles.policyTreeDesc}>
              {CIVIC_TREE_COPY.communityPublic}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        style={[
          styles.viewProfileLink,
          t.atoms.bg_contrast_25,
          {borderWidth: 1, borderColor: t.atoms.border_contrast_low.borderColor},
        ]}
        onPress={onPressViewProfile}>
        <View style={styles.viewProfileRow}>
          <Text style={[styles.viewProfileText, t.atoms.text]}>
            <Trans>View public passport</Trans>
          </Text>
          <ArrowRightIcon size="sm" style={t.atoms.text_contrast_medium} />
        </View>
      </TouchableOpacity>
      </ScrollView>
    </Layout.Center>
  )
}

function formatAffiliationType(
  type: PoliticalAffiliation['type'],
  _: (message: MessageDescriptor) => string,
) {
  switch (type) {
    case 'party':
      return _(msg`Party`)
    case 'ninth':
      return _(msg`Compass position`)
    case 'twentyFifth':
      return _(msg`Detailed compass position`)
    default:
      return type
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    gap: 6,
  },
  ledgerSection: {
    gap: 10,
    marginTop: 22,
  },
  ledgerHeaderRow: {
    paddingHorizontal: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  affiliationCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  affiliationList: {
    gap: 10,
  },
  affiliationRow: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  affiliationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  affiliationTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  affiliationName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  affiliationType: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyAffiliationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryAction: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    gap: 12,
    marginTop: 8,
  },
  widgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  widgetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetContent: {
    flex: 1,
  },
  widgetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  widgetDesc: {
    fontSize: 14,
  },
  exploreGrid: {
    gap: 10,
    marginTop: 26,
    paddingTop: 18,
  },
  policyTreeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    padding: 18,
    borderRadius: 12,
  },
  policyTreeCopy: {
    flex: 1,
    minWidth: 0,
  },
  policyTreeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  policyTreeDesc: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 3,
  },
  viewProfileLink: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewProfileText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
