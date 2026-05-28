import {useState} from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'

import {
  useApplySanctionMutation,
  useChatBadgesQuery,
  useReportUserMutation,
} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

interface MemberProfileModalProps {
  control: Dialog.DialogControlProps
  did: string
  communityUri: string
}

const REPORT_REASONS = [
  {key: 'spam', label: 'Spam'},
  {key: 'abuse', label: 'Abuso'},
  {key: 'hate', label: 'Odio'},
  {key: 'other', label: 'Otro'},
]

const SANCTION_PRESETS = [
  {label: '15 min', minutes: 15},
  {label: '1 h', minutes: 60},
  {label: '24 h', minutes: 1440},
  {label: '7 d', minutes: 10080},
]

export function MemberProfileModal({
  control,
  did,
  communityUri,
}: MemberProfileModalProps) {
  const t = useTheme()
  const {currentAccount} = useSession()
  const myDid = currentAccount?.did

  const {data} = useChatBadgesQuery(did, communityUri)
  const reportMutation = useReportUserMutation()
  const sanctionMutation = useApplySanctionMutation()

  const [reportMode, setReportMode] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const isMe = did === myDid
  const isMod = data?.participation?.isModerator && did !== myDid

  const visibleBadges = data?.visibleBadges ?? []
  const hiddenBadges = data?.hiddenBadges ?? []
  const participation = data?.participation

  const handleReport = () => {
    if (!reportReason || !myDid) return
    reportMutation.mutate({
      reportedDid: did,
      reporterDid: myDid,
      communityUri,
      reason: reportReason,
    })
    setReportMode(false)
    setReportReason('')
  }

  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={`Miembro ${did.slice(-8)}`}>
        {/* Header: avatar + basic info */}
        <View style={[a.align_center, a.gap_sm, a.py_md]}>
          <UserAvatar size={64} type="user" avatar={null} />
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            {did.slice(-12)}
          </Text>
          {participation && (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              {participation.messageCount} msgs · {participation.votesCast}{' '}
              votos · {participation.daysInCommunity} días
            </Text>
          )}
        </View>

        {/* Risk badges (visible in chat) */}
        {visibleBadges.length > 0 && (
          <View style={[a.py_md]}>
            <Text
              style={[
                a.text_xs,
                a.font_bold,
                t.atoms.text_contrast_medium,
                a.mb_sm,
              ]}>
              ESTADO DE COMUNIDAD
            </Text>
            <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
              {visibleBadges.map(badge => (
                <View
                  key={badge.type}
                  style={[
                    styles.badgeChip,
                    badge.severity === 'critical' && styles.criticalChip,
                    badge.severity === 'warning' && styles.warningChip,
                    badge.severity === 'info' && styles.infoChip,
                  ]}>
                  <Text style={[a.text_sm]}>
                    {badge.icon} {badge.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Participation badges */}
        {hiddenBadges.length > 0 && (
          <View style={[a.py_md]}>
            <Text
              style={[
                a.text_xs,
                a.font_bold,
                t.atoms.text_contrast_medium,
                a.mb_sm,
              ]}>
              PARTICIPACIÓN
            </Text>
            <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
              {hiddenBadges.map(badge => (
                <View
                  key={badge.type}
                  style={[styles.badgeChip, styles.infoChip]}>
                  <Text style={[a.text_sm, t.atoms.text]}>
                    {badge.icon} {badge.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        {!isMe && !reportMode && (
          <View style={[a.gap_sm, a.pt_md]}>
            <Button
              variant="solid"
              color="secondary"
              size="small"
              label="Reportar"
              onPress={() => setReportMode(true)}>
              <ButtonText>Reportar</ButtonText>
            </Button>

            {isMod && (
              <View style={[a.gap_xs, a.pt_sm]}>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  Sancionar rápido
                </Text>
                <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
                  {SANCTION_PRESETS.map(preset => (
                    <TouchableOpacity accessibilityRole="button"
                      key={preset.minutes}
                      onPress={() => {
                        if (!myDid) return
                        sanctionMutation.mutate({
                          targetDid: did,
                          sanctionedByDid: myDid,
                          communityUri,
                          type: 'mute',
                          durationMinutes: preset.minutes,
                        })
                      }}
                      style={[styles.sanctionChip]}>
                      <Text style={[a.text_xs, t.atoms.text]}>
                        🔇 {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Report form */}
        {reportMode && (
          <View style={[a.gap_sm, a.pt_md]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              Reportar a {did.slice(-8)}
            </Text>
            <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
              {REPORT_REASONS.map(r => (
                <TouchableOpacity accessibilityRole="button"
                  key={r.key}
                  onPress={() => setReportReason(r.key)}
                  style={[
                    styles.reasonChip,
                    reportReason === r.key && styles.reasonChipActive,
                  ]}>
                  <Text
                    style={[
                      a.text_sm,
                      reportReason === r.key
                        ? t.atoms.text
                        : t.atoms.text_contrast_medium,
                    ]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              variant="solid"
              color="primary"
              size="small"
              label="Enviar reporte"
              onPress={handleReport}
              disabled={!reportReason || reportMutation.isPending}>
              <ButtonText>Enviar reporte</ButtonText>
            </Button>
            <Button
              variant="ghost"
              color="secondary"
              size="small"
              label="Cancelar"
              onPress={() => setReportMode(false)}>
              <ButtonText>Cancelar</ButtonText>
            </Button>
          </View>
        )}
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

const styles = StyleSheet.create({
  badgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  criticalChip: {
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
  warningChip: {
    backgroundColor: 'rgba(255,149,0,0.12)',
  },
  infoChip: {
    backgroundColor: 'rgba(128,128,128,0.10)',
  },
  sanctionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.10)',
  },
  reasonChipActive: {
    backgroundColor: 'rgba(10,132,255,0.15)',
  },
})
