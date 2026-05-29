import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {type CommunityTreeContribution} from '#/state/queries/community-civic-tree'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

type ContributionVoteHandler = (
  contribution: CommunityTreeContribution,
  vote: 'approve' | 'reject'
) => void

export function ContributionReviewDetail({
  contribution,
  onVote,
  isVoting,
  onOpenSource,
  onClose,
  showClose,
}: {
  contribution: CommunityTreeContribution
  onVote: ContributionVoteHandler
  isVoting: boolean
  onOpenSource: (url: string) => void
  onClose: () => void
  showClose: boolean
}) {
  const t = useTheme()
  const approveActive = contribution.viewer_vote === 'approve'
  const rejectActive = contribution.viewer_vote === 'reject'
  const margin = contribution.approve_count - contribution.reject_count

  return (
    <View
      style={[
        styles.detailSheet,
        {
          backgroundColor: t.palette.contrast_0,
          borderColor: t.palette.contrast_100,
        },
      ]}>
      <View style={styles.detailHeader}>
        <View style={styles.detailHeaderText}>
          <Text style={[styles.detailEyebrow, t.atoms.text_contrast_medium]}>
            <Trans>Contribution under review</Trans>
          </Text>
          <Text style={[styles.detailTitle, t.atoms.text]} numberOfLines={3}>
            {contribution.title}
          </Text>
        </View>
        {showClose ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle del aporte"
            accessibilityHint="Returns to the list of contributions under review"
            onPress={onClose}
            style={styles.detailClose}>
            <Text style={t.atoms.text_contrast_medium}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.detailBody}>
        <View style={styles.detailMetaRow}>
          <View style={[styles.detailBadge, {borderColor: t.palette.contrast_200}]}>
            <Text style={[styles.detailBadgeText, t.atoms.text]}>
              {contribution.source_type}
            </Text>
          </View>
          <Text style={[styles.detailMeta, t.atoms.text_contrast_medium]}>
            {contribution.author_did.slice(0, 32)}...
          </Text>
        </View>

        {contribution.content ? (
          <View style={[styles.detailBlock, {borderColor: t.palette.contrast_100}]}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
              <Trans>Contexto del aporte</Trans>
            </Text>
            <Text style={[styles.detailContent, t.atoms.text]}>
              {contribution.content}
            </Text>
          </View>
        ) : null}

        {contribution.source_url ? (
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Abrir fuente del aporte"
            accessibilityHint="Abre el enlace original en el navegador"
            onPress={() => onOpenSource(contribution.source_url!)}
            style={[styles.sourceButton, {borderColor: t.palette.contrast_100}]}>
            <View style={styles.sourceTextWrap}>
              <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
                <Trans>Fuente</Trans>
              </Text>
              <Text
                style={[styles.sourceUrl, {color: t.palette.primary_500}]}
                numberOfLines={1}>
                {contribution.source_url}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.consensusBox, {borderColor: t.palette.contrast_100}]}>
          <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
            <Trans>Consenso requerido</Trans>
          </Text>
          <Text style={[styles.consensusText, t.atoms.text]}>
            <Trans>
              Entra al mapa con 3 aprobaciones y una diferencia de +2.
            </Trans>
          </Text>
          <Text style={[styles.consensusCounts, t.atoms.text_contrast_medium]}>
            <Trans>
              A favor {contribution.approve_count} / En contra{' '}
              {contribution.reject_count} · Margen {margin}
            </Trans>
          </Text>
        </View>
      </ScrollView>

      <View style={styles.detailActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Aprobar aporte"
          accessibilityHint="Vota a favor de incluir este aporte en el mapa"
          accessibilityState={{selected: approveActive}}
          disabled={isVoting}
          onPress={() => onVote(contribution, 'approve')}
          style={[
            styles.detailVoteBtn,
            {
              backgroundColor: approveActive
                ? t.palette.positive_500
                : t.palette.positive_500 + '18',
            },
          ]}>
          <Text
            style={[
              styles.reviewVoteText,
              {color: approveActive ? 'white' : t.palette.positive_500},
            ]}>
            <Trans>Aprobar</Trans>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Rechazar aporte"
          accessibilityHint="Vota en contra de incluir este aporte en el mapa"
          accessibilityState={{selected: rejectActive}}
          disabled={isVoting}
          onPress={() => onVote(contribution, 'reject')}
          style={[
            styles.detailVoteBtn,
            {
              backgroundColor: rejectActive
                ? t.palette.negative_500
                : t.palette.negative_500 + '18',
            },
          ]}>
          <Text
            style={[
              styles.reviewVoteText,
              {color: rejectActive ? 'white' : t.palette.negative_500},
            ]}>
            <Trans>Rechazar</Trans>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  detailSheet: {
    borderWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '84%',
    width: '100%',
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  detailHeaderText: {
    flex: 1,
    gap: 4,
  },
  detailEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  detailClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: {
    gap: 12,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  detailMeta: {
    fontSize: 12,
  },
  detailBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  sourceButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  sourceTextWrap: {
    gap: 4,
  },
  sourceUrl: {
    fontSize: 13,
    fontWeight: '700',
  },
  consensusBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 5,
  },
  consensusText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  consensusCounts: {
    fontSize: 12,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailVoteBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  reviewVoteText: {
    fontSize: 12,
    fontWeight: '800',
  },
})
