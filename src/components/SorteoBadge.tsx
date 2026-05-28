import {useCallback, useState} from 'react'
import {Modal, StyleSheet, TouchableOpacity, View} from 'react-native'

import {useSortitionProofQuery} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {CircleCheck_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/CircleCheck'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {Text} from '#/components/Typography'

export function SorteoBadge({communityUri}: {communityUri: string}) {
  const t = useTheme()
  const {currentAccount} = useSession()
  const [showModal, setShowModal] = useState(false)

  const {data: proof, isLoading} = useSortitionProofQuery(
    currentAccount?.did,
    communityUri,
  )

  const isDrand = proof?.drandRound != null && proof.drandRound > 0

  const openModal = useCallback(() => setShowModal(true), [])
  const closeModal = useCallback(() => setShowModal(false), [])

  if (isLoading || !proof) {
    return null
  }

  return (
    <>
      <TouchableOpacity accessibilityRole="button"
        onPress={openModal}
        style={[
          styles.badge,
          {
            backgroundColor: isDrand
              ? t.palette.positive_975
              : t.palette.warning_975,
          },
        ]}>
        {isDrand ? (
          <CheckIcon size="xs" style={{color: t.palette.positive_500}} />
        ) : (
          <WarningIcon size="xs" style={{color: t.palette.warning_500}} />
        )}
        <Text
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: isDrand ? t.palette.positive_500 : t.palette.warning_500,
            marginLeft: 4,
          }}>
          {isDrand ? 'Sorteo verificable' : 'Sorteo por fallback'}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={showModal}
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: t.palette.contrast_0},
            ]}>
            <View style={styles.modalHeader}>
              <Text style={{fontSize: 18, fontWeight: 'bold'}}>
                {isDrand ? '✅ Sorteo verificable' : '⚠️ Sorteo por fallback'}
              </Text>
              <TouchableOpacity accessibilityRole="button" onPress={closeModal}>
                <XIcon size="sm" style={{color: t.palette.contrast_500}} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text
                style={{
                  fontSize: 14,
                  color: t.palette.contrast_700,
                  marginBottom: 12,
                }}>
                {isDrand
                  ? 'Tu asignación a esta cámara fue generada con aleatoriedad verificable de drand. Nadie pudo predecir ni manipular el resultado.'
                  : 'Tu asignación usó un método determinista de respaldo porque drand no estaba disponible en ese momento. La asignación es justa, pero no criptográficamente verificable.'}
              </Text>

              <View style={styles.row}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: t.palette.contrast_500,
                  }}>
                  Cámara:
                </Text>
                <Text style={{fontSize: 14, fontWeight: 'bold'}}>
                  {proof.chamber}
                </Text>
              </View>

              {isDrand && (
                <>
                  <View style={styles.row}>
                    <Text style={{fontSize: 12, color: t.palette.contrast_500}}>
                      Round drand:
                    </Text>
                    <Text style={{fontSize: 14, fontFamily: 'monospace'}}>
                      {proof.drandRound}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={{fontSize: 12, color: t.palette.contrast_500}}>
                      Hash SHA-256:
                    </Text>
                    <Text
                      style={{fontSize: 11, fontFamily: 'monospace', flex: 1}}
                      numberOfLines={1}>
                      {proof.hashOutput}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.row}>
                <Text style={{fontSize: 12, color: t.palette.contrast_500}}>
                  Timestamp:
                </Text>
                <Text style={{fontSize: 14}}>{proof.timestamp}</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                variant="solid"
                color="primary"
                size="small"
                onPress={closeModal}>
                <ButtonText>Cerrar</ButtonText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
})
