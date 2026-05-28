import {useCallback, useState} from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {useSession} from '#/state/session'
import {useAcuerdos} from '#/state/shell/acuerdos'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Lock_Stroke2_Corner0_Rounded as LockIcon} from '#/components/icons/Lock'
import {Person_Stroke2_Corner0_Rounded as UsersIcon} from '#/components/icons/Person'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

export function AcuerdoListScreen() {
  const t = useTheme()
  const {acuerdos, myLocks, requestExit, getCooldownRemainingMs, checkQuorum} =
    useAcuerdos()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedAcuerdo, setSelectedAcuerdo] = useState<string | null>(null)

  const publicAcuerdos = acuerdos.filter(a => a.visibility === 'public')
  const myLockedUris = new Set(myLocks.map(l => l.acuerdo))

  return (
    <Layout.Screen testID="acuerdoListScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Acuerdos</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            Coaliciones de voto bloqueado
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}>
        {/* Create button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo acuerdo"
          accessibilityHint="Abre un formulario para crear una nueva coalición de voto bloqueado"
          style={[styles.createBtn, {backgroundColor: t.palette.primary_500}]}
          onPress={() => setShowCreate(true)}>
          <Text style={styles.createBtnText}>+ Crear Acuerdo</Text>
        </TouchableOpacity>

        {/* My Locks */}
        {myLocks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, t.atoms.text]}>
              <Trans>Mis Votos Bloqueados</Trans>
            </Text>
            {myLocks.map(lock => {
              const acuerdo = acuerdos.find(a => a.uri === lock.acuerdo)
              const isExiting =
                !!lock.exitRequestedAt && !lock.exitCooldownEndsAt
              const isCooldown =
                !!lock.exitCooldownEndsAt &&
                new Date(lock.exitCooldownEndsAt) > new Date()
              const remainingMs = getCooldownRemainingMs(lock.id)
              const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000))

              return (
                <View
                  key={lock.id}
                  style={[styles.lockCard, t.atoms.bg_contrast_25]}>
                  <View style={styles.lockHeader}>
                    <LockIcon
                      size="sm"
                      style={{color: t.palette.primary_500}}
                    />
                    <Text style={[styles.lockTitle, t.atoms.text]}>
                      {acuerdo?.title || 'Acuerdo desconocido'}
                    </Text>
                  </View>
                  <Text style={[styles.lockMeta, t.atoms.text_contrast_medium]}>
                    Bloqueado: {new Date(lock.lockedAt).toLocaleDateString()}
                  </Text>
                  {lock.commitment.type === 'delegate-to-rep' && (
                    <Text
                      style={[
                        styles.lockBadge,
                        {color: t.palette.positive_500},
                      ]}>
                      Delegado a representante
                    </Text>
                  )}
                  {lock.commitment.type === 'follow-acuerdo' && (
                    <Text
                      style={[
                        styles.lockBadge,
                        {color: t.palette.primary_500},
                      ]}>
                      Siguiendo consenso del acuerdo
                    </Text>
                  )}
                  {isCooldown && (
                    <View
                      style={[
                        styles.cooldownBanner,
                        {backgroundColor: t.palette.negative_500 + '15'},
                      ]}>
                      <WarningIcon
                        size="sm"
                        style={{color: t.palette.negative_500}}
                      />
                      <Text
                        style={[
                          styles.cooldownText,
                          {color: t.palette.negative_500},
                        ]}>
                        Cooldown activo: {remainingHours}h restantes
                      </Text>
                    </View>
                  )}
                  <Button
                    variant="ghost"
                    color="negative"
                    size="small"
                    label="exit"
                    onPress={() => requestExit(lock.id)}
                    disabled={isCooldown || isExiting}>
                    <ButtonText>
                      {isCooldown
                        ? `Esperar ${remainingHours}h...`
                        : 'Solicitar salida'}
                    </ButtonText>
                  </Button>
                </View>
              )
            })}
          </View>
        )}

        {/* Public Acuerdos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            <Trans>Acuerdos Públicos</Trans>
          </Text>
          {publicAcuerdos.map(acuerdo => {
            const isLocked = myLockedUris.has(acuerdo.uri)
            const quorum = checkQuorum(acuerdo.uri)

            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Ver detalles del acuerdo ${acuerdo.title}`}
                accessibilityHint="Muestra la descripción y opciones de participación para este acuerdo"
                key={acuerdo.uri}
                style={[styles.acuerdoCard, t.atoms.bg_contrast_25]}
                onPress={() => setSelectedAcuerdo(acuerdo.uri)}>
                <View style={styles.acuerdoHeader}>
                  <Text style={[styles.acuerdoTitle, t.atoms.text]}>
                    {acuerdo.title}
                  </Text>
                  <View
                    style={[
                      styles.phaseBadge,
                      {backgroundColor: getPhaseColor(acuerdo.phase, t)},
                    ]}>
                    <Text style={styles.phaseText}>{acuerdo.phase}</Text>
                  </View>
                </View>
                <Text
                  style={[styles.acuerdoDesc, t.atoms.text_contrast_medium]}
                  numberOfLines={2}>
                  {acuerdo.description}
                </Text>
                <View style={styles.acuerdoStats}>
                  <View style={styles.stat}>
                    <UsersIcon size="xs" style={t.atoms.text_contrast_medium} />
                    <Text
                      style={[styles.statText, t.atoms.text_contrast_medium]}>
                      {acuerdo.lockedCount} / {acuerdo.minLockQuorum} quorum
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <LockIcon size="xs" style={t.atoms.text_contrast_medium} />
                    <Text
                      style={[styles.statText, t.atoms.text_contrast_medium]}>
                      {quorum.quorumMet
                        ? 'Quorum ✓'
                        : `Faltan ${quorum.shortfall}`}
                    </Text>
                  </View>
                </View>
                {!isLocked && acuerdo.phase === 'active' && (
                  <View style={styles.actions}>
                    <Button
                      variant="solid"
                      color="primary"
                      size="small"
                      label="lock"
                      onPress={() => setSelectedAcuerdo(acuerdo.uri)}>
                      <ButtonText>Bloquear voto</ButtonText>
                    </Button>
                  </View>
                )}
                {isLocked && (
                  <View
                    style={[
                      styles.lockedBadge,
                      {backgroundColor: t.palette.primary_500 + '20'},
                    ]}>
                    <LockIcon
                      size="xs"
                      style={{color: t.palette.primary_500}}
                    />
                    <Text
                      style={[
                        styles.lockedText,
                        {color: t.palette.primary_500},
                      ]}>
                      Tu voto está bloqueado
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Create Modal */}
      <CreateAcuerdoModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* Join/Delegate Explanation Modal */}
      {selectedAcuerdo && (
        <JoinAcuerdoModal
          acuerdoUri={selectedAcuerdo}
          onClose={() => setSelectedAcuerdo(null)}
        />
      )}
    </Layout.Screen>
  )
}

// ─── Join/Delegate Explanation Modal ─────────────────────────────────────────
// FIX #5: Makes the stakes viscerally clear

function JoinAcuerdoModal({
  acuerdoUri,
  onClose,
}: {
  acuerdoUri: string
  onClose: () => void
}) {
  const t = useTheme()
  const {getAcuerdoByUri, joinAcuerdo, isInCooldown} = useAcuerdos()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acuerdo = getAcuerdoByUri(acuerdoUri)
  const cooldown = isInCooldown(acuerdoUri)

  const handleJoin = async (type: 'follow-acuerdo' | 'delegate-to-rep') => {
    if (cooldown) {
      setError('Cooldown activo: debes esperar 48h antes de volver a unirte')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await joinAcuerdo(acuerdoUri, type)
      onClose()
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Error al unirse')
    } finally {
      setIsLoading(false)
    }
  }

  if (!acuerdo) return null

  return (
    <Modal visible animationType="slide" transparent>
      <View style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.6)'}]}>
        <View style={[styles.modalContent, t.atoms.bg]}>
          <Text style={[styles.modalTitle, t.atoms.text]}>{acuerdo.title}</Text>
          <Text style={[styles.modalSubtitle, t.atoms.text_contrast_medium]}>
            Elige cómo participar. Esta decisión bloquea tu voto.
          </Text>

          {error && (
            <View
              style={[
                styles.errorBanner,
                {backgroundColor: t.palette.negative_500 + '15'},
              ]}>
              <WarningIcon size="sm" style={{color: t.palette.negative_500}} />
              <Text style={{color: t.palette.negative_500, fontSize: 13}}>
                {error}
              </Text>
            </View>
          )}

          {/* Follow option */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Seguir el consenso del acuerdo"
            accessibilityHint="Tu voto seguirá automáticamente la decisión mayoritaria"
            style={[
              styles.choiceCard,
              {borderColor: t.palette.primary_500 + '40'},
            ]}
            onPress={() => handleJoin('follow-acuerdo')}
            disabled={isLoading || cooldown}>
            <View style={styles.choiceHeader}>
              <View
                style={[
                  styles.choiceIcon,
                  {backgroundColor: t.palette.primary_500 + '15'},
                ]}>
                <UsersIcon size="sm" style={{color: t.palette.primary_500}} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[styles.choiceTitle, t.atoms.text]}>
                  Seguir el consenso
                </Text>
                <Text style={[styles.choiceDesc, t.atoms.text_contrast_medium]}>
                  Tu voto se bloquea y sigue automáticamente la decisión
                  mayoritaria de este acuerdo. No puedes votar individualmente
                  en las políticas cubiertas hasta que salgas del acuerdo.
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.stakesRow,
                {backgroundColor: t.palette.primary_500 + '08'},
              ]}>
              <LockIcon size="xs" style={{color: t.palette.primary_500}} />
              <Text style={[styles.stakesText, {color: t.palette.primary_500}]}>
                Bloqueo completo • Salida: 48h cooldown
              </Text>
            </View>
          </TouchableOpacity>

          {/* Delegate option */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Delegar voto a representante"
            accessibilityHint="Transfiere tu poder de voto al representante designado por este acuerdo"
            style={[
              styles.choiceCard,
              {borderColor: t.palette.positive_500 + '40'},
            ]}
            onPress={() => handleJoin('delegate-to-rep')}
            disabled={isLoading || cooldown}>
            <View style={styles.choiceHeader}>
              <View
                style={[
                  styles.choiceIcon,
                  {backgroundColor: t.palette.positive_500 + '15'},
                ]}>
                <LockIcon size="sm" style={{color: t.palette.positive_500}} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[styles.choiceTitle, t.atoms.text]}>
                  Delegar a representante
                </Text>
                <Text style={[styles.choiceDesc, t.atoms.text_contrast_medium]}>
                  Tu poder de voto se transfiere al representante que este
                  acuerdo designe. Puedes revocar esta delegación en cualquier
                  momento, pero con 48h de cooldown.
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.stakesRow,
                {backgroundColor: t.palette.positive_500 + '08'},
              ]}>
              <LockIcon size="xs" style={{color: t.palette.positive_500}} />
              <Text
                style={[styles.stakesText, {color: t.palette.positive_500}]}>
                Delegación flexible • Revocación: 48h cooldown
              </Text>
            </View>
          </TouchableOpacity>

          <Button variant="ghost" label="cancel" onPress={onClose}>
            <ButtonText>Cancelar</ButtonText>
          </Button>
        </View>
      </View>
    </Modal>
  )
}

// ─── Private Acuerdo Watermark Overlay ───────────────────────────────────────
// FIX #4: Embeds viewer identity for leak tracing

export function AcuerdoWatermark({acuerdoUri}: {acuerdoUri: string}) {
  const t = useTheme()
  const {getAcuerdoByUri, getWatermark, generateWatermark} = useAcuerdos()
  const [visible, setVisible] = useState(true)

  const acuerdo = getAcuerdoByUri(acuerdoUri)
  if (!acuerdo || acuerdo.visibility !== 'private') return null

  let watermark = getWatermark(acuerdoUri)
  if (!watermark) {
    watermark = generateWatermark(acuerdoUri)
  }

  if (!visible) return null

  return (
    <View
      style={[
        styles.watermarkOverlay,
        {backgroundColor: t.palette.negative_500 + '08'},
      ]}>
      <WarningIcon size="xs" style={{color: t.palette.negative_500 + '60'}} />
      <Text
        style={[styles.watermarkText, {color: t.palette.negative_500 + '50'}]}>
        PRIVADO • {watermark.viewerDid.slice(0, 20)}... •{' '}
        {watermark.timestamp.slice(0, 10)}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ocultar marca de agua"
        accessibilityHint="Oculta la información de rastreo de privacidad temporalmente"
        onPress={() => setVisible(false)}>
        <Text style={{color: t.palette.negative_500 + '40', fontSize: 11}}>
          ocultar
        </Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Create Modal ────────────────────────────────────────────────────────────

function CreateAcuerdoModal({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const t = useTheme()
  const {createAcuerdo} = useAcuerdos()
  const {currentAccount} = useSession()
  const viewerDid = currentAccount?.did || 'did:plc:viewer'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [minQuorum, setMinQuorum] = useState('10')

  const handleCreate = useCallback(() => {
    createAcuerdo({
      title,
      description,
      author: viewerDid,
      scope: {type: 'policy', subjects: []},
      visibility: isPublic ? 'public' : 'private',
      admins: [viewerDid],
      minLockQuorum: parseInt(minQuorum, 10) || 10,
      phase: 'forming',
    })
    onClose()
  }, [
    title,
    description,
    isPublic,
    minQuorum,
    createAcuerdo,
    onClose,
    viewerDid,
  ])

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
        <View style={[styles.modalContent, t.atoms.bg]}>
          <Text style={[styles.modalTitle, t.atoms.text]}>Crear Acuerdo</Text>
          <TextInput
            accessibilityLabel="Título del acuerdo"
            accessibilityHint="Introduce el nombre descriptivo para tu coalición"
            style={[styles.input, t.atoms.bg_contrast_25, t.atoms.text]}
            placeholder="Título del acuerdo"
            placeholderTextColor={t.palette.contrast_400}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            accessibilityLabel="Descripción del acuerdo"
            accessibilityHint="Describe los objetivos y alcance de esta coalición"
            style={[
              styles.input,
              styles.textArea,
              t.atoms.bg_contrast_25,
              t.atoms.text,
            ]}
            placeholder="Descripción"
            placeholderTextColor={t.palette.contrast_400}
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <View style={styles.row}>
            <Text style={t.atoms.text}>Público</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} />
          </View>
          {!isPublic && (
            <View
              style={[
                styles.privacyWarning,
                {backgroundColor: t.palette.negative_500 + '10'},
              ]}>
              <WarningIcon size="sm" style={{color: t.palette.negative_500}} />
              <Text
                style={{color: t.palette.negative_500, fontSize: 12, flex: 1}}>
                Los acuerdos privados incluyen marcas de agua que identifican a
                cada visualizador para prevenir fugas.
              </Text>
            </View>
          )}
          <TextInput
            accessibilityLabel="Quorum mínimo"
            accessibilityHint="Número mínimo de miembros bloqueados para activar el acuerdo"
            style={[styles.input, t.atoms.bg_contrast_25, t.atoms.text]}
            placeholder="Quorum mínimo"
            placeholderTextColor={t.palette.contrast_400}
            keyboardType="numeric"
            value={minQuorum}
            onChangeText={setMinQuorum}
          />
          <View style={styles.modalActions}>
            <Button variant="ghost" label="cancel" onPress={onClose}>
              <ButtonText>Cancelar</ButtonText>
            </Button>
            <Button
              variant="solid"
              color="primary"
              label="create"
              onPress={handleCreate}>
              <ButtonText>Crear</ButtonText>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function getPhaseColor(phase: string, t: ReturnType<typeof useTheme>) {
  switch (phase) {
    case 'forming':
      return t.palette.contrast_400 + '30'
    case 'active':
      return t.palette.primary_500 + '30'
    case 'locked':
      return t.palette.positive_500 + '30'
    case 'resolved':
      return t.palette.primary_500 + '30'
    case 'cancelled':
      return t.palette.negative_500 + '30'
    default:
      return t.palette.contrast_400 + '30'
  }
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16, paddingBottom: 100},
  createBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  createBtnText: {color: 'white', fontWeight: '700', fontSize: 16},
  section: {marginBottom: 24},
  sectionTitle: {fontSize: 20, fontWeight: '800', marginBottom: 16},
  lockCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  lockHeader: {flexDirection: 'row', alignItems: 'center', gap: 8},
  lockTitle: {fontSize: 16, fontWeight: '700'},
  lockMeta: {fontSize: 13},
  lockBadge: {fontSize: 12, fontWeight: '600'},
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  cooldownText: {fontSize: 12, fontWeight: '600'},
  acuerdoCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  acuerdoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acuerdoTitle: {fontSize: 16, fontWeight: '700', flex: 1},
  phaseBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12},
  phaseText: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase'},
  acuerdoDesc: {fontSize: 14, lineHeight: 20},
  acuerdoStats: {flexDirection: 'row', gap: 16, marginTop: 4},
  stat: {flexDirection: 'row', alignItems: 'center', gap: 4},
  statText: {fontSize: 12},
  actions: {flexDirection: 'row', gap: 8, marginTop: 8},
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  lockedText: {fontSize: 12, fontWeight: '600'},
  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
  },
  modalTitle: {fontSize: 20, fontWeight: '800'},
  modalSubtitle: {fontSize: 14, lineHeight: 20},
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  textArea: {height: 100, textAlignVertical: 'top'},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  choiceCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  choiceHeader: {flexDirection: 'row', gap: 12},
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: {fontSize: 16, fontWeight: '700'},
  choiceDesc: {fontSize: 13, lineHeight: 18, marginTop: 4},
  stakesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
  },
  stakesText: {fontSize: 12, fontWeight: '600'},
  privacyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  watermarkText: {fontSize: 10, fontWeight: '600'},
})
