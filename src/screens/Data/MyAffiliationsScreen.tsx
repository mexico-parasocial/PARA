import {useCallback, useMemo, useState} from 'react'
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useFocusEffect, useNavigation} from '@react-navigation/native'

import {getVoteBreakdownByParty} from '#/lib/cabildeo-party-alignment'
import {
  getPartyNinthId,
  PARTY_COMPASS_PROFILE_BY_ID,
} from '#/lib/compass/party-distributions'
import {
  COMPASS_ID_TO_NINTH_NAME,
  NINTH_NAME_TO_COMPASS_ID,
  POLITICAL_AFFILIATION_OPTIONS,
  type PoliticalAffiliation,
  upsertPoliticalAffiliation,
} from '#/lib/political-affiliations'
import {type NavigationProp} from '#/lib/routes/types'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {CompassMini} from '#/components/CompassMini'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import * as Layout from '#/components/Layout'
import {Header, Screen} from '#/components/Layout'
import {PieChart} from '#/components/PieChart'
import {Text} from '#/components/Typography'

// ─────────────────────────────────────────────────────────────────────────────
// VoteAnalysis — pie chart + voted policies list
// ─────────────────────────────────────────────────────────────────────────────

function VoteAnalysis({navigation}: {navigation: NavigationProp}) {
  const t = useTheme()
  const {_} = useLingui()
  const {data: cabildeos = []} = useCabildeosQuery()

  const votedCabildeos = useMemo(
    () => cabildeos.filter(c => c.userContext?.viewerVoteOption !== undefined),
    [cabildeos],
  )

  const breakdown = useMemo(
    () => getVoteBreakdownByParty(votedCabildeos),
    [votedCabildeos],
  )

  const pieData = useMemo(
    () =>
      breakdown.map(b => ({
        label: b.party.name,
        value: b.count,
        color: b.party.color,
      })),
    [breakdown],
  )

  if (votedCabildeos.length === 0) {
    return (
      <View
        style={[
          a.p_lg,
          a.rounded_xl,
          t.atoms.bg_contrast_25,
          {borderWidth: 1, borderColor: t.palette.contrast_100},
        ]}>
        <Text style={[a.text_md, a.font_bold, t.atoms.text, a.mb_sm]}>
          <Trans>Vote Analysis</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mb_md]}>
          <Trans>
            Vote on some policies to see which parties your decisions align
            with.
          </Trans>
        </Text>
        <Button
          variant="solid"
          color="primary"
          size="small"
          label={_(msg`Browse policies to vote`)}
          onPress={() =>
            navigation.navigate('PoliciesDashboard', {mode: 'Policies'})
          }
          style={[a.w_full]}>
          <ButtonText>
            <Trans>Browse policies to vote →</Trans>
          </ButtonText>
        </Button>
      </View>
    )
  }

  return (
    <View
      style={[
        a.p_lg,
        a.rounded_xl,
        t.atoms.bg_contrast_25,
        {borderWidth: 1, borderColor: t.palette.contrast_100},
      ]}>
      <Text style={[a.text_md, a.font_bold, t.atoms.text, a.mb_md]}>
        <Trans>Vote Analysis</Trans>
      </Text>

      {/* Pie chart */}
      <View style={[a.align_center, a.mb_lg]}>
        <PieChart data={pieData} size={160} showLegend={false} />
      </View>

      {/* Breakdown stats */}
      <View style={[a.gap_sm, a.mb_lg]}>
        {breakdown.map(b => (
          <View key={b.party.id} style={[a.flex_row, a.align_center, a.gap_sm]}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: b.party.color,
              }}
            />
            <Text style={[a.text_sm, t.atoms.text, a.flex_1]}>
              {b.party.name}
            </Text>
            <Text
              style={[a.text_sm, a.font_bold, t.atoms.text_contrast_medium]}>
              {b.count} vote{b.count !== 1 ? 's' : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Voted policies list */}
      <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
        <Trans>Policies you voted on</Trans>
      </Text>
      <View style={[a.gap_sm]}>
        {votedCabildeos.slice(0, 6).map(c => {
          const aligned = getVoteBreakdownByParty([c])[0]?.party
          return (
            <TouchableOpacity
              key={c.uri}
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('PolicyDetails', {cabildeoUri: c.uri})
              }
              style={[
                a.p_sm,
                a.rounded_md,
                a.flex_row,
                a.align_center,
                a.gap_sm,
                {
                  backgroundColor: t.atoms.bg.backgroundColor,
                  borderWidth: 1,
                  borderColor: t.palette.contrast_100,
                },
              ]}>
              <View style={[a.flex_1]}>
                <Text
                  style={[a.text_sm, a.font_bold, t.atoms.text]}
                  numberOfLines={1}>
                  {c.title}
                </Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {c.community}
                </Text>
              </View>
              {aligned && (
                <View
                  style={[
                    a.p_xs,
                    a.rounded_md,
                    {backgroundColor: aligned.color + '20'},
                  ]}>
                  <Text
                    style={[a.text_xs, a.font_bold, {color: aligned.color}]}>
                    {aligned.name}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
        {votedCabildeos.length > 6 && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              navigation.navigate('SeeVotes' as never)
            }}>
            <Text
              style={[
                a.text_sm,
                a.font_bold,
                {color: t.palette.primary_500},
                a.align_center,
              ]}>
              <Trans>View all {votedCabildeos.length} votes →</Trans>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export function MyAffiliationsScreen() {
  const {_} = useLingui()
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {affiliations, setAffiliations, isLoading} = usePoliticalAffiliation()
  const [pendingAffiliations, setPendingAffiliations] =
    useState<PoliticalAffiliation[]>(affiliations)
  const hasChanges = useMemo(
    () => JSON.stringify(pendingAffiliations) !== JSON.stringify(affiliations),
    [pendingAffiliations, affiliations],
  )

  // Sync pending with stored when screen gains focus (React Navigation keeps component mounted)
  useFocusEffect(
    useCallback(() => {
      setPendingAffiliations(affiliations)
    }, [affiliations]),
  )

  const handleToggleParty = useCallback((party: PoliticalAffiliation) => {
    setPendingAffiliations(prev => {
      const exists = prev.find(p => p.id === party.id)
      if (exists) {
        return prev.filter(p => p.id !== party.id)
      }
      return upsertPoliticalAffiliation(prev, party)
    })
  }, [])

  const handleSetNinth = useCallback((ninth: PoliticalAffiliation) => {
    setPendingAffiliations(prev => upsertPoliticalAffiliation(prev, ninth))
  }, [])

  const handleSelectCompassNinth = useCallback(
    (compassId: string) => {
      const ninthName = COMPASS_ID_TO_NINTH_NAME[compassId]
      const ninth = POLITICAL_AFFILIATION_OPTIONS.ninth.find(
        n => n.name === ninthName,
      )
      if (ninth) handleSetNinth(ninth)
    },
    [handleSetNinth],
  )

  const handleRemoveNinth = useCallback(() => {
    setPendingAffiliations(prev => prev.filter(p => p.type !== 'ninth'))
  }, [])

  const handleSave = useCallback(async () => {
    await setAffiliations(pendingAffiliations)
    navigation.goBack()
  }, [pendingAffiliations, setAffiliations, navigation])

  const handleExploreCompass = useCallback(() => {
    const ninth = pendingAffiliations.find(p => p.type === 'ninth')
    const tf = pendingAffiliations.find(p => p.type === 'twentyFifth')
    const party = pendingAffiliations.find(p => p.type === 'party')
    let highlightNinth: string | undefined
    if (ninth) {
      highlightNinth = NINTH_NAME_TO_COMPASS_ID[ninth.name]
    } else if (tf) {
      const match = tf.id.match(/twenty-fifth-(\d+)-(\d+)/)
      if (match) {
        const row = parseInt(match[1], 10)
        const col = parseInt(match[2], 10)
        const parentRow = Math.floor(row / 2)
        const parentCol = Math.floor(col / 2)
        const ids = Object.values(NINTH_NAME_TO_COMPASS_ID)
        highlightNinth = ids[parentRow * 3 + parentCol]
      }
    } else if (party) {
      highlightNinth = getPartyNinthId(party.id) ?? undefined
    }
    navigation.navigate('Compass', {
      mode: 'affiliate',
      highlightNinth,
      initialZoom: '9ths',
    })
  }, [pendingAffiliations, navigation])

  const currentNinth = pendingAffiliations.find(p => p.type === 'ninth')

  return (
    <Screen>
      <Header.Outer noBottomBorder>
        <Header.BackButton />
        <Header.Content>
          <Header.TitleText>
            <Trans>My Affiliations</Trans>
          </Header.TitleText>
        </Header.Content>
        <Header.Slot />
      </Header.Outer>

      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}>
          {/* Compass Preview */}
          <View
            style={[
              a.p_lg,
              a.rounded_xl,
              t.atoms.bg_contrast_25,
              {borderWidth: 1, borderColor: t.palette.contrast_100},
            ]}>
            <View
              style={[a.flex_row, a.justify_between, a.align_center, a.mb_md]}>
              <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                <Trans>Your position on the compass</Trans>
              </Text>
              {hasChanges && (
                <Button
                  label={_(msg`Save changes`)}
                  onPress={handleSave}
                  disabled={isLoading}
                  color="primary"
                  size="small"
                  shape="default">
                  <ButtonText>
                    <Trans>Save</Trans>
                  </ButtonText>
                </Button>
              )}
            </View>
            <View style={[a.align_center, a.mb_md]}>
              <CompassMini
                affiliations={pendingAffiliations}
                onSelectNinth={handleSelectCompassNinth}
                size={140}
                compact
              />
            </View>
            <Button
              variant="solid"
              color="primary"
              size="small"
              label={_(msg`Explore party differences`)}
              onPress={handleExploreCompass}
              style={[a.w_full, a.gap_sm]}>
              <CompassIcon size="sm" fill={t.palette.white} />
              <ButtonText>
                <Trans>Explore party differences</Trans>
              </ButtonText>
            </Button>
          </View>

          {/* Current Position Detail */}
          {currentNinth && (
            <View
              style={[
                a.p_lg,
                a.rounded_xl,
                {backgroundColor: t.palette.primary_500 + '10'},
                {borderWidth: 1, borderColor: t.palette.primary_500 + '30'},
              ]}>
              <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_sm]}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: currentNinth.color,
                  }}
                />
                <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                  {currentNinth.name}
                </Text>
                <View style={{flex: 1}} />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Remove 9th affiliation`)}
                  accessibilityHint={_(msg`Clears your selected 9th`)}
                  onPress={handleRemoveNinth}
                  style={[a.p_xs, a.rounded_full, t.atoms.bg_contrast_100]}>
                  <XIcon size="xs" style={t.atoms.text_contrast_medium} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Party Section */}
          <View
            style={[
              a.p_lg,
              a.rounded_xl,
              t.atoms.bg_contrast_25,
              a.border,
              t.atoms.border_contrast_low,
            ]}>
            <Text style={[a.text_md, a.font_bold, t.atoms.text, a.mb_md]}>
              <Trans>Political Party</Trans>
            </Text>
            <View style={[a.gap_md]}>
              {POLITICAL_AFFILIATION_OPTIONS.party.map(party => {
                const isSelected = pendingAffiliations.some(
                  a => a.id === party.id,
                )
                const profile = PARTY_COMPASS_PROFILE_BY_ID[party.id]
                return (
                  <TouchableOpacity
                    key={party.id}
                    accessibilityRole="button"
                    accessibilityLabel={party.name}
                    accessibilityHint={_(
                      msg`Select or clear this party affiliation`,
                    )}
                    accessibilityState={{selected: isSelected}}
                    onPress={() => handleToggleParty(party)}
                    style={[
                      a.p_md,
                      a.rounded_md,
                      a.flex_row,
                      a.align_center,
                      a.gap_md,
                      {
                        backgroundColor: isSelected
                          ? party.color + '15'
                          : t.atoms.bg.backgroundColor,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? party.color + '60'
                          : t.palette.contrast_100,
                      },
                    ]}>
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: party.color,
                      }}
                    />
                    <View style={[a.flex_1]}>
                      <Text style={[a.font_bold, a.text_sm, t.atoms.text]}>
                        {party.name}
                      </Text>
                      {profile && (
                        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                          {profile.totalMembers.toLocaleString()} members •{' '}
                          {profile.descriptors.slice(0, 2).join(', ')}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View
                        style={[
                          a.p_xs,
                          a.rounded_full,
                          {backgroundColor: party.color},
                        ]}>
                        <Text style={{color: '#fff', fontSize: 10}}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* 9th Position Section — 3×3 grid matching the compass layout */}
          <View
            style={[
              a.p_lg,
              a.rounded_xl,
              t.atoms.bg_contrast_25,
              a.border,
              t.atoms.border_contrast_low,
            ]}>
            <Text style={[a.text_md, a.font_bold, t.atoms.text, a.mb_md]}>
              <Trans>Compass Position (9ths)</Trans>
            </Text>
            <View style={[a.gap_md]}>
              {[0, 1, 2].map(rowIdx => (
                <View key={rowIdx} style={[a.flex_row, a.gap_md]}>
                  {POLITICAL_AFFILIATION_OPTIONS.ninth
                    .slice(rowIdx * 3, rowIdx * 3 + 3)
                    .map(ninth => {
                      const isSelected = pendingAffiliations.some(
                        a => a.id === ninth.id,
                      )
                      return (
                        <TouchableOpacity
                          key={ninth.id}
                          accessibilityRole="button"
                          accessibilityLabel={ninth.name}
                          accessibilityHint={_(
                            msg`Select this 9th affiliation`,
                          )}
                          accessibilityState={{selected: isSelected}}
                          onPress={() => handleSetNinth(ninth)}
                          style={[
                            styles.ninthPill,
                            a.flex_1,
                            {
                              backgroundColor: isSelected
                                ? ninth.color + '25'
                                : t.atoms.bg.backgroundColor,
                              borderColor: isSelected
                                ? ninth.color + '60'
                                : t.palette.contrast_100,
                              borderWidth: 1,
                            },
                          ]}>
                          <View
                            style={[
                              styles.ninthDot,
                              {backgroundColor: ninth.color},
                            ]}
                          />
                          <Text
                            style={[
                              a.text_xs,
                              a.font_bold,
                              t.atoms.text,
                              a.flex_1,
                            ]}
                            numberOfLines={2}>
                            {ninth.name}
                          </Text>
                          {isSelected && (
                            <Text style={{color: ninth.color, fontSize: 10}}>
                              ✓
                            </Text>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                </View>
              ))}
            </View>
          </View>

          {/* Vote Analysis */}
          <VoteAnalysis navigation={navigation} />

          {/* Tip */}
          <View
            style={[
              a.p_md,
              a.rounded_md,
              {backgroundColor: t.palette.primary_500 + '08'},
            ]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>
                Tap the compass above to explore where parties cluster and find
                your position visually.
              </Trans>
            </Text>
          </View>
        </ScrollView>
      </Layout.Center>
    </Screen>
  )
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
    gap: 16,
  },
  ninthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ninthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
