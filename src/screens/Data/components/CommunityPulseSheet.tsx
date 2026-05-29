import {Modal, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {type CommunityPulse} from '#/state/queries/community-civic-tree'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {CARD_TYPE_COLORS, STANCE_COLORS} from '../deliberation-colors'

interface CommunityPulseSheetProps {
  pulse: CommunityPulse | null
  communityName: string
  visible: boolean
  onClose: () => void
  onClaimPress?: (claimId: string) => void
}

export function CommunityPulseSheet({
  pulse,
  communityName,
  visible,
  onClose,
  onClaimPress,
}: CommunityPulseSheetProps) {
  const t = useTheme()
  if (!pulse) return null

  const totalClaims =
    pulse.stanceDistribution.pro +
    pulse.stanceDistribution.con +
    pulse.stanceDistribution.neutral

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, {backgroundColor: t.palette.contrast_0}]}>
          <View style={styles.header}>
            <View style={{flex: 1}}>
              <Text
                style={[styles.title, {color: t.palette.contrast_900}]}>
                <Trans>Community Pulse</Trans>
              </Text>
              <Text
                style={[styles.subtitle, {color: t.palette.contrast_500}]}>
                {communityName}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close pulse"
              accessibilityHint="Closes community pulse analysis"
              onPress={onClose}
              style={styles.closeBtn}>
              <Text style={{color: t.palette.contrast_500, fontSize: 20}}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Stance Distribution */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  {color: t.palette.contrast_700},
                ]}>
                <Trans>Opinion Landscape</Trans>
              </Text>
              <View style={styles.distBar}>
                {totalClaims > 0 && (
                  <>
                    <View
                      style={[
                        styles.distSegment,
                        {
                          flex: pulse.stanceDistribution.pro,
                          backgroundColor: STANCE_COLORS.pro,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.distSegment,
                        {
                          flex: pulse.stanceDistribution.neutral,
                          backgroundColor: STANCE_COLORS.neutral,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.distSegment,
                        {
                          flex: pulse.stanceDistribution.con,
                          backgroundColor: STANCE_COLORS.con,
                        },
                      ]}
                    />
                  </>
                )}
              </View>
              <View style={styles.distLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {backgroundColor: STANCE_COLORS.pro},
                    ]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      {color: t.palette.contrast_600},
                    ]}>
                    <Trans>Pro</Trans> ({pulse.stanceDistribution.pro})
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {backgroundColor: STANCE_COLORS.neutral},
                    ]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      {color: t.palette.contrast_600},
                    ]}>
                    <Trans>Neutral</Trans> ({pulse.stanceDistribution.neutral})
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {backgroundColor: STANCE_COLORS.con},
                    ]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      {color: t.palette.contrast_600},
                    ]}>
                    <Trans>Con</Trans> ({pulse.stanceDistribution.con})
                  </Text>
                </View>
              </View>
            </View>

            {/* My Voice */}
            {pulse.userStats && pulse.userStats.votesCast > 0 && (
              <View
                style={[
                  styles.section,
                  styles.myVoiceSection,
                  {backgroundColor: t.palette.primary_500 + '08'},
                ]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {color: t.palette.contrast_700},
                  ]}>
                  <Trans>My Voice</Trans>
                </Text>
                <View style={styles.myVoiceRow}>
                  <View style={styles.myVoiceItem}>
                    <Text
                      style={[
                        styles.myVoiceNumber,
                        {color: t.palette.primary_500},
                      ]}>
                      {pulse.userStats.votesCast}
                    </Text>
                    <Text
                      style={[
                        styles.myVoiceLabel,
                        {color: t.palette.contrast_500},
                      ]}>
                      <Trans>votes cast</Trans>
                    </Text>
                  </View>
                  <View style={styles.myVoiceItem}>
                    <Text
                      style={[
                        styles.myVoiceNumber,
                        {color: STANCE_COLORS.pro},
                      ]}>
                      {pulse.userStats.proVotes}
                    </Text>
                    <Text
                      style={[
                        styles.myVoiceLabel,
                        {color: t.palette.contrast_500},
                      ]}>
                      <Trans>pro</Trans>
                    </Text>
                  </View>
                  <View style={styles.myVoiceItem}>
                    <Text
                      style={[
                        styles.myVoiceNumber,
                        {color: STANCE_COLORS.con},
                      ]}>
                      {pulse.userStats.conVotes}
                    </Text>
                    <Text
                      style={[
                        styles.myVoiceLabel,
                        {color: t.palette.contrast_500},
                      ]}>
                      <Trans>con</Trans>
                    </Text>
                  </View>
                  <View style={styles.myVoiceItem}>
                    <Text
                      style={[
                        styles.myVoiceNumber,
                        {color: STANCE_COLORS.neutral},
                      ]}>
                      {pulse.userStats.neutralVotes}
                    </Text>
                    <Text
                      style={[
                        styles.myVoiceLabel,
                        {color: t.palette.contrast_500},
                      ]}>
                      <Trans>neutral</Trans>
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Top Topics */}
            {pulse.topEntities.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {color: t.palette.contrast_700},
                  ]}>
                  <Trans>Top Topics</Trans>
                </Text>
                <View style={styles.topicCloud}>
                  {pulse.topEntities.map((entity, i) => (
                    <View
                      key={`${entity.value}-${i}`}
                      style={[
                        styles.topicChip,
                        {
                          backgroundColor:
                            i < 3
                              ? t.palette.primary_500 + '18'
                              : t.palette.contrast_100,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.topicText,
                          {
                            color:
                              i < 3
                                ? t.palette.primary_500
                                : t.palette.contrast_600,
                            fontWeight: i < 3 ? '700' : '500',
                          },
                        ]}>
                        {entity.value}
                      </Text>
                      <Text
                        style={[
                          styles.topicCount,
                          {color: t.palette.contrast_400},
                        ]}>
                        {entity.count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Featured contributions */}
            {pulse.trendingClaims.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {color: t.palette.contrast_700},
                  ]}>
                  <Trans>Aportes destacados</Trans>
                </Text>
                {pulse.trendingClaims.map(claim => (
                  <TouchableOpacity
                    key={claim.id}
                    accessibilityRole="button"
                    onPress={() => onClaimPress?.(claim.id)}
                    style={[
                      styles.claimRow,
                      {borderColor: t.palette.contrast_100},
                    ]}>
                    <View
                      style={[
                        styles.claimDot,
                        {
                          backgroundColor:
                            CARD_TYPE_COLORS[claim.cardType] ||
                            STANCE_COLORS[claim.stance] ||
                            '#9ca3af',
                        },
                      ]}
                    />
                    <View style={styles.claimContent}>
                      <Text
                        style={[
                          styles.claimTitle,
                          {color: t.palette.contrast_900},
                        ]}
                        numberOfLines={2}>
                        {claim.title}
                      </Text>
                      <Text
                        style={[
                          styles.claimMeta,
                          {color: t.palette.contrast_500},
                        ]}>
                        {claim.stance === 'pro' ? '+' : ''}
                        {claim.influence} · {claim.voteCount} votes
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Controversial Claims */}
            {pulse.controversialClaims.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {color: t.palette.contrast_700},
                  ]}>
                  <Trans>Most Controversial</Trans>
                </Text>
                {pulse.controversialClaims.map(claim => (
                  <TouchableOpacity
                    key={claim.id}
                    accessibilityRole="button"
                    onPress={() => onClaimPress?.(claim.id)}
                    style={[
                      styles.claimRow,
                      {borderColor: t.palette.contrast_100},
                    ]}>
                    <View
                      style={[
                        styles.claimDot,
                        {backgroundColor: '#f59e0b'},
                      ]}
                    />
                    <View style={styles.claimContent}>
                      <Text
                        style={[
                          styles.claimTitle,
                          {color: t.palette.contrast_900},
                        ]}
                        numberOfLines={2}>
                        {claim.title}
                      </Text>
                      <Text
                        style={[
                          styles.claimMeta,
                          {color: t.palette.contrast_500},
                        ]}>
                        {claim.voteCount} votes · net{' '}
                        {claim.influence > 0 ? '+' : ''}
                        {claim.influence}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{height: 24}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
    minHeight: '40%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  distBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  distSegment: {
    height: '100%',
  },
  distLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  myVoiceSection: {
    borderRadius: 12,
    padding: 14,
  },
  myVoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  myVoiceItem: {
    alignItems: 'center',
  },
  myVoiceNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  myVoiceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  topicCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  topicText: {
    fontSize: 13,
  },
  topicCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  claimDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  claimContent: {
    flex: 1,
  },
  claimTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  claimMeta: {
    fontSize: 11,
    marginTop: 2,
  },
})
