import {useCallback, useState} from 'react'
import {Modal, StyleSheet, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type PoliticalAffiliationType} from '#/lib/political-affiliations'
import {BADGE_INFO} from '#/state/shell/political-affiliation'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {Text} from '#/components/Typography'

export function useAffiliationChangeGuard() {
  const [pendingChange, setPendingChange] = useState<{
    type: PoliticalAffiliationType
    onConfirm: () => void
    onCancel?: () => void
  } | null>(null)

  const requestChange = useCallback(
    (
      type: PoliticalAffiliationType,
      onConfirm: () => void,
      onCancel?: () => void,
    ) => {
      setPendingChange({type, onConfirm, onCancel})
    },
    [],
  )

  const confirm = useCallback(() => {
    if (pendingChange) {
      pendingChange.onConfirm()
      setPendingChange(null)
    }
  }, [pendingChange])

  const cancel = useCallback(() => {
    if (pendingChange?.onCancel) {
      pendingChange.onCancel()
    }
    setPendingChange(null)
  }, [pendingChange])

  return {
    pendingChange,
    requestChange,
    confirm,
    cancel,
  }
}

export function AffiliationChangeModal({
  type,
  onConfirm,
  onCancel,
}: {
  type: PoliticalAffiliationType
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const info = BADGE_INFO[type]

  const cooldownText = (() => {
    switch (type) {
      case 'party':
        return _(msg`7 days`)
      case 'ninth':
      case 'twentyFifth':
        return _(msg`48 hours`)
    }
  })()

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.backdrop}
          onPress={onCancel}
        />
        <View style={[styles.content, t.atoms.bg, t.atoms.border_contrast_low]}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[styles.badgeIcon, {backgroundColor: info.color + '20'}]}>
              <View style={[styles.badgeDot, {backgroundColor: info.color}]} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, t.atoms.text]}>
                <Trans>Change {info.name}</Trans>
              </Text>
              <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
                {info.description}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.closeButton}>
              <XIcon size="md" style={t.atoms.text_contrast_medium} />
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View
            style={[
              styles.warningBox,
              {backgroundColor: t.palette.negative_500 + '15'},
            ]}>
            <WarningIcon size="sm" style={{color: t.palette.negative_500}} />
            <Text
              style={[styles.warningTitle, {color: t.palette.negative_500}]}>
              <Trans>Cooldown Enforced</Trans>
            </Text>
            <Text style={[styles.warningText, t.atoms.text_contrast_medium]}>
              <Trans>
                Once you change your {info.name.toLowerCase()}, you cannot
                modify it again for{' '}
                <Text style={[a.font_bold, t.atoms.text]}>{cooldownText}</Text>.
                This prevents identity manipulation and ensures accountability.
              </Trans>
            </Text>
          </View>

          {/* Responsibilities */}
          <View style={styles.responsibilities}>
            <Text style={[styles.sectionTitle, t.atoms.text]}>
              <Trans>What this means</Trans>
            </Text>
            {info.responsibilities.map((resp: string, i: number) => (
              <View key={i} style={styles.respRow}>
                <Text style={[styles.respBullet, {color: info.color}]}>•</Text>
                <Text style={[styles.respText, t.atoms.text_contrast_medium]}>
                  {resp}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label={_(msg`Cancel`)}
              onPress={onCancel}
              variant="ghost"
              color="secondary"
              size="small"
              style={styles.actionButton}>
              <ButtonText>
                <Trans>Cancel</Trans>
              </ButtonText>
            </Button>
            <Button
              label={_(msg`Confirm Change`)}
              onPress={onConfirm}
              variant="solid"
              color="primary"
              size="small"
              style={styles.actionButton}>
              <ButtonText>
                <Trans>I Understand — Change It</Trans>
              </ButtonText>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  warningBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  responsibilities: {
    gap: 10,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  respRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  respBullet: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  respText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flex: 1,
  },
})
