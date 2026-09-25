import {useCallback, useState} from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {useGetTimeAgo} from '#/lib/hooks/useTimeAgo'
import {type NavigationProp} from '#/lib/routes/types'
import {
  type ModerationReportGroup,
  useApplySanctionMutation,
  useChatMemberListQuery,
  useModerationDashboardQuery,
  useModerationReportsQuery,
} from '#/state/queries/matrix'
import {useProfilesQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {useMessageReportReasonLabels} from '#/components/chat/ReportMessageDialog'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

interface ModeratorDashboardParams {
  communityUri: string
  communityName: string
}

const SANCTION_PRESETS = [
  {label: '15 min', minutes: 15},
  {label: '1 h', minutes: 60},
  {label: '24 h', minutes: 1440},
  {label: '7 d', minutes: 10080},
]

export function ModeratorDashboardScreen() {
  const route = useRoute<{
    key: string
    name: 'ModeratorDashboard'
    params: ModeratorDashboardParams
  }>()
  const t = useTheme()
  const {currentAccount} = useSession()
  const {communityUri, communityName} = route.params
  const modDid = currentAccount?.did

  const [refreshing, setRefreshing] = useState(false)

  const {
    data: dashboard,

    refetch,
  } = useModerationDashboardQuery(communityUri, modDid)
  const {data: memberList} = useChatMemberListQuery(communityUri, 20, 0)
  const reports = useModerationReportsQuery(communityUri, modDid)
  const sanctionMutation = useApplySanctionMutation()

  const refetchReports = reports.refetch
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetch(), refetchReports()])
    setRefreshing(false)
  }, [refetch, refetchReports])

  const reportedMembers =
    memberList?.members.filter(m =>
      m.badges.some(
        b =>
          b.visibleInChat &&
          (b.type === 'reported' ||
            b.type === 'contentious' ||
            b.type === 'high_risk'),
      ),
    ) ?? []

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>Moderación</Layout.Header.TitleText>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {communityName}
          </Text>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Risk summary cards */}
        <View style={[styles.summaryRow, a.p_md]}>
          <SummaryCard
            label="Miembros"
            value={dashboard?.totalMembers ?? 0}
            color={t.palette.contrast_500}
          />
          <SummaryCard
            label="Activos hoy"
            value={dashboard?.activeToday ?? 0}
            color="#34C759"
          />
          <SummaryCard
            label="Reportes 7d"
            value={dashboard?.reportedThisWeek ?? 0}
            color="#FF9500"
          />
          <SummaryCard
            label="Sancionados"
            value={dashboard?.sanctionedNow ?? 0}
            color="#FF3B30"
          />
        </View>

        {/* Risk distribution */}
        {dashboard && (
          <View style={[a.px_md, a.pb_md]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_sm]}>
              Distribución de riesgo
            </Text>
            <View style={[styles.distributionBar]}>
              {dashboard.riskDistribution.critical > 0 && (
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: dashboard.riskDistribution.critical,
                      backgroundColor: '#FF3B30',
                    },
                  ]}
                />
              )}
              {dashboard.riskDistribution.warning > 0 && (
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: dashboard.riskDistribution.warning,
                      backgroundColor: '#FF9500',
                    },
                  ]}
                />
              )}
              {dashboard.riskDistribution.low > 0 && (
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: dashboard.riskDistribution.low,
                      backgroundColor: '#34C759',
                    },
                  ]}
                />
              )}
            </View>
            <View style={[a.flex_row, a.gap_md, a.mt_sm]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                🟢 {dashboard.riskDistribution.low} bajo
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                🟡 {dashboard.riskDistribution.warning} medio
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                🔴 {dashboard.riskDistribution.critical} alto
              </Text>
            </View>
          </View>
        )}

        <ReportQueue
          communityUri={communityUri}
          communityName={communityName}
          reports={reports.data}
          isLoading={reports.isLoading}
          isError={reports.isError}
        />

        {/* Reported members quick list */}
        <View style={[a.px_md, a.pt_md]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_md]}>
            Miembros reportados
          </Text>
          {reportedMembers.length === 0 ? (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              No hay miembros reportados actualmente.
            </Text>
          ) : (
            <View style={[a.gap_sm]}>
              {reportedMembers.slice(0, 10).map(member => (
                <View
                  key={member.did}
                  style={[
                    styles.reportRow,
                    a.p_md,
                    a.rounded_md,
                    {backgroundColor: t.atoms.bg_contrast_50.backgroundColor},
                  ]}>
                  <View style={[a.flex_1]}>
                    <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                      {member.matrixUserId?.split(':')[0]?.replace('@', '') ??
                        member.did.slice(-8)}
                    </Text>
                    <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                      {member.badges
                        .filter(b => b.visibleInChat)
                        .map(b => `${b.icon} ${b.label}`)
                        .join(' · ')}
                    </Text>
                  </View>

                  {/* Quick sanction buttons */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[a.flex_row, a.gap_xs]}>
                      {SANCTION_PRESETS.map(preset => (
                        <TouchableOpacity
                          accessibilityRole="button"
                          key={preset.minutes}
                          onPress={() => {
                            sanctionMutation.mutate({
                              targetDid: member.did,
                              sanctionedByDid: modDid!,
                              communityUri,
                              type: 'mute',
                              durationMinutes: preset.minutes,
                            })
                          }}
                          style={[styles.sanctionBtn]}>
                          <Text style={[a.text_xs, t.atoms.text]}>
                            🔇 {preset.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Layout.Screen>
  )
}

/*
 * The report queue: one row per reported message (or member). It shows how
 * many people reported and why, never who, and no message text: the moderator
 * reads the message in the room from their own client (D2).
 */
function ReportQueue({
  communityUri,
  communityName,
  reports,
  isLoading,
  isError,
}: {
  communityUri: string
  communityName: string
  reports: ModerationReportGroup[] | undefined
  isLoading: boolean
  isError: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()
  const reasonLabels = useMessageReportReasonLabels()
  const timeAgo = useGetTimeAgo()
  const navigation = useNavigation<NavigationProp>()
  // getProfiles accepts at most 25 actors.
  const dids = [...new Set((reports ?? []).map(r => r.reportedDid))].slice(
    0,
    25,
  )
  const {data: profiles} = useProfilesQuery({handles: dids})
  const nameFor = (did: string) => {
    const profile = profiles?.profiles.find(p => p.did === did)
    return profile?.displayName || (profile ? `@${profile.handle}` : did)
  }
  const reasonLabel = (key: string) =>
    (reasonLabels as Record<string, string>)[key] ?? key

  return (
    <View style={[a.px_md, a.pt_md]}>
      <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mb_md]}>
        <Trans>Reportes recientes</Trans>
      </Text>
      {isLoading ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Cargando reportes…</Trans>
        </Text>
      ) : isError ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          <Trans>No se pudieron cargar los reportes.</Trans>
        </Text>
      ) : !reports?.length ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>No hay reportes en los últimos 30 días.</Trans>
        </Text>
      ) : (
        <View style={[a.gap_sm]}>
          {reports.map(report => (
            <View
              key={`${report.matrixEventId ?? 'member'}:${report.reportedDid}`}
              style={[
                a.p_md,
                a.rounded_md,
                a.gap_2xs,
                {backgroundColor: t.atoms.bg_contrast_50.backgroundColor},
              ]}>
              <View style={[a.flex_row, a.justify_between, a.gap_sm]}>
                <Text
                  style={[a.flex_1, a.text_sm, a.font_bold, t.atoms.text]}
                  numberOfLines={1}>
                  {nameFor(report.reportedDid)}
                </Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {report.matrixEventId ? (
                    <Trans>Mensaje</Trans>
                  ) : (
                    <Trans>Miembro</Trans>
                  )}
                </Text>
              </View>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {_(
                  msg`${plural(report.reportCount, {
                    one: '# reporte',
                    other: '# reportes',
                  })} de ${plural(report.reporterCount, {
                    one: '# persona',
                    other: '# personas',
                  })} · hace ${timeAgo(report.lastReportedAt, Date.now())}`,
                )}
              </Text>
              <Text style={[a.text_xs, t.atoms.text]}>
                {Object.entries(report.reasons)
                  .sort((x, y) => y[1] - x[1])
                  .map(([key, count]) =>
                    count > 1
                      ? `${reasonLabel(key)} ×${count}`
                      : reasonLabel(key),
                  )
                  .join(' · ')}
              </Text>
              {report.matrixEventId && report.matrixRoomId && (
                <Button
                  label={_(msg`Ver el mensaje reportado`)}
                  accessibilityHint={_(
                    msg`Abre el chat en ese mensaje, leído con tu propia cuenta`,
                  )}
                  size="tiny"
                  color="secondary"
                  style={[a.self_start, a.mt_xs]}
                  onPress={() =>
                    navigation.navigate('CommunityChat', {
                      communityUri,
                      communityName,
                      roomId: report.matrixRoomId ?? undefined,
                      focusEventId: report.matrixEventId ?? undefined,
                    })
                  }>
                  <ButtonText>
                    <Trans>Ver mensaje</Trans>
                  </ButtonText>
                </Button>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.summaryCard,
        {borderLeftColor: color, borderLeftWidth: 3},
      ]}>
      <Text style={[a.text_lg, a.font_bold, {color}]}>{value}</Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: 70,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.06)',
  },
  distributionBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  distributionSegment: {
    height: '100%',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sanctionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
})
