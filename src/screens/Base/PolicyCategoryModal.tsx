import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'

import {type CategoryData} from '#/lib/constants/mockData'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ArrowLeft_Stroke2_Corner0_Rounded as ArrowLeft} from '#/components/icons/Arrow'

/**
 * Full-screen modal that displays a voted-policy category with a synergy
 * score and per-policy alignment details.
 *
 * Extracted from MyBaseScreen to keep that file focused on the profile layout.
 */
export function PolicyCategoryModal({
  category,
  onClose,
}: {
  category: CategoryData
  onClose: () => void
}) {
  const t = useTheme()

  const synergyScore = category.policies
    ? Math.round(
        (category.policies.filter(p => p.vote === p.communityVote).length /
          category.policies.length) *
          100,
      )
    : 0

  return (
    <View style={[styles.fullScreenModal, t.atoms.bg]}>
      {/* Header */}
      <View style={styles.fsModalHeader}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backButton}>
          <ArrowLeft size="lg" style={t.atoms.text} />
        </TouchableOpacity>
        <Text style={[styles.fsModalTitle, t.atoms.text]}>
          {category.title}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.fsScrollContent}>
        {/* Synergy Header */}
        <View
          style={[
            styles.synergyCard,
            {backgroundColor: t.palette.primary_500},
          ]}>
          <Text style={styles.synergyLabel}>Synergy Score</Text>
          <Text style={styles.synergyValue}>{synergyScore}%</Text>
          <Text style={styles.synergySubtitle}>Alignment with Community</Text>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            t.atoms.text,
            {marginTop: 24, paddingHorizontal: 20},
          ]}>
          Detailed Policies
        </Text>

        <View style={styles.policyList}>
          {category.policies?.map(policy => (
            <View
              key={policy.id}
              style={[
                styles.policyItemCard,
                t.atoms.border_contrast_low,
                t.atoms.bg,
              ]}>
              <View style={styles.policyHeader}>
                <Text style={[styles.policyTitle, t.atoms.text]}>
                  {policy.title}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    policy.status === 'Passed'
                      ? styles.statusPassed
                      : policy.status === 'Rejected'
                        ? styles.statusRejected
                        : styles.statusPending,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      policy.status === 'Passed'
                        ? styles.statusPassedText
                        : policy.status === 'Rejected'
                          ? styles.statusRejectedText
                          : styles.statusPendingText,
                    ]}>
                    {policy.status}
                  </Text>
                </View>
              </View>

              <View style={styles.alignmentRow}>
                <View style={styles.voteInfo}>
                  <Text
                    style={[styles.voteLabel, t.atoms.text_contrast_medium]}>
                    You Voted
                  </Text>
                  <Text
                    style={[
                      styles.voteValue,
                      policy.vote === 'For'
                        ? styles.voteFor
                        : styles.voteAgainst,
                    ]}>
                    {policy.vote}
                  </Text>
                </View>

                <View style={styles.synergyBadgeRow}>
                  {policy.vote === policy.communityVote ? (
                    <View
                      style={[styles.synergyBadge, styles.synergyConsensus]}>
                      <Text style={styles.synergyBadgeText}>🤝 Consensus</Text>
                    </View>
                  ) : policy.communityVote === 'Split' ? (
                    <View style={[styles.synergyBadge, styles.synergySplit]}>
                      <Text
                        style={[
                          styles.synergyBadgeText,
                          styles.synergySplitText,
                        ]}>
                        ⚖️ Split
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[styles.synergyBadge, styles.synergyContrarian]}>
                      <Text
                        style={[
                          styles.synergyBadgeText,
                          styles.synergyContrarianText,
                        ]}>
                        🛡️ Contrarian
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
          {!category.policies && (
            <Text
              style={[
                t.atoms.text_contrast_medium,
                {textAlign: 'center', marginTop: 20},
              ]}>
              No details available for this category view.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  fullScreenModal: {
    flex: 1,
  },
  fsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  fsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  spacer: {
    width: 24,
  },
  fsScrollContent: {
    paddingBottom: 40,
  },
  synergyCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  synergyLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  synergyValue: {
    color: 'white',
    fontSize: 48,
    fontWeight: '900',
  },
  synergySubtitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  policyList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  policyItemCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPassed: {
    backgroundColor: '#d1fae5',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusPending: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPassedText: {
    color: '#065f46',
  },
  statusRejectedText: {
    color: '#991b1b',
  },
  statusPendingText: {
    color: '#374151',
  },
  alignmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  voteInfo: {
    alignItems: 'flex-start',
  },
  voteLabel: {
    fontSize: 12,
  },
  voteValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  voteFor: {
    color: '#059669',
  },
  voteAgainst: {
    color: '#dc2626',
  },
  synergyBadgeRow: {
    justifyContent: 'center',
  },
  synergyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  synergyConsensus: {
    backgroundColor: '#ecfdf5',
  },
  synergySplit: {
    backgroundColor: '#f3f4f6',
  },
  synergyContrarian: {
    backgroundColor: '#fff1f2',
  },
  synergyBadgeText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  synergySplitText: {
    color: '#4b5563',
  },
  synergyContrarianText: {
    color: '#be123c',
  },
})
