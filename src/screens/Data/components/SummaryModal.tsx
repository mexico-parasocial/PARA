import {Modal, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {type DeliberationSummary} from '#/state/queries/community-civic-tree'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const CLAIM_STANCE_LABELS: Record<
  DeliberationSummary['normalizedClaims'][number]['stance'],
  string
> = {
  support: 'Apoya',
  oppose: 'Objeta',
  unsure: 'Por definir',
  amendment: 'Enmienda',
  needs_evidence: 'Falta evidencia',
}

const CLAIM_STANCE_COLORS: Record<
  DeliberationSummary['normalizedClaims'][number]['stance'],
  string
> = {
  support: '#22c55e',
  oppose: '#ef4444',
  unsure: '#6b7280',
  amendment: '#f59e0b',
  needs_evidence: '#8b5cf6',
}

export function SummaryModal({
  summary,
  visible,
  onClose,
}: {
  summary: DeliberationSummary | null
  visible: boolean
  onClose: () => void
}) {
  const t = useTheme()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, {backgroundColor: t.palette.contrast_0}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: t.palette.contrast_900}]}>
              <Trans>Inteligencia del Discurso</Trans>
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close summary"
              accessibilityHint="Closes the summary panel"
              onPress={onClose}
              style={styles.closeBtn}>
              <Text style={{color: t.palette.contrast_500, fontSize: 20}}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {summary ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}>
              {/* Stats bar */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, {color: t.palette.primary_500}]}>
                    {summary.totalClaims}
                  </Text>
                  <Text style={[styles.statLabel, {color: t.palette.contrast_500}]}>
                    <Trans>Claims</Trans>
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, {color: t.palette.primary_500}]}>
                    {summary.totalRelationships}
                  </Text>
                  <Text style={[styles.statLabel, {color: t.palette.contrast_500}]}>
                    <Trans>Relationships</Trans>
                  </Text>
                </View>
              </View>

              {summary.normalizedClaims?.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: t.palette.contrast_900}]}>
                    <Trans>Claims And Stances</Trans>
                  </Text>
                  {summary.normalizedClaims.map((claim, i) => {
                    const stanceColor = CLAIM_STANCE_COLORS[claim.stance]
                    return (
                      <View
                        key={`${claim.sourceId ?? claim.claim}-${i}`}
                        style={[
                          styles.areaBox,
                          {backgroundColor: t.palette.contrast_50},
                        ]}>
                        <View style={styles.claimHeaderRow}>
                          <Text
                            style={[
                              styles.sourcePill,
                              {
                                backgroundColor: t.palette.contrast_100,
                                color: t.palette.contrast_600,
                              },
                            ]}>
                            {claim.sourceType}
                          </Text>
                          <Text
                            style={[
                              styles.stancePill,
                              {
                                backgroundColor: stanceColor + '18',
                                color: stanceColor,
                              },
                            ]}>
                            {CLAIM_STANCE_LABELS[claim.stance]}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.areaTitle,
                            {color: t.palette.contrast_900},
                          ]}>
                          {claim.claim}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}

              {summary.tensionLines?.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: '#ef4444'}]}>
                    <Trans>Tension Lines</Trans>
                  </Text>
                  {summary.tensionLines.map((tension, i) => (
                    <View
                      key={`${tension.axis}-${i}`}
                      style={[
                        styles.areaBox,
                        {backgroundColor: t.palette.contrast_50},
                      ]}>
                      <Text
                        style={[
                          styles.areaTitle,
                          {color: t.palette.contrast_900},
                        ]}>
                        {tension.axis}
                      </Text>
                      <Text
                        style={[
                          styles.areaClaim,
                          {color: t.palette.contrast_600},
                        ]}>
                        {tension.summary}
                      </Text>
                      {tension.sides.length > 0 && (
                        <View style={styles.tensionSides}>
                          {tension.sides.map((side, j) => (
                            <Text
                              key={`${side}-${j}`}
                              style={[
                                styles.sideText,
                                {color: t.palette.contrast_600},
                              ]}>
                              {side}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {summary.openQuestions?.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: '#8b5cf6'}]}>
                    <Trans>Open Questions</Trans>
                  </Text>
                  {summary.openQuestions.map((question, i) => (
                    <View
                      key={`${question.question}-${i}`}
                      style={[
                        styles.areaBox,
                        {backgroundColor: '#8b5cf6' + '12'},
                      ]}>
                      <Text
                        style={[
                          styles.questionText,
                          {color: t.palette.contrast_900},
                        ]}>
                        {question.question}
                      </Text>
                      <Text style={[styles.questionWhy, {color: '#8b5cf6'}]}>
                        {question.whyItMatters}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Stance distribution */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: t.palette.contrast_900}]}>
                  <Trans>Stance Distribution</Trans>
                </Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barSegment,
                      {backgroundColor: '#22c55e', flex: summary.stanceDistribution.pro},
                    ]}
                  />
                  <View
                    style={[
                      styles.barSegment,
                      {backgroundColor: '#ef4444', flex: summary.stanceDistribution.con},
                    ]}
                  />
                  <View
                    style={[
                      styles.barSegment,
                      {backgroundColor: '#9ca3af', flex: summary.stanceDistribution.neutral},
                    ]}
                  />
                </View>
                <View style={styles.barLabels}>
                  <Text style={{color: '#22c55e', fontSize: 12, fontWeight: '600'}}>
                    Pro {summary.stanceDistribution.pro}%
                  </Text>
                  <Text style={{color: '#ef4444', fontSize: 12, fontWeight: '600'}}>
                    Con {summary.stanceDistribution.con}%
                  </Text>
                  <Text style={{color: '#9ca3af', fontSize: 12, fontWeight: '600'}}>
                    Neutral {summary.stanceDistribution.neutral}%
                  </Text>
                </View>
              </View>

              {/* Consensus areas */}
              {summary.consensusAreas.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: '#22c55e'}]}>
                    <Trans>Consensus Areas</Trans>
                  </Text>
                  {summary.consensusAreas.map((area, i) => (
                    <View
                      key={i}
                      style={[
                        styles.areaBox,
                        {backgroundColor: t.palette.contrast_50},
                      ]}>
                      <Text
                        style={[styles.areaTitle, {color: t.palette.contrast_900}]}>
                        {area.topic}
                      </Text>
                      {area.claims.map((claim, j) => (
                        <Text
                          key={j}
                          style={[
                            styles.areaClaim,
                            {color: t.palette.contrast_600},
                          ]}>
                          • {claim}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Unresolved conflicts */}
              {summary.unresolvedConflicts.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: '#ef4444'}]}>
                    <Trans>Unresolved Conflicts</Trans>
                  </Text>
                  {summary.unresolvedConflicts.map((conflict, i) => (
                    <View
                      key={i}
                      style={[
                        styles.areaBox,
                        {backgroundColor: t.palette.contrast_50},
                      ]}>
                      <Text
                        style={[styles.areaTitle, {color: t.palette.contrast_900}]}>
                        {conflict.topic}
                      </Text>
                      {conflict.opposingClaims.map((claim, j) => (
                        <Text
                          key={j}
                          style={[
                            styles.areaClaim,
                            {color: t.palette.contrast_600},
                          ]}>
                          {j === 0 ? '✓' : '✗'} {claim}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Bridge statements */}
              {summary.bridgeStatements.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: '#f59e0b'}]}>
                    <Trans>Bridge Statements</Trans>
                  </Text>
                  {summary.bridgeStatements.map((stmt, i) => (
                    <View
                      key={i}
                      style={[
                        styles.bridgeBox,
                        {backgroundColor: '#f59e0b' + '15'},
                      ]}>
                      <Text style={{color: '#f59e0b', fontSize: 13}}>
                        🌉 {stmt}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, {color: t.palette.contrast_500}]}>
                <Trans>Not enough claims to generate a summary yet.</Trans>
              </Text>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            accessibilityHint="Closes summary panel"
            style={[styles.doneBtn, {borderColor: t.palette.contrast_200}]}
            onPress={onClose}>
            <Text style={{color: t.palette.primary_500, fontWeight: '600'}}>
              <Trans>Done</Trans>
            </Text>
          </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  scrollArea: {
    maxHeight: '78%',
  },
  content: {
    gap: 16,
    paddingBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  statNum: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  barContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 4,
  },
  barSegment: {
    height: '100%',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  areaBox: {
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  areaClaim: {
    fontSize: 13,
    lineHeight: 18,
  },
  claimHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  sourcePill: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: 'capitalize',
  },
  stancePill: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tensionSides: {
    gap: 6,
    marginTop: 8,
  },
  sideText: {
    fontSize: 12,
    lineHeight: 17,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  questionWhy: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  bridgeBox: {
    borderRadius: 10,
    padding: 12,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
})
